from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshTokenView.as_view(), name='token_refresh'),
    
    # User Profile (โปรไฟล์)
    path('user/', views.ProfileView.as_view(), name='current_user'),  # ✅ เปลี่ยนจาก CurrentUserView
    path('heartbeat/', views.HeartbeatView.as_view(), name='heartbeat'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    
    # User Management (จัดการผู้ใช้ - Admin เท่านั้น)
    path('users/', views.UserManagementView.as_view(), name='user_list'),  # ✅ เปลี่ยนจาก UserListView
    path('users/<int:user_id>/', views.UserEditView.as_view(), name='user_detail'),  
]