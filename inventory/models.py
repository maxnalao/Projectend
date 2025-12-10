from django.db import models
from django.conf import settings
from django.db.models import Q

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.name

class Product(models.Model):
    code = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=50, default="ชิ้น")
    stock = models.IntegerField(default=0)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)

    on_sale = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self): return self.name

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["code"],
                condition=Q(is_deleted=False),
                name="uniq_product_code_active",
            ),
        ]

class Issue(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

class IssueLine(models.Model):
    issue   = models.ForeignKey(Issue, related_name="lines", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty     = models.PositiveIntegerField()

class Listing(models.Model):
    product    = models.OneToOneField(Product, related_name="listing", on_delete=models.CASCADE)
    title      = models.CharField(max_length=200, blank=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit       = models.CharField(max_length=50, blank=True)
    image      = models.ImageField(upload_to="listings/", blank=True, null=True)
    is_active  = models.BooleanField(default=True)
    quantity   = models.IntegerField(default=0)  # 👈 แยกจำนวนที่หน้าแสดง
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or self.product.name
