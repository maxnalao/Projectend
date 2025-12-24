# backend/inventory/models.py (UPDATED - Copy Everything)
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
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="OLD - Deprecated, use cost_price/selling_price")
    # ✅ PHASE 3B.2: NEW PRICE FIELDS
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="ราคาต้นทุน/ราคาซื้อ")
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="ราคาขาย/ราคาขายปลีก")
    unit = models.CharField(max_length=50, default="ชิ้น")
    stock = models.IntegerField(default=0)
    # ✅ เพิ่ม initial_stock field นี้
    initial_stock = models.IntegerField(default=0, help_text="Stock when first received in")
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    on_sale = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

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
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

# ================ CLASS 4: IssueLine ================
class IssueLine(models.Model):
    issue   = models.ForeignKey(Issue, related_name="lines", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty     = models.PositiveIntegerField()

# ================ CLASS 5: Listing ================
class Listing(models.Model):
    product    = models.OneToOneField(Product, related_name="listing", on_delete=models.CASCADE)
    title      = models.CharField(max_length=200, blank=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit       = models.CharField(max_length=50, blank=True)
    image      = models.ImageField(upload_to="listings/", blank=True, null=True)
    is_active  = models.BooleanField(default=True)
    quantity   = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or self.product.name

# ================ CLASS 6: NotificationSettings ================
class NotificationSettings(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notificationsettings'
    )
    line_user_id = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )
    verification_code = models.CharField(
        max_length=6,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Notification Settings"
        verbose_name_plural = "Notification Settings"
    
    def __str__(self):
        return f"{self.user.username} - LINE"


# ================ CLASS 7: Festival (NEW - Phase 3A) ================
class Festival(models.Model):
    """
    เก็บข้อมูลเทศกาล/วันพิเศษ
    เช่น ปีใหม่, สงกราน, ลอยกระทง, วันลอยกระทง, วันเด็ก, วันสตรี, เป็นต้น
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
    start_date = models.DateField(
        help_text="วันเริ่มเทศกาล"
    )
    end_date = models.DateField(
        help_text="วันสิ้นสุดเทศกาล"
    )
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


# ================ CLASS 8: BestSeller (NEW - Phase 3A) ================
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
                (self.this_year_count - self.last_year_count) / self.last_year_count * 100
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


# ================ CLASS 9: FestivalForecast (NEW - Phase 3A) ================
class FestivalForecast(models.Model):
    """
    ตัวช่วยในการคาดการณ์สินค้าที่ควรเตรียม
    สำหรับเทศกาลที่มาถึง
    """
    festival = models.OneToOneField(
        Festival,
        on_delete=models.CASCADE,
        related_name='forecast',
        help_text="เทศกาล"
    )
    recommended_products = models.ManyToManyField(
        Product,
        through='ForecastProduct',
        help_text="สินค้าที่ควรเตรียม"
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="หมายเหตุการคาดการณ์"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Festival Forecast'
        verbose_name_plural = 'Festival Forecasts'

    def __str__(self):
        return f"Forecast for {self.festival.name}"


# ================ CLASS 10: ForecastProduct (NEW - Phase 3A) ================
class ForecastProduct(models.Model):
    """
    ผ่านแบบ many-to-many สำหรับ Festival Forecast
    """
    forecast = models.ForeignKey(
        FestivalForecast,
        on_delete=models.CASCADE,
        related_name='product_forecasts'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE
    )
    recommended_quantity = models.IntegerField(
        default=0,
        help_text="จำนวนที่แนะนำให้เตรียม"
    )
    confidence = models.IntegerField(
        default=80,
        help_text="ความเชื่อมั่นของการแนะนำ (0-100%)"
    )
    notes = models.TextField(
        null=True,
        blank=True,
        help_text="หมายเหตุ"
    )

    class Meta:
        unique_together = ('forecast', 'product')
        ordering = ['-confidence', '-recommended_quantity']

    def __str__(self):
        return f"{self.product.name} - {self.recommended_quantity} units"