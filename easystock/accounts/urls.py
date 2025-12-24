from django.urls import path
from .views import (
    RegisterView, 
    EmailOrUsernameTokenObtainPairView, 
    CustomTokenRefreshView, # ✅ ใช้ตัว Custom ที่เราสร้าง
    CurrentUserView,
    UserListView, 
    UserDetailView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", EmailOrUsernameTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"), # ✅ แก้บรรทัดนี้
    path("user/", CurrentUserView.as_view(), name="current_user"),
    path("users/", UserListView.as_view(), name="user_list"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user_detail"),
]