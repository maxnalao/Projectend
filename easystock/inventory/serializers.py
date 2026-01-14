# inventory/serializers.py (COMPLETE - ALL SERIALIZERS)

from rest_framework import serializers
from .models import CustomEvent
from django.contrib.auth import get_user_model
from .models import Product, Category, Listing, Festival, BestSeller, FestivalForecast, ForecastProduct, Task

User = get_user_model()


# ================ User Serializer (NEW) ================
class UserSerializer(serializers.ModelSerializer):
    """Serializer สำหรับดึงข้อมูลผู้ใช้"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_staff', 'is_superuser']
        read_only_fields = ['id', 'is_staff', 'is_superuser']


# ================ Category Serializer ================
class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'product_count']
    
    def get_product_count(self, obj):
        return Product.objects.filter(category=obj, is_deleted=False).count()


# ================ Product Serializer ================
class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    # ✅ ADD - Calculate price fields
    profit = serializers.SerializerMethodField()
    profit_margin = serializers.SerializerMethodField()
    inventory_value = serializers.SerializerMethodField()
    potential_revenue = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'code', 'name', 
            'cost_price', 'selling_price', 'profit', 'profit_margin',
            'unit', 'stock', 'inventory_value', 'potential_revenue',
            'image', 'image_url', 'category', 'category_name',
            'on_sale', 'created_at', 'created_by'
        ]
        read_only_fields = ['created_at', 'created_by', 'on_sale', 'profit', 'profit_margin', 'inventory_value', 'potential_revenue']
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            try:
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
            except:
                return None
        return None
    
    def get_profit(self, obj):
        """Calculate profit per unit"""
        return float(obj.selling_price - obj.cost_price)
    
    def get_profit_margin(self, obj):
        """Calculate profit margin percentage"""
        if obj.selling_price > 0:
            profit = obj.selling_price - obj.cost_price
            return float((profit / obj.selling_price) * 100)
        return 0.0
    
    def get_inventory_value(self, obj):
        """Calculate total inventory value (cost)"""
        return float(obj.cost_price * obj.stock)
    
    def get_potential_revenue(self, obj):
        """Calculate potential revenue if sold all"""
        return float(obj.selling_price * obj.stock)


# ================ Listing Serializer ================
class ListingSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    # ✅ FIXED - ดึง cost_price, selling_price จาก Product เสมอ (ไม่ hardcode)
    cost_price = serializers.SerializerMethodField()
    selling_price = serializers.SerializerMethodField()
    profit = serializers.SerializerMethodField()
    
    class Meta:
        model = Listing
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'category_name', 'title', 'sale_price', 'unit',
            'cost_price', 'selling_price', 'profit',
            'image', 'image_url', 'is_active', 'quantity', 'created_at'
        ]
        read_only_fields = ['created_at']
    
    def get_cost_price(self, obj):
        """ดึง cost_price จาก Product ตลอดเวลา (ไม่ hardcode)"""
        return float(obj.product.cost_price) if obj.product else 0
    
    def get_selling_price(self, obj):
        """ดึง selling_price จาก Product ตลอดเวลา (ไม่ hardcode)"""
        return float(obj.product.selling_price) if obj.product else 0
    
    def get_profit(self, obj):
        """Calculate profit per unit for listing"""
        if not obj.product:
            return 0
        return float(obj.product.selling_price - obj.product.cost_price)
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        
        # ลองใช้รูปจาก Listing ก่อน
        if obj.image and hasattr(obj.image, 'url'):
            try:
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
            except:
                pass
        
        # ถ้าไม่มี ใช้รูปจาก Product
        if obj.product and obj.product.image and hasattr(obj.product.image, 'url'):
            try:
                if request:
                    return request.build_absolute_uri(obj.product.image.url)
                return obj.product.image.url
            except:
                pass
        
        return None


# ==================== FESTIVAL SERIALIZERS ====================

class FestivalSerializer(serializers.ModelSerializer):
    """Serializer สำหรับ Festival"""
    duration_days = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    days_until = serializers.SerializerMethodField()
    best_sellers_count = serializers.SerializerMethodField()

    class Meta:
        model = Festival
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date',
            'is_recurring', 'category', 'icon', 'color',
            'duration_days', 'is_upcoming', 'days_until', 'best_sellers_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_duration_days(self, obj):
        """คืนจำนวนวันของเทศกาล"""
        return obj.duration_days

    def get_is_upcoming(self, obj):
        """เช็คว่าเทศกาลกำลังมาถึง"""
        return obj.is_upcoming

    def get_days_until(self, obj):
        """คืนจำนวนวันที่เหลือจนถึงเทศกาล"""
        return obj.days_until

    def get_best_sellers_count(self, obj):
        """นับจำนวน best sellers"""
        return obj.best_sellers.count()


# ================ BestSeller Serializer ================
class BestSellerSerializer(serializers.ModelSerializer):
    """Serializer สำหรับ BestSeller"""
    product_name = serializers.CharField(
        source='product.name',
        read_only=True
    )
    product_code = serializers.CharField(
        source='product.code',
        read_only=True
    )
    festival_name = serializers.CharField(
        source='festival.name',
        read_only=True
    )
    status_display = serializers.SerializerMethodField()

    class Meta:
        model = BestSeller
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'festival', 'festival_name',
            'total_issued', 'percentage_increase', 'status_display',
            'last_year_count', 'this_year_count', 'rank',
            'recorded_date', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['recorded_date', 'created_at', 'updated_at', 'percentage_increase']

    def get_status_display(self, obj):
        """ส่งกลับ status ด้วย emoji"""
        return obj.status_display


class BestSellerDetailSerializer(serializers.ModelSerializer):
    """Serializer ที่ละเอียดสำหรับ BestSeller"""
    product = serializers.SerializerMethodField()
    festival = FestivalSerializer(read_only=True)

    class Meta:
        model = BestSeller
        fields = '__all__'

    def get_product(self, obj):
        """ส่ง product ด้วย detail"""
        return {
            'id': obj.product.id,
            'name': obj.product.name,
            'code': obj.product.code,
            'category': obj.product.category.name if obj.product.category else None,
            'unit': obj.product.unit
        }


# ================ ForecastProduct Serializer ================
class ForecastProductSerializer(serializers.ModelSerializer):
    """Serializer สำหรับ ForecastProduct"""
    product_name = serializers.CharField(
        source='product.name',
        read_only=True
    )
    product_code = serializers.CharField(
        source='product.code',
        read_only=True
    )

    class Meta:
        model = ForecastProduct
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'recommended_quantity', 'confidence', 'notes'
        ]


# ================ FestivalForecast Serializer ================
class FestivalForecastSerializer(serializers.ModelSerializer):
    """Serializer สำหรับ FestivalForecast"""
    festival = FestivalSerializer(read_only=True)
    product_forecasts = ForecastProductSerializer(many=True, read_only=True)

    class Meta:
        model = FestivalForecast
        fields = [
            'id', 'festival', 'product_forecasts', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


# ================ FestivalWithBestSellers Serializer ================
class FestivalWithBestSellersSerializer(serializers.ModelSerializer):
    """Serializer รวม Festival + Best Sellers"""
    best_sellers = BestSellerSerializer(many=True, read_only=True)
    duration_days = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()
    days_until = serializers.SerializerMethodField()

    class Meta:
        model = Festival
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date',
            'is_recurring', 'category', 'icon', 'color',
            'duration_days', 'is_upcoming', 'days_until',
            'best_sellers', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_duration_days(self, obj):
        return obj.duration_days

    def get_is_upcoming(self, obj):
        return obj.is_upcoming

    def get_days_until(self, obj):
        return obj.days_until


# ================ Response Serializers ================
class TopProductsResponseSerializer(serializers.Serializer):
    """Serializer สำหรับ Response ของ Top Products"""
    rank = serializers.IntegerField()
    product = serializers.DictField()
    total_issued = serializers.IntegerField()
    percentage_increase = serializers.FloatField()
    period = serializers.CharField(required=False)


class FestivalForecastResponseSerializer(serializers.Serializer):
    """Serializer สำหรับ Response ของ Festival Forecast"""
    upcoming_festival = serializers.DictField()
    recommendations = serializers.ListField(child=serializers.DictField())
    confidence_score = serializers.FloatField(required=False)


# ================ Task Serializer ================
class TaskSerializer(serializers.ModelSerializer):
    """Serializer สำหรับ Task"""
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    festival_name = serializers.CharField(source='festival.name', read_only=True, allow_null=True)
    is_overdue = serializers.BooleanField(read_only=True)
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'task_type', 'task_type_display',
            'assigned_to', 'assigned_to_name',
            'status', 'status_display', 'priority', 'priority_display',
            'festival', 'festival_name', 'products', 'target_quantity',
            'notes', 'due_date', 'created_at', 'updated_at', 'completed_at',
            'is_overdue', 'days_until_due'
        ]
        read_only_fields = ['created_at', 'updated_at', 'completed_at', 'status_display', 'priority_display', 'task_type_display', 'is_overdue']
    
    def get_days_until_due(self, obj):
        return obj.days_until_due



class CustomEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    type = serializers.CharField(source='event_type', required=False)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = CustomEvent
        fields = [
            'id', 
            'title', 
            'date', 
            'event_type',
            'type',  # alias สำหรับ frontend
            'priority',
            'priority_display',
            'notes', 
            'is_shared',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None
    
    def create(self, validated_data):
        # ดึง event_type จาก type ถ้ามี
        if 'event_type' not in validated_data and 'type' in self.initial_data:
            validated_data['event_type'] = self.initial_data['type']
        
        # กำหนด created_by เป็น user ปัจจุบัน
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)
