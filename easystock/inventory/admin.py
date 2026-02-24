from django.contrib import admin
from .models import (
    Product, Category, Festival, BestSeller, 
     Task
)

# ================ Product Admin ================
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'category','selling_price', 'stock', 'created_at']
    list_filter = ['category', 'on_sale', 'is_deleted', 'created_at']
    search_fields = ['code', 'name']
    readonly_fields = ['created_at']
    fieldsets = (
        ('ข้อมูลพื้นฐาน', {
            'fields': ('code', 'name', 'category', 'unit')
        }),
        ('ราคา', {
            'fields': ('selling_price', 'price')
        }),
        ('สต็อก', {
            'fields': ('stock', 'initial_stock')
        }),
        ('อื่นๆ', {
            'fields': ('image', 'on_sale', 'is_deleted', 'created_by', 'created_at')
        }),
    )


# ================ Category Admin ================
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']


# ================ Festival Admin ================
@admin.register(Festival)
class FestivalAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'category', 'is_recurring']
    list_filter = ['category', 'is_recurring', 'start_date']
    search_fields = ['name', 'description']
    fieldsets = (
        ('ข้อมูลพื้นฐาน', {
            'fields': ('name', 'description')
        }),
        ('วันที่', {
            'fields': ('start_date', 'end_date', 'is_recurring')
        }),
        ('การแสดงผล', {
            'fields': ('category', 'icon', 'color')
        }),
    )


# ================ BestSeller Admin ================
@admin.register(BestSeller)
class BestSellerAdmin(admin.ModelAdmin):
    list_display = ['product', 'festival', 'rank', 'total_issued', 'percentage_increase']
    list_filter = ['festival', 'rank', 'recorded_date']
    search_fields = ['product__name', 'festival__name']
    readonly_fields = ['percentage_increase', 'recorded_date', 'created_at', 'updated_at']
    fieldsets = (
        ('ข้อมูล', {
            'fields': ('product', 'festival', 'rank')
        }),
        ('สถิติ', {
            'fields': ('total_issued', 'last_year_count', 'this_year_count', 'percentage_increase')
        }),
        ('เพิ่มเติม', {
            'fields': ('notes', 'recorded_date', 'created_at', 'updated_at')
        }),
    )



# ================ Task Admin (NEW) ================
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'assigned_to', 'status', 'priority', 'due_date']
    list_filter = ['status', 'priority', 'task_type', 'due_date']
    search_fields = ['title', 'description']
    filter_horizontal = ['products']
    readonly_fields = ['created_at', 'updated_at', 'completed_at']
    fieldsets = (
        ('ข้อมูลพื้นฐาน', {
            'fields': ('title', 'description', 'task_type')
        }),
        ('การมอบหมาย', {
            'fields': ('assigned_to', 'created_by')
        }),
        ('สถานะและลำดับความสำคัญ', {
            'fields': ('status', 'priority')
        }),
        ('ข้อมูลเพิ่มเติม', {
            'fields': ('festival', 'products', 'target_quantity', 'image', 'checklist')
        }),
        ('เวลา', {
            'fields': ('due_date', 'notes', 'created_at', 'updated_at', 'completed_at')
        }),
    )