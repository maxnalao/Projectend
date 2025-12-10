# inventory/serializers.py
from rest_framework import serializers
from .models import Product, Category, Listing


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'product_count']
    
    def get_product_count(self, obj):
        return Product.objects.filter(category=obj, is_deleted=False).count()


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'code', 'name', 'price', 'unit', 'stock',
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


class ListingSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Listing
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'category_name', 'title', 'sale_price', 'unit',
            'image', 'image_url', 'is_active', 'quantity', 'created_at'
        ]
        read_only_fields = ['created_at']
    
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