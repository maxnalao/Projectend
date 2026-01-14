# accounts/serializers.py
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ("username", "password", "email", "first_name", "last_name")

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(pwd)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.ImageField(required=False, allow_null=True)
    # ✅ เพิ่ม is_online และ last_activity
    is_online = serializers.BooleanField(read_only=True)
    last_activity = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email",
            "first_name", "last_name",
            "profile_image",
            "is_staff", "is_superuser", "is_active",
            "is_online",        # ✅ เพิ่ม
            "last_activity",    # ✅ เพิ่ม
            "date_joined", "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "is_online", "last_activity"]

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        req = self.context.get('request')

        if instance.profile_image and hasattr(instance.profile_image, "url"):
            try:
                ret["profile_image"] = req.build_absolute_uri(instance.profile_image.url)
            except:
                ret["profile_image"] = None
        else:
            ret["profile_image"] = None

        return ret


# ✅ Login Serializer
class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "username"
    
    def validate(self, attrs):
        login_id = attrs.get(self.username_field, "").strip()
        
        if "@" in login_id:
            try:
                user = User.objects.get(email__iexact=login_id)
                attrs[self.username_field] = user.username
            except User.DoesNotExist:
                pass
            except User.MultipleObjectsReturned:
                user = User.objects.filter(email__iexact=login_id).first()
                if user:
                    attrs[self.username_field] = user.username
        
        return super().validate(attrs)