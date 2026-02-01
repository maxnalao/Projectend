# accounts/views.py
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings as django_settings
from datetime import timedelta
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import (
    RegisterSerializer,
    EmailOrUsernameTokenObtainPairSerializer,
    UserSerializer,
)
from .models import PasswordResetToken

User = get_user_model()


# Custom Permission
class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and (getattr(request.user, 'role', None) == 'admin' or request.user.is_superuser)
        )


# ✅ 1. Register
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


# ✅ 2. Login
class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            login_id = request.data.get('username', '').strip()
            
            try:
                if "@" in login_id:
                    user = User.objects.get(email__iexact=login_id)
                else:
                    user = User.objects.get(username__iexact=login_id)
                
                user.is_online = True
                user.last_login = timezone.now()
                user.last_activity = timezone.now()
                user.save(update_fields=['is_online', 'last_login', 'last_activity'])
                
            except User.DoesNotExist:
                pass
        
        return response


# ✅ 3. Logout
class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            user = request.user
            user.is_online = False
            user.save(update_fields=['is_online'])
            
            return Response({"detail": "ออกจากระบบสำเร็จ"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ✅ 4. Refresh Token
class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


# ✅ 5. Current User
class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        user = request.user
        user.last_activity = timezone.now()
        user.is_online = True
        user.save(update_fields=['last_activity', 'is_online'])
        
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ✅ 6. Heartbeat
class HeartbeatView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        user.last_activity = timezone.now()
        user.is_online = True
        user.save(update_fields=['last_activity', 'is_online'])
        
        return Response({"status": "ok", "timestamp": timezone.now()})


# ✅ 7. User List
class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_serializer_context(self):
        return {'request': self.request}
    
    def list(self, request, *args, **kwargs):
        users = self.get_queryset()
        
        now = timezone.now()
        offline_threshold = now - timedelta(minutes=2)
        
        User.objects.filter(
            is_online=True,
            last_activity__lt=offline_threshold
        ).update(is_online=False)
        
        users = self.get_queryset()
        serializer = self.get_serializer(users, many=True)
        
        total_users = users.count()
        admin_count = users.filter(is_superuser=True).count()
        staff_count = users.filter(is_superuser=False).count()
        active_count = users.filter(is_online=True).count()
        inactive_count = users.filter(is_active=False).count()
        
        return Response({
            'users': serializer.data,
            'stats': {
                'total': total_users,
                'admin': admin_count,
                'staff': staff_count,
                'active': active_count,
                'inactive': inactive_count,
            }
        })


# ✅ 8. User Detail
class UserDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    def patch(self, request, user_id):
        user = self.get_user(user_id)
        if not user:
            return Response({"detail": "ไม่พบผู้ใช้"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserSerializer(
            user, 
            data=request.data, 
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                "detail": "อัปเดตข้อมูลผู้ใช้สำเร็จ",
                "user": serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, user_id):
        user = self.get_user(user_id)
        if not user:
            return Response({"detail": "ไม่พบผู้ใช้"}, status=status.HTTP_404_NOT_FOUND)

        if user.id == request.user.id:
            return Response(
                {"detail": "ไม่สามารถลบบัญชีของตัวเองได้"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        user.delete()
        return Response(
            {"detail": "ลบผู้ใช้สำเร็จ"}, 
            status=status.HTTP_204_NO_CONTENT
        )


# ================================================================
# ✅ NEW: Password Reset via Email
# ================================================================

class RequestPasswordResetView(APIView):
    """
    ขั้นตอน 1: ผู้ใช้กรอก email -> ส่ง link reset ไปที่ email
    POST /api/auth/password-reset/request/
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip().lower()

        if not email:
            return Response(
                {"detail": "กรุณากรอกอีเมล"},
                status=status.HTTP_400_BAD_REQUEST
            )

        success_message = {
            "detail": "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์สำหรับเปลี่ยนรหัสผ่านไปแล้ว กรุณาตรวจสอบอีเมลของคุณ"
        }

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(success_message, status=status.HTTP_200_OK)

        # ยกเลิก token เก่า
        PasswordResetToken.objects.filter(
            user=user, is_used=False
        ).update(is_used=True)

        # สร้าง token ใหม่ (หมดอายุ 30 นาที)
        reset_token = PasswordResetToken.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(minutes=30)
        )

        # สร้าง Reset URL
        frontend_url = getattr(django_settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f"{frontend_url}/reset-password/{reset_token.token}"

        # ส่ง Email
        try:
            subject = "EasyStock - เปลี่ยนรหัสผ่าน"
            
            html_message = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 0;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 4px 6px rgba(0,0,0,0.07);overflow:hidden;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:32px 40px;text-align:center;">
<h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">EasyStock</h1>
<p style="color:#bfdbfe;margin:8px 0 0 0;font-size:14px;">ระบบจัดการสต็อกสินค้า</p>
</td></tr>

<!-- Content -->
<tr><td style="padding:32px 40px 0 40px;text-align:center;">
<div style="width:64px;height:64px;background-color:#eff6ff;border-radius:50%;display:inline-block;line-height:64px;margin-bottom:16px;">
<span style="font-size:32px;">&#128274;</span>
</div>
<h2 style="color:#1e293b;margin:0 0 8px 0;font-size:22px;font-weight:600;">เปลี่ยนรหัสผ่าน</h2>
<p style="color:#64748b;margin:0;font-size:14px;line-height:1.6;">
เราได้รับคำขอเปลี่ยนรหัสผ่านสำหรับบัญชี<br>
<strong style="color:#1e293b;">{user.username}</strong>
</p>
</td></tr>

<!-- Button -->
<tr><td style="padding:28px 40px;text-align:center;">
<a href="{reset_url}" style="display:inline-block;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(37,99,235,0.35);">
ตั้งรหัสผ่านใหม่
</a>
</td></tr>

<!-- Warning -->
<tr><td style="padding:0 40px 28px 40px;">
<table width="100%" style="background-color:#fef9c3;border-radius:10px;border-left:4px solid #eab308;">
<tr><td style="padding:14px 16px;">
<p style="color:#854d0e;margin:0;font-size:13px;line-height:1.5;">
<strong>&#9888;&#65039; สำคัญ:</strong> ลิงก์นี้จะหมดอายุใน <strong>30 นาที</strong><br>
หากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้
</p>
</td></tr>
</table>
</td></tr>

<!-- Fallback Link -->
<tr><td style="padding:0 40px 28px 40px;">
<p style="color:#94a3b8;margin:0;font-size:12px;line-height:1.5;">
หากปุ่มด้านบนไม่ทำงาน ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
<a href="{reset_url}" style="color:#2563eb;word-break:break-all;font-size:11px;">{reset_url}</a>
</p>
</td></tr>

<!-- Footer -->
<tr><td style="background-color:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
<p style="color:#94a3b8;margin:0;font-size:12px;">&copy; 2026 EasyStock</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

            plain_message = (
                f"EasyStock - เปลี่ยนรหัสผ่าน\n\n"
                f"สวัสดีคุณ {user.username}\n\n"
                f"เราได้รับคำขอเปลี่ยนรหัสผ่านสำหรับบัญชีของคุณ\n\n"
                f"คลิกลิงก์นี้เพื่อตั้งรหัสผ่านใหม่:\n{reset_url}\n\n"
                f"ลิงก์นี้จะหมดอายุใน 30 นาที\n\n"
                f"หากคุณไม่ได้ขอเปลี่ยนรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้\n\n"
                f"- ทีม EasyStock"
            )

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )

        except Exception as e:
            print(f"Error sending reset email: {e}")
            return Response(
                {"detail": "เกิดข้อผิดพลาดในการส่งอีเมล กรุณาลองใหม่อีกครั้ง"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(success_message, status=status.HTTP_200_OK)


class VerifyResetTokenView(APIView):
    """
    ขั้นตอน 2: ตรวจสอบว่า token ยังใช้ได้ไหม
    GET /api/auth/password-reset/verify/<token>/
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, token):
        try:
            reset_token = PasswordResetToken.objects.get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"valid": False, "detail": "ลิงก์ไม่ถูกต้อง"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if reset_token.is_used:
            return Response(
                {"valid": False, "detail": "ลิงก์นี้ถูกใช้งานแล้ว"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if reset_token.is_expired:
            return Response(
                {"valid": False, "detail": "ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "valid": True,
            "detail": "ลิงก์ใช้งานได้",
            "username": reset_token.user.username,
            "email": reset_token.user.email,
        })


class ResetPasswordConfirmView(APIView):
    """
    ขั้นตอน 3: ตั้งรหัสผ่านใหม่
    POST /api/auth/password-reset/confirm/
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        token_str = request.data.get('token', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not token_str or not new_password:
            return Response(
                {"detail": "กรุณากรอกข้อมูลให้ครบถ้วน"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {"detail": "รหัสผ่านไม่ตรงกัน"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {"detail": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            reset_token = PasswordResetToken.objects.get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"detail": "ลิงก์ไม่ถูกต้อง"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not reset_token.is_valid:
            return Response(
                {"detail": "ลิงก์หมดอายุหรือถูกใช้งานแล้ว กรุณาขอลิงก์ใหม่"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # เปลี่ยนรหัสผ่าน
        user = reset_token.user
        user.set_password(new_password)
        user.save()

        # ทำเครื่องหมายว่า token ถูกใช้แล้ว
        reset_token.is_used = True
        reset_token.save(update_fields=['is_used'])

        return Response(
            {"detail": "เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่"},
            status=status.HTTP_200_OK
        )
    
class ChangePasswordView(APIView):
    """
    เปลี่ยนรหัสผ่านตอน login อยู่ (จากหน้า Profile)
    POST /api/auth/change-password/
    ต้อง Login ก่อนถึงจะใช้ได้
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        # Validation
        if not current_password or not new_password or not confirm_password:
            return Response(
                {"detail": "กรุณากรอกข้อมูลให้ครบถ้วน"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 6:
            return Response(
                {"detail": "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {"detail": "รหัสผ่านใหม่ไม่ตรงกัน"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if current_password == new_password:
            return Response(
                {"detail": "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        # ตรวจสอบรหัสผ่านปัจจุบัน
        if not user.check_password(current_password):
            return Response(
                {"detail": "รหัสผ่านปัจจุบันไม่ถูกต้อง"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # เปลี่ยนรหัสผ่าน
        user.set_password(new_password)
        user.save()

        return Response(
            {"detail": "เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบใหม่"},
            status=status.HTTP_200_OK
        )