
from rest_framework.permissions import IsAuthenticated


def is_admin(user):
    try:
        return user.is_admin()
    except:
        return False


def is_employee(user):
    try:
        return user.is_employee()
    except:
        return True


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_admin(request.user)


class IsEmployee(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_employee(request.user)


class IsAdminOrEmployee(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view)


class IsAdminOrReadOnly(IsAuthenticated):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        return is_admin(request.user)