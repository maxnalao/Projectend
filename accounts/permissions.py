# backend/accounts/permissions.py

from rest_framework.permissions import BasePermission

class IsAdminUser(BasePermission):
    """
    Permission: อนุญาตเฉพาะ Admin/เจ้าของร้านเท่านั้น
    """
    
    def has_permission(self, request, view):
        # ตรวจสอบว่า user login แล้ว และเป็น admin
        return (
            request.user 
            and request.user.is_authenticated 
            and (request.user.role == 'admin' or request.user.is_superuser)
        )


class IsStaffUser(BasePermission):
    """
    Permission: อนุญาตเฉพาะพนักงาน (ไม่รวม Admin)
    """
    
    def has_permission(self, request, view):
        return (
            request.user 
            and request.user.is_authenticated 
            and request.user.role == 'staff'
        )


class IsAdminOrReadOnly(BasePermission):
    """
    Permission: Admin แก้ไขได้ทั้งหมด, Staff อ่านอย่างเดียว
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # ถ้าเป็น GET request (อ่านอย่างเดียว) ให้ทุกคนเข้าได้
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # ถ้าเป็น POST, PUT, PATCH, DELETE ต้องเป็น Admin เท่านั้น
        return request.user.role == 'admin' or request.user.is_superuser