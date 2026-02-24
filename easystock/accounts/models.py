from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
import uuid


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin/Owner'),
        ('employee', 'Employee'),
    )

    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default='employee',
        verbose_name="บทบาท"
    )
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True, verbose_name="เบอร์โทรศัพท์")
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
        self.is_online = True
        self.last_activity = timezone.now()
        self.save(update_fields=['is_online', 'last_activity'])
    
    def set_offline(self):
        self.is_online = False
        self.save(update_fields=['is_online'])
    
    def update_activity(self):
        self.last_activity = timezone.now()
        self.is_online = True
        self.save(update_fields=['last_activity', 'is_online'])

    def is_admin(self):
        return self.role == 'admin'
    
    def is_employee(self):
        return self.role == 'employee'


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


class PasswordResetToken(models.Model):
    """Token สำหรับ Reset Password ผ่าน Email"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        verbose_name = "Password Reset Token"
        verbose_name_plural = "Password Reset Tokens"
        ordering = ['-created_at']

    def __str__(self):
        return f"Reset token for {self.user.username} ({'used' if self.is_used else 'active'})"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        return not self.is_used and not self.is_expired

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=30)
        super().save(*args, **kwargs)
