from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "category", "stock", "price")  # ❌ เอา sku, min_stock ออก
    search_fields = ("code", "name")  # ❌ เอา category ออก (FK หาไม่ได้ตรง ๆ)
