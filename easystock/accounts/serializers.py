# accounts/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


# ================================================================
# 1. RegisterSerializer - สมัครสมาชิก
# ================================================================

class RegisterSerializer(serializers.Serializer):
    """ตรวจสอบและสร้างผู้ใหม่"""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, default='')
    last_name = serializers.CharField(max_length=150, required=False, default='')
    phone = serializers.CharField(max_length=20, required=False, default='')

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('ชื่อผู้ใช้นี้มีคนใช้แล้ว')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('อีเมลนี้มีคนใช้แล้ว')
        return value.lower()

    def validate_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
        return value

    # ✅ indent เข้ามาอยู่ใน class
    def create(self, validated_data):
        phone = validated_data.pop('phone', '')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone=phone
        )
        return user


# ================================================================
# 2. UserSerializer - แสดงข้อมูล User (ใช้แทน user_to_dict)
# ================================================================

class UserSerializer(serializers.ModelSerializer):
    """แปลง User object เป็น JSON"""
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'is_staff', 'is_superuser', 'is_active',
            'is_online', 'last_activity', 'date_joined', 'last_login',
            'profile_image',
        ]

    def get_profile_image(self, obj):
        if hasattr(obj, 'profile_image') and obj.profile_image:
            try:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.profile_image.url)
                return obj.profile_image.url
            except:
                return None
        return None