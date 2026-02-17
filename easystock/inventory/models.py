# backend/inventory/models.py (CLEANED VERSION - ลบโค้ดที่ไม่ใช้แล้ว)
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
    
    # ✅ PRICE FIELDS
    cost_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        help_text="ราคาต้นทุน/ราคาซื้อ"
    )
    selling_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        help_text="ราคาขาย/ราคาขายปลีก"
    )
    
    unit = models.CharField(max_length=50, default="ชิ้น")
    stock = models.IntegerField(default=0)
    initial_stock = models.IntegerField(
        default=0, 
        help_text="Stock when first received in"
    )
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    category = models.ForeignKey(
        Category, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    on_sale = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )

    def __str__(self): 
        return self.name

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
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )


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
    เช่น ปีใหม่, สงกราน, ลอยกระทง, วันเด็ก, วันสตรี
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
        """คืนจำนวนวันของเทศกาล"""
        return (self.end_date - self.start_date).days + 1

    @property
    def is_upcoming(self):
        """เช็คว่าเทศกาลกำลังมาถึง"""
        today = timezone.now().date()
        return self.start_date >= today

    @property
    def days_until(self):
        """คืนจำนวนวันที่เหลือจนถึงเทศกาล"""
        today = timezone.now().date()
        if self.start_date > today:
            return (self.start_date - today).days
        return None


# ================ CLASS 7: BestSeller ================
class BestSeller(models.Model):
    """
    บันทึกสินค้าขายดี/ยอดนิยมตามเทศกาล
    ใช้สำหรับติดตามเทศกาลไหน สินค้าไหนขายดี
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='best_sellers',
        help_text="สินค้า"
    )
    festival = models.ForeignKey(
        Festival,
        on_delete=models.CASCADE,
        related_name='best_sellers',
        help_text="เทศกาล"
    )
    total_issued = models.IntegerField(
        default=0,
        help_text="จำนวนเบิกทั้งหมด"
    )
    percentage_increase = models.FloatField(
        default=0.0,
        help_text="เพิ่มขึ้นเปอร์เซ็นต์เมื่อเทียบกับ last_year"
    )
    last_year_count = models.IntegerField(
        default=0,
        help_text="จำนวนเบิกปีที่แล้ว"
    )
    this_year_count = models.IntegerField(
        default=0,
        help_text="จำนวนเบิกปีนี้"
    )
    rank = models.IntegerField(
        default=0,
        help_text="ลำดับที่ (1=ขายดีสุด)"
    )
    recorded_date = models.DateField(
        auto_now_add=True,
        help_text="วันที่บันทึก"
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="หมายเหตุเพิ่มเติม"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'festival')
        ordering = ['-rank', '-total_issued']
        verbose_name = 'Best Seller'
        verbose_name_plural = 'Best Sellers'
        indexes = [
            models.Index(fields=['festival', '-rank']),
            models.Index(fields=['product', 'festival']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.festival.name} (Rank: {self.rank})"

    def save(self, *args, **kwargs):
        """คำนวณ percentage_increase ก่อน save"""
        if self.last_year_count > 0:
            self.percentage_increase = (
                (self.this_year_count - self.last_year_count) / 
                self.last_year_count * 100
            )
        super().save(*args, **kwargs)

    @property
    def status(self):
        """สถานะของสินค้า (up/down/same)"""
        if self.percentage_increase > 0:
            return 'up'
        elif self.percentage_increase < 0:
            return 'down'
        else:
            return 'same'

    @property
    def status_display(self):
        """แสดง status ด้วย emoji"""
        if self.percentage_increase > 0:
            return f"↑ +{self.percentage_increase:.1f}%"
        elif self.percentage_increase < 0:
            return f"↓ {self.percentage_increase:.1f}%"
        else:
            return "= 0%"


# ================ CLASS 8: Task ================
class Task(models.Model):
    """
    ✅ Model สำหรับการมอบหมายงานให้พนักงาน
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
        """เช็คว่างานเกินกำหนดหรือไม่"""
        if self.status == 'completed':
            return False
        return timezone.now() > self.due_date
    
    @property
    def days_until_due(self):
        """คำนวณจำนวนวันจนถึงกำหนด"""
        if self.status == 'completed':
            return None
        delta = self.due_date.date() - timezone.now().date()
        return delta.days
    
    def mark_as_complete(self, notes=""):
        """ทำเครื่องหมายว่างานเสร็จ"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        if notes:
            current_notes = self.notes or ''
            self.notes = f"{current_notes}\n[{timezone.now()}] {notes}"
        self.save()
    
    def save(self, *args, **kwargs):
        """Auto-update completed_at when status changes"""
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != 'completed':
            self.completed_at = None
        super().save(*args, **kwargs)


# ================ CLASS 9: CustomEvent ================
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
    

