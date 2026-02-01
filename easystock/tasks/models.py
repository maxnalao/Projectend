# tasks/models.py
from django.db import models
from django.conf import settings


class Task(models.Model):
    """Model สำหรับจัดการงาน/Tasks"""
    
    # ✅ Task Type Choices - ตรงกับ Frontend
    TASK_TYPE_CHOICES = [
        ('stock_check', 'ตรวจนับสต็อก'),
        ('stock_order', 'สั่งซื้อสินค้า'),
        ('delivery', 'รับ/ส่งสินค้า'),
        ('meeting', 'ประชุม/นัดหมาย'),
        ('other', 'อื่นๆ'),
    ]
    
    # ✅ Priority Choices
    PRIORITY_CHOICES = [
        ('low', 'ต่ำ'),
        ('medium', 'ปกติ'),
        ('high', 'สูง'),
        ('urgent', 'ด่วน'),
    ]
    
    # ✅ Status Choices
    STATUS_CHOICES = [
        ('pending', 'รอดำเนินการ'),
        ('in_progress', 'กำลังทำ'),
        ('completed', 'เสร็จแล้ว'),
        ('cancelled', 'ยกเลิก'),
    ]
    
    # Fields
    title = models.CharField(max_length=255, verbose_name='ชื่องาน')
    description = models.TextField(blank=True, null=True, verbose_name='รายละเอียด')
    task_type = models.CharField(
        max_length=50, 
        choices=TASK_TYPE_CHOICES, 
        default='other',
        verbose_name='ประเภทงาน'
    )
    priority = models.CharField(
        max_length=20, 
        choices=PRIORITY_CHOICES, 
        default='medium',
        verbose_name='ความสำคัญ'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name='สถานะ'
    )
    
    # User relations
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
        verbose_name='มอบหมายให้'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_tasks',
        verbose_name='สร้างโดย'
    )
    
    # Dates
    due_date = models.DateTimeField(verbose_name='กำหนดเสร็จ')
    completed_at = models.DateTimeField(blank=True, null=True, verbose_name='เสร็จเมื่อ')
    
    # Optional fields
    target_quantity = models.IntegerField(blank=True, null=True, verbose_name='จำนวนเป้าหมาย')
    actual_quantity = models.IntegerField(blank=True, null=True, verbose_name='จำนวนจริง')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'งาน'
        verbose_name_plural = 'งานทั้งหมด'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
    
    def mark_completed(self):
        """Mark task as completed"""
        from django.utils import timezone
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    def mark_in_progress(self):
        """Mark task as in progress"""
        self.status = 'in_progress'
        self.save()