# backend/inventory/models.py (CLEANED VERSION - ลบ BestSeller ออกแล้ว)
from django.db import models
from django.conf import settings
from django.db.models import Q
from django.utils import timezone


# ================ CLASS 1: Category ================
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    
    def __str__(self): 
        return self.name


# ================ CLASS 2: Product ================
class Product(models.Model):

    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=200)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    unit = models.CharField(max_length=50, default="ชิ้น")
    stock = models.IntegerField(default=0)
    initial_stock = models.IntegerField(default=0)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    on_sale = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self): 
        return self.name
    
    def update_stock(self, amount):
        self.stock += amount
        self.save()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["code"],
                condition=Q(is_deleted=False),
                name="uniq_product_code_active",
            ),
        ]


# ================ CLASS 3: Issue ================
class Issue(models.Model):

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    STATUS_CHOICES = [
        ('pending', 'รอดำเนินการ'),
        ('completed', 'เสร็จสิ้น'),
        ('cancelled', 'ยกเลิก'),
    ]
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES,
        default='pending'
    )

    def __str__(self):
        return f"Issue #{self.id} ({self.status})"

    def get_total_items(self):
        return sum(line.qty for line in self.lines.all())


# ================ CLASS 4: IssueLine ================
class IssueLine(models.Model):
    issue = models.ForeignKey(
        Issue, 
        related_name="lines",   
        on_delete=models.CASCADE
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.PositiveIntegerField()


# ================ CLASS 5: Listing ================
class Listing(models.Model):
    product = models.OneToOneField(
        Product, 
        related_name="listing", 
        on_delete=models.CASCADE
    )
    title = models.CharField(max_length=200, blank=True)
    sale_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    unit = models.CharField(max_length=50, blank=True)
    image = models.ImageField(upload_to="listings/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    quantity = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or self.product.name


# ================ CLASS 6: Festival ================
class Festival(models.Model):
    """
    เก็บข้อมูลเทศกาล/วันพิเศษ
    """
    name = models.CharField(
        max_length=100,
        help_text="ชื่อเทศกาล เช่น สงกราน, ปีใหม่"
    )
    description = models.TextField(
        null=True,
        blank=True,
        help_text="รายละเอียดเทศกาล"
    )
    start_date = models.DateField(help_text="วันเริ่มเทศกาล")
    end_date = models.DateField(help_text="วันสิ้นสุดเทศกาล")
    is_recurring = models.BooleanField(
        default=True,
        help_text="ประจำปี (True) หรือ ไม่ประจำปี (False)"
    )
    category = models.CharField(
        max_length=50,
        choices=[
            ('new_year', 'ปีใหม่'),
            ('songkran', 'สงกราน'),
            ('festival', 'เทศกาล'),
            ('holiday', 'วันหยุด'),
            ('special', 'วันพิเศษ'),
        ],
        default='festival'
    )
    icon = models.CharField(
        max_length=50,
        default='🎉',
        help_text="emoji สำหรับแสดง"
    )
    color = models.CharField(
        max_length=7,
        default='#FF6B6B',
        help_text="สีสำหรับแสดงบน Calendar (#RRGGBB)"
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="หมายเหตุ/แจ้งเตือนให้พนักงาน"
    )
    preparation_tasks = models.TextField(
        null=True,
        blank=True,
        help_text="รายการสิ่งที่ต้องเตรียม (แยกด้วย ,)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date']
        verbose_name = 'Festival'
        verbose_name_plural = 'Festivals'

    def __str__(self):
        return f"{self.name} ({self.start_date.strftime('%d-%m-%Y')})"

    @property
    def duration_days(self):
        return (self.end_date - self.start_date).days + 1

    @property
    def is_upcoming(self):
        today = timezone.now().date()
        return self.start_date >= today

    @property
    def days_until(self):
        today = timezone.now().date()
        if self.start_date > today:
            return (self.start_date - today).days
        return None


# ================ CLASS 7: Task ================
class Task(models.Model):
    """
    Model สำหรับการมอบหมายงานให้พนักงาน
    """
    TASK_TYPE_CHOICES = [
        ('stock_replenishment', '🎁 เติมสินค้า'),
        ('stock_issue', '📤 เบิกสต๊อก'),
        ('inventory_check', '🔍 ตรวจสต็อก'),
        ('preparation', '📋 เตรียมสินค้า'),
        ('other', '📝 อื่นๆ'),
    ]
    
    STATUS_CHOICES = [
        ('pending', '⏳ รอรับ'),
        ('in_progress', '⚙️ กำลังทำ'),
        ('completed', '✅ เสร็จ'),
        ('cancelled', '❌ ยกเลิก'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', '🟢 ต่ำ'),
        ('medium', '🟡 ปกติ'),
        ('high', '🔴 สูง'),
        ('urgent', '⚠️ ด่วน'),
    ]
    
    # Basic Info
    title = models.CharField(max_length=255, verbose_name="ชื่องาน")
    description = models.TextField(verbose_name="รายละเอียด")
    task_type = models.CharField(
        max_length=50,
        choices=TASK_TYPE_CHOICES,
        default='other',
        verbose_name="ประเภทงาน"
    )
    
    # Assignment
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_tasks',
        verbose_name="มอบหมายให้"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_tasks',
        verbose_name="สร้างโดย"
    )
    
    # Status & Priority
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="สถานะ"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name="ลำดับความสำคัญ"
    )
    
    # Related Data
    festival = models.ForeignKey(
        Festival,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        verbose_name="เทศกาล (ถ้ามี)"
    )
    products = models.ManyToManyField(
        Product,
        blank=True,
        related_name='tasks',
        verbose_name="สินค้าที่เกี่ยวข้อง"
    )
    
    # Task Details
    target_quantity = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="จำนวนเป้าหมาย"
    )
    checklist = models.JSONField(
        null=True,
        blank=True,
        default=list,
        verbose_name="รายการตรวจสอบ",
        help_text='ตัวอย่าง: [{"item": "สินค้า 10 ชิ้น", "done": false}]'
    )
    image = models.ImageField(
        upload_to='tasks/',
        null=True,
        blank=True,
        verbose_name="รูปภาพ"
    )
    
    # Timeline
    due_date = models.DateTimeField(verbose_name="วันกำหนด")
    notes = models.TextField(
        null=True,
        blank=True,
        verbose_name="หมายเหตุ/รายงานผล"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="สร้างเมื่อ")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="อัปเดตเมื่อ")
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="เสร็จเมื่อ"
    )
    
    class Meta:
        ordering = ['-priority', 'due_date']
        verbose_name = "งาน"
        verbose_name_plural = "งาน"
        indexes = [
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        assigned_name = (
            self.assigned_to.get_full_name() or 
            self.assigned_to.username
        )
        return (
            f"[{self.get_priority_display()}] "
            f"{self.title} → {assigned_name}"
        )
    
    @property
    def is_overdue(self):
        if self.status == 'completed':
            return False
        return timezone.now() > self.due_date
    
    @property
    def days_until_due(self):
        if self.status == 'completed':
            return None
        delta = self.due_date.date() - timezone.now().date()
        return delta.days
    
    def mark_as_complete(self, notes=""):
        self.status = 'completed'
        self.completed_at = timezone.now()
        if notes:
            current_notes = self.notes or ''
            self.notes = f"{current_notes}\n[{timezone.now()}] {notes}"
        self.save()
    
    def save(self, *args, **kwargs):
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != 'completed':
            self.completed_at = None
        super().save(*args, **kwargs)


# ================ CLASS 8: CustomEvent ================
class CustomEvent(models.Model):
    """บันทึกของฉัน - เก็บในฐานข้อมูลแทน localStorage"""
    EVENT_TYPES = [
        ('stock_order', 'สั่งซื้อสินค้า'),
        ('stock_check', 'ตรวจนับสต็อก'),
        ('delivery', 'รับ/ส่งสินค้า'),
        ('meeting', 'ประชุม/นัดหมาย'),
        ('other', 'อื่นๆ'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'ต่ำ'),
        ('medium', 'ปกติ'),
        ('high', 'สูง'),
        ('urgent', 'ด่วน'),
    ]
    
    title = models.CharField(max_length=200, verbose_name="ชื่อ")
    date = models.DateField(verbose_name="วันที่")
    event_type = models.CharField(
        max_length=20, 
        choices=EVENT_TYPES, 
        default='stock_order',
        verbose_name="ประเภท"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        verbose_name="ระดับความสำคัญ"
    )
    notes = models.TextField(blank=True, null=True, verbose_name="หมายเหตุ")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='custom_events',
        verbose_name="สร้างโดย",
        null=True,
        blank=True
    )
    is_shared = models.BooleanField(default=True, verbose_name="แชร์ให้ทุกคน")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "บันทึกของฉัน"
        verbose_name_plural = "บันทึกของฉัน"
        ordering = ['-priority', 'date', '-created_at']
    
    def __str__(self):
        priority_display = self.get_priority_display()
        return f"[{priority_display}] {self.title} ({self.date})"