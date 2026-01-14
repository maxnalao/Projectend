# accounts/views.py
from django.contrib.auth import get_user_model
from django.utils import timezone
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


# ✅ 2. Login - อัพเดท is_online = True
class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # ✅ Update is_online และ last_activity เมื่อ Login สำเร็จ
        if response.status_code == 200:
            login_id = request.data.get('username', '').strip()
            
            try:
                if "@" in login_id:
                    user = User.objects.get(email__iexact=login_id)
                else:
                    user = User.objects.get(username__iexact=login_id)
                
                # ✅ Set Online
                user.is_online = True
                user.last_login = timezone.now()
                user.last_activity = timezone.now()
                user.save(update_fields=['is_online', 'last_login', 'last_activity'])
                
            except User.DoesNotExist:
                pass
        
        return response


# ✅ 3. Logout - อัพเดท is_online = False
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


# ✅ 5. Current User - อัพเดท last_activity
class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        # ✅ Update last_activity (heartbeat)
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


# ✅ 6. Heartbeat - Frontend เรียกทุก 30 วินาที
class HeartbeatView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        user.last_activity = timezone.now()
        user.is_online = True
        user.save(update_fields=['last_activity', 'is_online'])
        
        return Response({"status": "ok", "timestamp": timezone.now()})


# ✅ 7. User List - แสดงสถานะ Online/Offline ตามจริง
class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_serializer_context(self):
        return {'request': self.request}
    
    def list(self, request, *args, **kwargs):
        users = self.get_queryset()
        
        # ✅ Auto offline: ถ้าไม่มี activity เกิน 2 นาที
        now = timezone.now()
        offline_threshold = now - timedelta(minutes=2)
        
        User.objects.filter(
            is_online=True,
            last_activity__lt=offline_threshold
        ).update(is_online=False)
        
        # Refresh queryset
        users = self.get_queryset()
        serializer = self.get_serializer(users, many=True)
        
        # คำนวณสถิติ
        total_users = users.count()
        admin_count = users.filter(is_superuser=True).count()
        staff_count = users.filter(is_superuser=False).count()
        
        # ✅ นับคนที่ Online จริงๆ
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