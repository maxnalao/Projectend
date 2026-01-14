# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class User(AbstractUser):
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    
    # ✅ เพิ่มสำหรับ Real-time Online Status
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(null=True, blank=True)
    
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        related_name='custom_user_set',
        related_query_name='custom_user',
    )
    
    def __str__(self):
        return self.username
    
    def set_online(self):
        """Set user as online"""
        self.is_online = True
        self.last_activity = timezone.now()
        self.save(update_fields=['is_online', 'last_activity'])
    
    def set_offline(self):
        """Set user as offline"""
        self.is_online = False
        self.save(update_fields=['is_online'])
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = timezone.now()
        self.is_online = True
        self.save(update_fields=['last_activity', 'is_online'])


# ✅ Model สำหรับ LINE Notification
class NotificationSettings(models.Model):
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='notification_settings'
    )
    line_user_id = models.CharField(max_length=100, null=True, blank=True)
    verification_code = models.CharField(max_length=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Notification Setting'
        verbose_name_plural = 'Notification Settings'
    
    def __str__(self):
        return f"Settings for {self.user.username}"


# ✅ Model สำหรับ User Roles (Admin/Employee)
class UserProfile(models.Model):
    """User profile to store role"""
    
    ROLE_CHOICES = (
        ('admin', 'Admin/Owner'),
        ('employee', 'Employee'),
    )
    
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profile'
    )
    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='employee'
    )
    department = models.CharField(
        max_length=100, 
        blank=True, 
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
    
    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"
    
    def is_admin(self):
        return self.role == 'admin'
    
    def is_employee(self):
        return self.role == 'employee'


# ✅ SIGNALS - สร้าง profile อัตโนมัติเมื่อสร้าง user

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()