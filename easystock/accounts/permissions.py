from rest_framework.permissions import IsAuthenticated


def is_admin(user):
    """Check if user is admin"""
    try:
        return user.profile.is_admin()
    except:
        return False


def is_employee(user):
    """Check if user is employee"""
    try:
        return user.profile.is_employee()
    except:
        return True  # default is employee


class IsAdmin(IsAuthenticated):
    """Only admin/owner can access"""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_admin(request.user)


class IsEmployee(IsAuthenticated):
    """Only employee can access"""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and is_employee(request.user)


class IsAdminOrEmployee(IsAuthenticated):
    """Both admin and employee can access"""
    def has_permission(self, request, view):
        return super().has_permission(request, view)


class IsAdminOrReadOnly(IsAuthenticated):
    """Admin can edit all, Employee can read only"""
    def has_permission(self, request, view):
        # Only authenticated users
        if not request.user or not request.user.is_authenticated:
            return False
        
        # GET requests - everyone authenticated can read
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # POST, PUT, PATCH, DELETE - only admin
        return is_admin(request.user)