# accounts/views.py
from django.contrib.auth import get_user_model
from django.utils import timezone
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


# ✅ 2. Login (แก้ Error 401 + Update last_login)
class EmailOrUsernameTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    
    def post(self, request, *args, **kwargs):
        # เรียก parent class เพื่อ Login
        response = super().post(request, *args, **kwargs)
        
        # ✅ Update last_login เมื่อ Login สำเร็จ
        if response.status_code == 200:
            login_id = request.data.get('username', '').strip()
            
            try:
                # หา User
                if "@" in login_id:
                    user = User.objects.get(email__iexact=login_id)
                else:
                    user = User.objects.get(username__iexact=login_id)
                
                # Update last_login
                user.last_login = timezone.now()
                user.save(update_fields=['last_login'])
            except User.DoesNotExist:
                pass
        
        return response


# ✅ 3. Refresh Token
class CustomTokenRefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
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


class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get_serializer_context(self):
        return {'request': self.request}
    
    def list(self, request, *args, **kwargs):
        from datetime import timedelta
        
        users = self.get_queryset()
        serializer = self.get_serializer(users, many=True)
        
        # คำนวณสถิติ
        total_users = users.count()
        admin_count = users.filter(is_superuser=True).count()
        staff_count = users.filter(is_superuser=False).count()
        
        # ✅ แก้ไข: นับเฉพาะคนที่ Login ภายใน 30 นาทีที่ผ่านมา
        now = timezone.now()
        active_threshold = now - timedelta(minutes=30)
        active_count = users.filter(
            last_login__isnull=False,
            last_login__gte=active_threshold
        ).count()
        
        inactive_count = users.filter(is_active=False).count()
        
        return Response({
            'users': serializer.data,
            'stats': {
                'total': total_users,
                'admin': admin_count,
                'staff': staff_count,
                'active': active_count,  # ✅ คนที่ Login อยู่จริง
                'inactive': inactive_count,
            }
        })


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