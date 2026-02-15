# inventory/urls.py (CLEANED VERSION - ลบโค้ดที่ไม่ใช้แล้ว)

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

# ================ CORE VIEWSETS ================
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'listings', views.ListingViewSet, basename='listing')

# ================ FESTIVAL & ANALYSIS ================
router.register(r'festivals', views.FestivalViewSet, basename='festival')
router.register(
    r'best-sellers', 
    views.BestSellerViewSet, 
    basename='best-seller'
)

# ================ TASKS & USERS ================
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'users', views.UserViewSet, basename='user')

# ================ DASHBOARDS ================
router.register(
    r'employee-dashboard', 
    views.EmployeeDashboardViewSet, 
    basename='employee-dashboard'
)
router.register(
    r'admin-dashboard', 
    views.AdminDashboardViewSet, 
    basename='admin-dashboard'
)

# ================ CUSTOM EVENTS ================
router.register(
    r'custom-events', 
    views.CustomEventViewSet, 
    basename='custom-event'
)

urlpatterns = [
    # ================ ROUTER URLs ================
    path('', include(router.urls)),
    
    # ================ ISSUE & DASHBOARD ================
    path(
        'issue-products/', 
        views.issue_products, 
        name='issue-products'
    ),
    path(
        'products/<int:pk>/unlist/', 
        views.product_unlist, 
        name='product-unlist'
    ),
    path(
        'dashboard-stats/', 
        views.dashboard_stats, 
        name='dashboard-stats'
    ),
    path(
        'movement-history/', 
        views.movement_history, 
        name='movement-history'
    ),
    
    # ================ LINE MESSAGING API ================
    path(
        'line/webhook/', 
        views.line_webhook, 
        name='line-webhook'
    ),
    path(
        'line/connect-code/', 
        views.get_connection_code, 
        name='line-connect-code'
    ),
    path(
        'line/get-user-id/', 
        views.get_line_user_id, 
        name='line-get-user-id'
    ),
    path(
        'line/delete-user-id/', 
        views.delete_line_user_id, 
        name='line-delete-user-id'
    ),
    path(
        'line/test/', 
        views.send_test_message, 
        name='line-test-message'
    ),
    path(
        'line/profile/', 
        views.get_line_profile, 
        name='line-profile'
    ),
    path(
        'line/send-alerts/', 
        views.send_low_stock_alerts, 
        name='line-send-alerts'
    ),
    path(
        'line/connected-users/', 
        views.get_connected_users, 
        name='line-connected-users'
    ),
    path(
        'line/send-to-users/', 
        views.send_to_selected_users, 
        name='line-send-to-users'
    ),
    path(
        'line/broadcast/', 
        views.broadcast_message, 
        name='line-broadcast'
    ),
]