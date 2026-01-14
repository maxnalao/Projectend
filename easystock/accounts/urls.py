# backend/accounts/urls.py

from django.urls import path
from .views import (
    RegisterView, 
    EmailOrUsernameTokenObtainPairView, 
    CustomTokenRefreshView,
    CurrentUserView,
    UserListView, 
    UserDetailView,
    LogoutView,      # ✅ เพิ่ม
    HeartbeatView,   # ✅ เพิ่ม
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", EmailOrUsernameTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("logout/", LogoutView.as_view(), name="logout"),  # ✅ เพิ่ม Logout
    path("refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("user/", CurrentUserView.as_view(), name="current_user"),
    path("users/", UserListView.as_view(), name="user_list"),
    path("profile/", CurrentUserView.as_view(), name="current_user_profile"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user_detail"),
    path("heartbeat/", HeartbeatView.as_view(), name="heartbeat"),  # ✅ เพิ่ม Heartbeat
]