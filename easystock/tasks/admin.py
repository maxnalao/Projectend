# tasks/admin.py
from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'title', 
        'task_type', 
        'priority', 
        'status', 
        'assigned_to', 
        'due_date', 
        'created_at'
    ]
    list_filter = ['task_type', 'priority', 'status', 'created_at']
    search_fields = ['title', 'description', 'assigned_to__username']
    ordering = ['-created_at']
    
    fieldsets = (
        ('ข้อมูลงาน', {
            'fields': ('title', 'description', 'task_type')
        }),
        ('ความสำคัญและสถานะ', {
            'fields': ('priority', 'status')
        }),
        ('ผู้รับผิดชอบ', {
            'fields': ('assigned_to', 'created_by')
        }),
        ('กำหนดเวลา', {
            'fields': ('due_date', 'completed_at')
        }),
        ('ปริมาณ', {
            'fields': ('target_quantity', 'actual_quantity'),
            'classes': ('collapse',)
        }),
    )