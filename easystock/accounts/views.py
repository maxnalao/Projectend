
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# ================================================================
# Helper Function - แปลง User → JSON
# ================================================================

def user_to_dict(user, request=None):
    """แปลง User object เป็น dictionary (JSON)"""
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'phone': getattr(user, 'phone', ''),
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'is_active': user.is_active,
        'is_online': getattr(user, 'is_online', False),
        'last_activity': getattr(user, 'last_activity', None),
        'date_joined': user.date_joined,
        'last_login': user.last_login,
    }
    
    if hasattr(user, 'profile_image') and user.profile_image:
        try:
            if request:
                data['profile_image'] = request.build_absolute_uri(user.profile_image.url)
            else:
                data['profile_image'] = user.profile_image.url
        except:
            data['profile_image'] = None
    else:
        data['profile_image'] = None
    
    return data


# ================================================================
# 1. สมัครสมาชิก
# ================================================================

class RegisterView(APIView):
    """สมัครสมาชิกใหม่"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip().lower()
        password = request.data.get('password', '')
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        phone = request.data.get('phone', '').strip()
        
        if not username or not email or not password:
            return Response(
                {'error': 'กรุณากรอก username, email และ password'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 6:
            return Response(
                {'error': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'ชื่อผู้ใช้นี้มีคนใช้แล้ว'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'อีเมลนี้มีคนใช้แล้ว'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            
            if phone and hasattr(user, 'phone'):
                user.phone = phone
                user.save()
            
            # 7. ส่งข้อมูลกลับ
            return Response(
                {
                    'message': 'สมัครสมาชิกสำเร็จ!',
                    'user': user_to_dict(user, request)
                }, 
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            return Response(
                {'error': f'เกิดข้อผิดพลาด: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ================================================================
# 2. เข้าสู่ระบบ (Login)
# ================================================================

class LoginView(APIView):
    """Login ด้วย username/email และรหัสผ่าน"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        login_id = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        
        if not login_id or not password:
            return Response(
                {'error': 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = None
        
        if '@' in login_id:
            try:
                user = User.objects.get(email__iexact=login_id)
            except User.DoesNotExist:
                pass
        else:
            try:
                user = User.objects.get(username__iexact=login_id)
            except User.DoesNotExist:
                pass
        
        if not user:
            return Response(
                {'error': 'ไม่พบผู้ใช้นี้ในระบบ'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.check_password(password):
            return Response(
                {'error': 'รหัสผ่านไม่ถูกต้อง'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)
        
        user.is_online = True
        user.last_login = timezone.now()
        user.last_activity = timezone.now()
        user.save()
        
        # 8. ส่ง token กลับ
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': user_to_dict(user, request)
        }, status=status.HTTP_200_OK)


# ================================================================
# 3. Refresh Token
# ================================================================

class RefreshTokenView(APIView):
    """Refresh access token ด้วย refresh token"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh', '')
        
        if not refresh_token:
            return Response(
                {'error': 'กรุณาส่ง refresh token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            
            return Response({
                'access': access_token
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'Refresh token ไม่ถูกต้องหรือหมดอายุ'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )


# ================================================================
# 4. ออกจากระบบ (Logout)
# ================================================================

class LogoutView(APIView):
    """ออกจากระบบ"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_online = False
        user.save(update_fields=['is_online'])
        
        return Response(
            {'message': 'ออกจากระบบสำเร็จ'}, 
            status=status.HTTP_200_OK
        )


# ================================================================
# 5. โปรไฟล์ (ดูและแก้ไขข้อมูลตัวเอง)
# ================================================================

class ProfileView(APIView):
    """ดูและแก้ไขโปรไฟล์ของตัวเอง"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        user.last_activity = timezone.now()
        user.is_online = True
        user.save(update_fields=['last_activity', 'is_online'])
        
        return Response(user_to_dict(user, request))

    def patch(self, request):
        """แก้ไขโปรไฟล์"""
        user = request.user
        
        user.first_name = request.data.get('first_name', user.first_name).strip()
        user.last_name = request.data.get('last_name', user.last_name).strip()
        
        phone = request.data.get('phone')
        if phone is not None and hasattr(user, 'phone'):
            user.phone = phone.strip()
            
        email = request.data.get('email')
        if email:
             user.email = email.strip().lower()
        
        user.save()
        
        return Response({
            'message': 'อัปเดตข้อมูลสำเร็จ',
            'user': user_to_dict(user, request)
        })


# ================================================================
# 6. Heartbeat
# ================================================================

class HeartbeatView(APIView):
    """อัปเดตสถานะ online"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        user.last_activity = timezone.now()
        user.is_online = True
        user.save(update_fields=['last_activity', 'is_online'])
        
        return Response({'status': 'ok', 'timestamp': timezone.now()})


# ================================================================
# 7. เปลี่ยนรหัสผ่าน
# ================================================================

class ChangePasswordView(APIView):
    """เปลี่ยนรหัสผ่านขณะที่ login อยู่"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')
        
        if not current_password or not new_password or not confirm_password:
            return Response(
                {'error': 'กรุณากรอกข้อมูลให้ครบถ้วน'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_password) < 6:
            return Response(
                {'error': 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_password != confirm_password:
            return Response(
                {'error': 'รหัสผ่านใหม่ไม่ตรงกัน'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if current_password == new_password:
            return Response(
                {'error': 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not user.check_password(current_password):
            return Response(
                {'error': 'รหัสผ่านปัจจุบันไม่ถูกต้อง'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        return Response(
            {'message': 'เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบใหม่'}, 
            status=status.HTTP_200_OK
        )


# ================================================================
# 8. จัดการผู้ใช้ (Admin เท่านั้น)
# ================================================================

class UserManagementView(APIView):
    """ดูรายการผู้ใช้ทั้งหมด (เฉพาะ Admin)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # 1. เช็คว่าเป็น Admin ไหม
        if not request.user.is_superuser:
            return Response(
                {'error': 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        now = timezone.now()
        offline_time = now - timedelta(minutes=2)
        
        User.objects.filter(
            is_online=True,
            last_activity__lt=offline_time
        ).update(is_online=False)
        
        users = User.objects.all().order_by('-date_joined')
        
        user_list = [user_to_dict(user, request) for user in users]
        
        total = users.count()
        admin_count = users.filter(is_superuser=True).count()
        staff_count = users.filter(is_superuser=False).count()
        online_count = users.filter(is_online=True).count()
        
        return Response({
            'users': user_list,
            'stats': {
                'total': total,
                'admin': admin_count,
                'staff': staff_count,
                'online': online_count,
            }
        })


# ================================================================
# 9. แก้ไข/ลบผู้ใช้ (Admin เท่านั้น)
# ================================================================

class UserEditView(APIView):
    """แก้ไขหรือลบผู้ใช้ (เฉพาะ Admin)"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, user_id):
        # เช็คว่าเป็น Admin
        if not request.user.is_superuser:
            return Response(
                {'error': 'คุณไม่มีสิทธิ์ทำการนี้'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'ไม่พบผู้ใช้นี้'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')
        is_active = request.data.get('is_active')
        
        if first_name is not None:
            user.first_name = first_name.strip()
        
        if last_name is not None:
            user.last_name = last_name.strip()
        
        if email is not None:
            if User.objects.filter(email=email).exclude(id=user.id).exists():
                return Response(
                    {'error': 'อีเมลนี้มีคนใช้แล้ว'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.email = email.strip().lower()
        
        if is_active is not None:
            user.is_active = is_active
        
        user.save()
        
        return Response({
            'message': 'อัปเดตข้อมูลสำเร็จ',
            'user': user_to_dict(user, request)
        })

    def delete(self, request, user_id):
        if not request.user.is_superuser:
            return Response(
                {'error': 'คุณไม่มีสิทธิ์ทำการนี้'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'ไม่พบผู้ใช้นี้'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if user.id == request.user.id:
            return Response(
                {'error': 'ไม่สามารถลบบัญชีตัวเองได้'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        username = user.username
        user.delete()
        
        return Response(
            {'message': f'ลบผู้ใช้ {username} สำเร็จ'}, 
            status=status.HTTP_200_OK
        )