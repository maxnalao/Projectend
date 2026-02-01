# accounts/urls.py
from django.urls import path
from .views import (
    RegisterView, 
    EmailOrUsernameTokenObtainPairView, 
    CustomTokenRefreshView,
    CurrentUserView,
    UserListView, 
    UserDetailView,
    LogoutView,
    HeartbeatView,
    # ✅ Password Management
    ChangePasswordView,           # เปลี่ยนรหัสผ่านตอน login อยู่
    RequestPasswordResetView,     # ขอ reset ทาง email
    VerifyResetTokenView,         # ตรวจสอบ token
    ResetPasswordConfirmView,     # ตั้งรหัสผ่านใหม่
)

urlpatterns = [
    # Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", EmailOrUsernameTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    
    # User
    path("user/", CurrentUserView.as_view(), name="current_user"),
    path("users/", UserListView.as_view(), name="user_list"),
    path("profile/", CurrentUserView.as_view(), name="current_user_profile"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user_detail"),
    path("heartbeat/", HeartbeatView.as_view(), name="heartbeat"),
    
    # ✅ Change Password (ตอน login อยู่ - จากหน้า Profile)
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    
    # ✅ Password Reset via Email (ตอนลืมรหัสผ่าน)
    path("password-reset/request/", RequestPasswordResetView.as_view(), name="password_reset_request"),
    path("password-reset/verify/<uuid:token>/", VerifyResetTokenView.as_view(), name="password_reset_verify"),
    path("password-reset/confirm/", ResetPasswordConfirmView.as_view(), name="password_reset_confirm"),
]