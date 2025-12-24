# inventory/urls.py (COMPLETE WITH DASHBOARD ROUTES)
# Copy this ENTIRE file and replace your inventory/urls.py completely

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

# ✅ Existing Routers
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'listings', views.ListingViewSet, basename='listing')

# ✅ Phase 3A: Festival & Best-Sellers Routers
router.register(r'festivals', views.FestivalViewSet, basename='festival')
router.register(r'best-sellers', views.BestSellerViewSet, basename='best-seller')

# ✅ NEW - Dashboard Routers
router.register(r'employee-dashboard', views.EmployeeDashboardViewSet, basename='employee-dashboard')
router.register(r'admin-dashboard', views.AdminDashboardViewSet, basename='admin-dashboard')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Issue & Dashboard
    path('issue-products/', views.issue_products, name='issue-products'),
    path('products/<int:pk>/unlist/', views.product_unlist, name='product-unlist'),
    path('dashboard-stats/', views.dashboard_stats, name='dashboard-stats'),
    path('movement-history/', views.movement_history, name='movement-history'),
    
    # ✅ LINE Messaging API
    path('line/webhook/', views.line_webhook, name='line-webhook'),
    path('line/connect-code/', views.get_connection_code, name='line-connect-code'),
    path('line/get-user-id/', views.get_line_user_id, name='line-get-user-id'),
    path('line/delete-user-id/', views.delete_line_user_id, name='line-delete-user-id'),
    path('line/test/', views.send_test_message, name='line-test-message'),
    path('line/profile/', views.get_line_profile, name='line-profile'),
    path('line/send-alerts/', views.send_low_stock_alerts, name='line-send-alerts'),
]