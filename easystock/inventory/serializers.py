# inventory/serializers.py (COMPLETE - FIXED VERSION)

from rest_framework import serializers
from .models import CustomEvent
from django.contrib.auth import get_user_model
from .models import Product, Category, Listing, Festival, BestSeller, FestivalForecast, ForecastProduct, Task

User = get_user_model()


# ================ User Serializer ================
class UserSerializer(serializers.ModelSerializer):
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
    
    # ✅ เพิ่ม display_name
    display_name = serializers.SerializerMethodField()
    listing_title = serializers.SerializerMethodField()
    has_listing = serializers.SerializerMethodField()
    
    profit = serializers.SerializerMethodField()
    profit_margin = serializers.SerializerMethodField()
    inventory_value = serializers.SerializerMethodField()
    potential_revenue = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'code', 'name',
            'display_name', 'listing_title', 'has_listing',
            'cost_price', 'selling_price', 'profit', 'profit_margin',
            'unit', 'stock', 'inventory_value', 'potential_revenue',
            'image', 'image_url', 'category', 'category_name',
            'on_sale', 'created_at', 'created_by'
        ]
        read_only_fields = ['created_at', 'created_by', 'on_sale']
    
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
    
    def get_display_name(self, obj):
        try:
            if hasattr(obj, 'listing') and obj.listing and obj.listing.title:
                return obj.listing.title
        except:
            pass
        return obj.name
    
    def get_listing_title(self, obj):
        try:
            if hasattr(obj, 'listing') and obj.listing:
                return obj.listing.title or None
        except:
            pass
        return None
    
    def get_has_listing(self, obj):
        try:
            return hasattr(obj, 'listing') and obj.listing is not None
        except:
            return False
    
    def get_profit(self, obj):
        return float(obj.selling_price - obj.cost_price)
    
    def get_profit_margin(self, obj):
        if obj.selling_price > 0:
            profit = obj.selling_price - obj.cost_price
            return float((profit / obj.selling_price) * 100)
        return 0.0
    
    def get_inventory_value(self, obj):
        return float(obj.cost_price * obj.stock)
    
    def get_potential_revenue(self, obj):
        return float(obj.selling_price * obj.stock)


# ================ Listing Serializer ================
class ListingSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
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
        return float(obj.product.cost_price) if obj.product else 0
    
    def get_selling_price(self, obj):
        return float(obj.product.selling_price) if obj.product else 0
    
    def get_profit(self, obj):
        if not obj.product:
            return 0
        return float(obj.product.selling_price - obj.product.cost_price)
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            try:
                if request:
                    return request.build_absolute_uri(obj.image.url)
                return obj.image.url
            except:
                pass
        if obj.product and obj.product.image and hasattr(obj.product.image, 'url'):
            try:
                if request:
                    return request.build_absolute_uri(obj.product.image.url)
                return obj.product.image.url
            except:
                pass
        return None


# ================ Festival Serializer ================
class FestivalSerializer(serializers.ModelSerializer):
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
        return obj.duration_days

    def get_is_upcoming(self, obj):
        return obj.is_upcoming

    def get_days_until(self, obj):
        return obj.days_until

    def get_best_sellers_count(self, obj):
        return obj.best_sellers.count()


# ================ BestSeller Serializer ================
class BestSellerSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    festival_name = serializers.CharField(source='festival.name', read_only=True)
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
        read_only_fields = ['recorded_date', 'created_at', 'updated_at']

    def get_status_display(self, obj):
        return obj.status_display


class BestSellerDetailSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    festival = FestivalSerializer(read_only=True)

    class Meta:
        model = BestSeller
        fields = '__all__'

    def get_product(self, obj):
        return {
            'id': obj.product.id,
            'name': obj.product.name,
            'code': obj.product.code,
            'category': obj.product.category.name if obj.product.category else None,
            'unit': obj.product.unit
        }


# ================ ForecastProduct Serializer ================
class ForecastProductSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)

    class Meta:
        model = ForecastProduct
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'recommended_quantity', 'confidence', 'notes'
        ]


# ================ FestivalForecast Serializer ================
class FestivalForecastSerializer(serializers.ModelSerializer):
    festival = FestivalSerializer(read_only=True)
    product_forecasts = ForecastProductSerializer(many=True, read_only=True)

    class Meta:
        model = FestivalForecast
        fields = ['id', 'festival', 'product_forecasts', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


# ================ FestivalWithBestSellers Serializer ================
class FestivalWithBestSellersSerializer(serializers.ModelSerializer):
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


# ================ Task Serializer ================
class TaskSerializer(serializers.ModelSerializer):
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
        read_only_fields = ['created_at', 'updated_at', 'completed_at']
    
    def get_days_until_due(self, obj):
        return obj.days_until_due


# ================ CustomEvent Serializer (FIXED) ================
class CustomEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = CustomEvent
        fields = [
            'id', 
            'title', 
            'date', 
            'event_type',
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