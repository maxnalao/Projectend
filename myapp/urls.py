# myapp/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from .views import home

urlpatterns = [
    path("", home),  # <-- เพิ่มบรรทัดนี้ ให้ root ตอบกลับได้
    path("admin/", admin.site.urls),
    path("", RedirectView.as_view(url="/api/", permanent=False)),
    path("api/", include("inventory.urls")),
    path("api/auth/", include("accounts.urls")),
]

# เสิร์ฟไฟล์สื่อระหว่าง DEV
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
