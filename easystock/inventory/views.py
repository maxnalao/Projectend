# inventory/views.py (CLEANED VERSION - ลบ BestSeller ออกแล้ว)

from rest_framework import viewsets, status
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser 
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.db.models import Q, Sum, Count, F
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, HttpResponseBadRequest
from django.conf import settings
import random
import string
from datetime import timedelta, datetime
import logging

User = get_user_model()

from .models import (
    Product, Category, Issue, IssueLine, Listing,
    Festival, Task, CustomEvent
)

from .serializers import (
    ProductSerializer, CategorySerializer, ListingSerializer,
    FestivalSerializer, TaskSerializer, UserSerializer,
    CustomEventSerializer
)

try:
    from accounts.models import NotificationSettings
except ImportError:
    NotificationSettings = None
    print("⚠️ Warning: accounts.models.NotificationSettings not found.")

try:
    from accounts.permissions import IsAdmin, IsEmployee
except ImportError:
    IsAdmin = IsAuthenticated
    IsEmployee = IsAuthenticated

# LINE Messaging API Setup
LINE_AVAILABLE = False
line_service = None
logger = logging.getLogger(__name__)

try:
    from linebot.exceptions import InvalidSignatureError
    from linebot.models import MessageEvent, TextMessage
    from .line_messaging import LineMessagingService
    
    line_service = LineMessagingService(
        channel_access_token=getattr(settings, 'LINE_CHANNEL_ACCESS_TOKEN', ''),
        channel_secret=getattr(settings, 'LINE_CHANNEL_SECRET', '')
    )
    LINE_AVAILABLE = True
except Exception as e:
    print(f"⚠️ LINE SDK initialization error: {e}")

# ==================== USER VIEWSET ====================

class UserViewSet(ReadOnlyModelViewSet):
    """
    จัดการข้อมูลผู้ใช้ (Admin only)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return User.objects.filter(is_staff=False, is_superuser=False)
        return User.objects.none()

# ==================== PRODUCT VIEWSET ====================

class ProductViewSet(viewsets.ModelViewSet):
    """
    จัดการสินค้าในคลัง
    """
    permission_classes = [IsAuthenticated]  
    serializer_class = ProductSerializer
    parser_classes = [MultiPartParser, FormParser] 

    def get_queryset(self):
        qs = Product.objects.select_related(
            "category", "created_by", "listing"
        ).filter(is_deleted=False)
        
        show_empty = self.request.query_params.get("show_empty", "0")
        if str(show_empty).lower() not in ("1", "true", "yes"):
            qs = qs.filter(stock__gt=0)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(code__icontains=search)
            )

        cat = self.request.query_params.get("category")
        if cat:
            if str(cat).isdigit():
                qs = qs.filter(category_id=int(cat))
            else:
                qs = qs.filter(category__name=cat)
        return qs.order_by("-id")
    
    def get_object(self):
        if self.request.method in ('DELETE', 'PATCH', 'PUT'):
            pk = self.kwargs.get('pk')
            try:
                product = Product.objects.get(pk=pk, is_deleted=False)
                self.check_object_permissions(self.request, product)
                return product
            except Product.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound("ไม่พบสินค้านี้")
        return super().get_object()

    def create(self, request, *args, **kwargs):

        response = super().create(request, *args, **kwargs)
        
        if response.status_code != 201:
            return response
        
        product = Product.objects.get(id=response.data['id'])
        product.initial_stock = product.stock
        
        if request.user and request.user.is_authenticated:
            product.created_by = request.user
        
        product.save(update_fields=['initial_stock', 'created_by'])
        
        if LINE_AVAILABLE and line_service:
            try:
                settings_obj = NotificationSettings.objects.get(
                    user=request.user
                )
                user_id = settings_obj.line_user_id
                
                if user_id:
                    line_service.send_stock_in_notification(
                        user_id, product.name, product.code, 
                        product.stock, product.unit
                    )
            except NotificationSettings.DoesNotExist:
                pass
            except Exception as e:
                print(f"Error sending LINE notification: {e}")
        
        return response

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_stock = instance.stock
        
        response = super().update(request, *args, **kwargs)
        
        if response.status_code != 200:
            return response
        
        new_stock = response.data.get('stock', old_stock)
        stock_change = new_stock - old_stock
        
        if stock_change != 0 and LINE_AVAILABLE and line_service:
            try:
                settings_obj = NotificationSettings.objects.get(
                    user=request.user
                )
                user_id = settings_obj.line_user_id
                
                if user_id:
                    product = Product.objects.get(id=response.data['id'])
                    updated_by = (
                        request.user.get_full_name() or 
                        request.user.username
                    )
                    
                    if stock_change > 0:
                        line_service.send_stock_in_notification(
                            user_id, product.name, product.code, 
                            stock_change, product.unit
                        )
                        
                        if product.stock < 5 and product.stock > 0:
                            line_service.send_low_stock_alert(
                                user_id, product.name, product.code, 
                                product.stock, product.unit
                            )
                    else:
                        line_service.send_text_message(
                            user_id, 
                            f"""📉 ปรับปรุงสต็อก

📦 สินค้า: {product.name}
🔖 รหัส: {product.code}
📉 ลดลง: {abs(stock_change)} {product.unit}
📊 คงเหลือ: {new_stock} {product.unit}
👤 ปรับปรุงโดย: {updated_by}

บันทึกเรียบร้อยแล้ว"""
                        )
                        
                        if new_stock == 0:
                            line_service.send_out_of_stock_alert(
                                user_id, product.name, product.code
                            )
            except NotificationSettings.DoesNotExist:
                pass
            except Exception as e:
                print(f"Error sending LINE notification: {e}")
        
        return response

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {"detail": "คุณไม่มีสิทธิ์ลบสินค้า"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        product = self.get_object()
        
        if product.stock > 0:
            return Response(
                {"detail": "ไม่สามารถลบสินค้าที่ยังมีสต็อกอยู่"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ลบ Listing ที่เชื่อมอยู่ (ถ้ามี)
        try:
            product.listing.delete()
        except Exception:
            pass
        
        # ลบ IssueLine ที่อ้างอิงสินค้านี้
        IssueLine.objects.filter(product=product).delete()
        
        # ลบสินค้า
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== CATEGORY VIEWSET ====================

class CategoryViewSet(viewsets.ModelViewSet):
    """
    จัดการหมวดหมู่สินค้า
    """
    # ดึงหมวดหมู่ทั้งหมดจาก Model Category เรียงตามชื่อ A-Z
    queryset = Category.objects.all().order_by("name")

    # ใช้ CategorySerializer แปลงข้อมูลเป็น JSON
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]


# ==================== LISTING VIEWSET ====================

class ListingViewSet(viewsets.ModelViewSet):

    # ดึงข้อมูล Listing พร้อม JOIN product และ category มาด้วย
    # กรองเฉพาะสินค้าที่ยังไม่ถูกลบ
    queryset = Listing.objects.select_related(
        "product", "product__category"
    ).filter(product__is_deleted=False)

    serializer_class = ListingSerializer           # ใช้ ListingSerializer แปลงเป็น JSON
    permission_classes = [IsAuthenticated]         # ต้อง login ก่อน
    parser_classes = [MultiPartParser, FormParser] # รองรับอัปโหลดรูปภาพ
    http_method_names = ["get", "patch", "post", "delete"]

    def get_queryset(self):
        qs = super().get_queryset().order_by("-id") # เรียงจากใหม่ไปเก่า

        # กรองเฉพาะ active ถ้าส่ง ?active=1 มา
        active = self.request.query_params.get("active", "1")
        if str(active).lower() in ("1", "true", "yes"):
            qs = qs.filter(is_active=True)

        # ค้นหาจากชื่อ รหัส หรือ title ถ้าส่ง ?search=xxx มา
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(product__name__icontains=search) |
                Q(product__code__icontains=search) |
                Q(title__icontains=search)
            )

        # กรองตามหมวดหมู่ถ้าส่ง ?category=xxx มา
        cat = self.request.query_params.get("category")
        if cat:
            if str(cat).isdigit():
                qs = qs.filter(product__category_id=int(cat))
            else:
                qs = qs.filter(product__category__name=cat)

        return qs # ส่งข้อมูลที่กรองแล้วกลับไป

    def perform_update(self, serializer):
        # แก้ไข Listing โดยล็อค product เดิมไว้
        instance = self.get_object()
        #บันทึกข้อมูลใหม่ลงฐานข้อมูล
        serializer.save(product=instance.product)

    @action(detail=True, methods=["post", "patch"])
    def unlist(self, request, pk=None):
        # ซ่อนสินค้าออกจากรายการ โดยเปลี่ยน is_active เป็น False
        obj = self.get_object()
        if obj.is_active:
            obj.is_active = False
            obj.save(update_fields=["is_active"])
        return Response(self.get_serializer(obj).data)

    def destroy(self, request, *args, **kwargs):
        # ลบ Listing ออกจากฐานข้อมูล ส่ง 204 กลับไป
        obj = self.get_object()# Listing.objects.get(id=id) → listing object
        obj.delete() # listing.delete() → ลบออกจาก DB → deleted
        return Response(status=status.HTTP_204_NO_CONTENT)

# ==================== TASK VIEWSET ====================

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated] # ต้อง login ก่อน

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            # Admin → ดึงงานทั้งหมด
            return Task.objects.all().order_by('-due_date')
        else:
            # พนักงาน → ดึงเฉพาะงานที่มอบหมายให้ตัวเอง
            return Task.objects.filter(
                assigned_to=user
            ).order_by('-due_date')

    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        # GET /tasks/my_tasks/ → ดึงงานของตัวเองแยกตาม status
        tasks = Task.objects.filter(assigned_to=request.user)
        return Response({
            'pending':     TaskSerializer(tasks.filter(status='pending'), many=True).data,     # รอดำเนินการ
            'in_progress': TaskSerializer(tasks.filter(status='in_progress'), many=True).data, # กำลังทำ
            'completed':   TaskSerializer(tasks.filter(status='completed'), many=True).data,   # เสร็จแล้ว
            'total':       tasks.count()
        })

    @action(detail=False, methods=['get'])
    def urgent_tasks(self, request):
        # GET /tasks/urgent_tasks/ → ดึงงานด่วน/สูงที่ยังไม่เสร็จ
        tasks = Task.objects.filter(
            assigned_to=request.user,
            priority__in=['high', 'urgent'],        # priority สูงหรือด่วน
            status__in=['pending', 'in_progress']   # ยังไม่เสร็จ
        ).order_by('due_date') # เรียงจากใกล้กำหนดก่อน
        return Response({'count': tasks.count(), 'tasks': TaskSerializer(tasks, many=True).data})

    @action(detail=True, methods=['post', 'patch'])
    def update_status(self, request, pk=None):
        # PATCH /tasks/{id}/update_status/ → เปลี่ยนสถานะงาน
        task          = self.get_object()              # ดึงงานจาก id
        status_choice = request.data.get('status')    # รับ status ใหม่
        notes         = request.data.get('notes', '') # รับ notes (ถ้ามี)

        if status_choice in dict(Task.STATUS_CHOICES):
            task.status = status_choice
            if notes:
                # ต่อ notes เดิม + เพิ่ม notes ใหม่พร้อมเวลา
                task.notes = f"{task.notes or ''}\n[{timezone.now()}] {notes}"
            task.save() # บันทึกลง DB
            return Response(TaskSerializer(task).data) # ส่ง 200 OK
        else:
            return Response({'error': 'Invalid status'}, status=400)

class EmployeeDashboardViewSet(viewsets.ModelViewSet):
    """
    แดชบอร์ดสำหรับพนักงาน
    """
    permission_classes = [IsEmployee]
    http_method_names = ['get']
    queryset = Product.objects.none()

    @action(detail=False, methods=['get'])
    def overview(self, request):
        from zoneinfo import ZoneInfo
        from datetime import time
        
        bangkok_tz = ZoneInfo('Asia/Bangkok')
        now = timezone.now().astimezone(bangkok_tz)
        today = now.date()
        start = datetime.combine(today, time.min, tzinfo=bangkok_tz)
        end = datetime.combine(today, time.max, tzinfo=bangkok_tz)
        
        total_products = Product.objects.filter(is_deleted=False).count()
        
        # ✅ แก้ตรงนี้ — เปลี่ยนจาก .values() เป็น loop เพื่อสร้าง image_url
        low_stock_qs = Product.objects.filter(
            is_deleted=False, stock__gt=0, stock__lt=5
        ).order_by('stock')[:10]

        low_items = []
        for p in low_stock_qs:
            # สร้าง URL รูปภาพแบบ absolute เหมือน Admin
            img = request.build_absolute_uri(p.image.url) if p.image else None
            low_items.append({
                'id':        p.id,
                'code':      p.code,
                'name':      p.name,
                'stock':     p.stock,
                'unit':      p.unit,
                'image_url': img,  # ✅ เพิ่ม image_url
            })
        
        today_issued = IssueLine.objects.filter(
            issue__created_at__gte=start,
            issue__created_at__lte=end
        ).aggregate(total_qty=Sum('qty'), total_items=Count('id'))
        
        upcoming_festivals = Festival.objects.filter(
            start_date__gte=today
        ).order_by('start_date')[:5].values('id', 'name', 'icon', 'start_date')
        
        top_products_today = IssueLine.objects.filter(
            issue__created_at__gte=start,
            issue__created_at__lte=end
        ).values(
            'product__id', 'product__code', 'product__name'
        ).annotate(qty=Sum('qty')).order_by('-qty')[:5]

        # ── movements (เหมือน Admin) ──
        all_mv = []

        issued = IssueLine.objects.select_related(
            "issue", "product"
        ).filter(
            issue__created_at__gte=start,
            issue__created_at__lte=end
        )
        for l in issued:
            all_mv.append({
                'datetime': l.issue.created_at,
                'id':   f'out_{l.id}',
                'date': l.issue.created_at.isoformat(),
                'code': l.product.code,
                'name': l.product.name,
                'type': 'out',
                'qty':  l.qty
            })

        received = Product.objects.filter(
            is_deleted=False,
            created_at__gte=start,
            created_at__lte=end
        )
        for p in received:
            all_mv.append({
                'datetime': p.created_at,
                'id':   f'in_{p.id}',
                'date': p.created_at.isoformat(),
                'code': p.code,
                'name': p.name,
                'type': 'in',
                'qty':  p.initial_stock or p.stock
            })

        all_mv.sort(key=lambda x: x['datetime'], reverse=True)
        movements = [
            {
                'id':   m['id'],
                'date': m['date'],
                'code': m['code'],
                'name': m['name'],
                'type': m['type'],
                'qty':  m['qty']
            }
            for m in all_mv[:20]
        ]
        
        return Response({
            'total_products':   total_products,
            'low_stock_count':  len(low_items),       # ✅ ใช้ len แทน .count()
            'low_stock_items':  low_items,             # ✅ มี image_url แล้ว
            'today_sales': {
                'total_quantity':    today_issued['total_qty'] or 0,
                'total_transactions': today_issued['total_items'] or 0,
            },
            'upcoming_festivals': list(upcoming_festivals),
            'top_products_today': list(top_products_today),
            'movements':          movements,
        })


class AdminDashboardViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdmin]   # เฉพาะ Admin เท่านั้น
    http_method_names = ['get']
    queryset = Product.objects.none()
 
    @action(detail=False, methods=['get'])
    def overview(self, request):
        from zoneinfo import ZoneInfo
        from datetime import time

        # ── ตั้งค่า Timezone และช่วงเวลาวันนี้ ──────────────────
        bangkok_tz = ZoneInfo('Asia/Bangkok')
        now = timezone.now().astimezone(bangkok_tz)  # เวลาปัจจุบันในกรุงเทพ
        today = now.date()
        start = datetime.combine(today, time.min, tzinfo=bangkok_tz)  # 00:00:00 วันนี้
        end = datetime.combine(today, time.max, tzinfo=bangkok_tz)    # 23:59:59 วันนี้

        # ดึงสินค้าทั้งหมดที่ยังไม่ถูกลบจาก Model Product
        products    = Product.objects.filter(is_deleted=False)
        # รวมจำนวน stock ทั้งหมด
        total_stock = products.aggregate(total=Sum("stock"))["total"] or 0
 
        # ดึงสินค้าที่ stock เหลือน้อย (1-4 ชิ้น) จาก Model Product
        low_qs = Product.objects.filter(is_deleted=False, stock__gt=0, stock__lt=5)
 
        # นับสินค้าที่รับเข้าวันนี้ จาก Model Product
        in_today = Product.objects.filter(
            is_deleted=False,
            created_at__gte=start,
            created_at__lte=end
        ).count()
 
        # รวมจำนวนสินค้าที่เบิกออกวันนี้ จาก Model IssueLine
        out_today = IssueLine.objects.filter(
            issue__created_at__gte=start,
            issue__created_at__lte=end
        ).aggregate(total=Sum("qty"))["total"] or 0
 
        # คำนวณมูลค่าสต็อกรวมทั้งหมด (ราคา x จำนวน)
        total_inventory_value = sum(
            float(p.selling_price or 0) * p.stock for p in products
        )
 
        # สร้างรายการสินค้าใกล้หมด พร้อมรูปภาพ
        low_items = []
        for p in low_qs.order_by("stock")[:10]:
            img = request.build_absolute_uri(p.image.url) if p.image else None
            low_items.append({
                "id": p.id, "code": p.code, "name": p.name,
                "stock": p.stock, "unit": p.unit, "image_url": img
            })
 
        # ดึงประวัติการเบิกสินค้าออกวันนี้ จาก Model IssueLine
        all_mv = []
        issued = IssueLine.objects.select_related("issue", "product").filter(
            issue__created_at__gte=start, issue__created_at__lte=end
        )
        for l in issued:
            all_mv.append({
                'datetime': l.issue.created_at, 'id': f'out_{l.id}',
                'date': l.issue.created_at.isoformat(),
                'code': l.product.code, 'name': l.product.name,
                'type': 'out', 'qty': l.qty
            })
 
        # ดึงสินค้าที่รับเข้าวันนี้ จาก Model Product
        received = Product.objects.filter(
            is_deleted=False, created_at__gte=start, created_at__lte=end
        )
        for p in received:
            all_mv.append({
                'datetime': p.created_at, 'id': f'in_{p.id}',
                'date': p.created_at.isoformat(),
                'code': p.code, 'name': p.name,
                'type': 'in', 'qty': p.initial_stock or p.stock
            })
 
        # เรียงจากล่าสุดก่อน เอาแค่ 20 รายการ
        all_mv.sort(key=lambda x: x['datetime'], reverse=True)
        movements = [
            {'id': m['id'], 'date': m['date'], 'code': m['code'],
             'name': m['name'], 'type': m['type'], 'qty': m['qty']}
            for m in all_mv[:20]
        ]
 
        # ดึงสถิติสินค้าแยกตามหมวดหมู่ จาก Model Product
        cats = Product.objects.filter(is_deleted=False).values(
            'category__name'
        ).annotate(count=Count('id'), total_stock=Sum('stock')).order_by('-count')
 
        cat_list = [
            {'category': c['category__name'] or 'ไม่ระบุ',
             'count': c['count'], 'total_stock': c['total_stock'] or 0}
            for c in cats
        ]
 
        # ส่งข้อมูลทั้งหมดกลับไปให้ OverviewPage
        return Response({
            "total_products":        total_stock,
            "low_stock_count":       low_qs.count(),
            "in_today":              in_today,
            "out_today":             out_today,
            "total_inventory_value": round(total_inventory_value, 2),
            "low_stock_items":       low_items,
            "movements":             movements,
            "category_stats":        cat_list
        })

    # ================================================================
    # financial() — ข้อมูลการเงิน
    # เรียกผ่าน GET /admin-dashboard/financial/
    # ================================================================
    @action(detail=False, methods=['get'])
    def financial(self, request):
        products = Product.objects.filter(is_deleted=False)
        # คำนวณมูลค่าสินค้าทั้งหมดที่ราคาขาย
        total_selling_value = sum(
            float(p.selling_price or 0) * p.stock
            for p in products
        )
        return Response({
            'total_selling_value': total_selling_value,
            'total_products': products.count(),                          # จำนวนสินค้าทั้งหมด
            'total_stock_items': (
                products.aggregate(Sum('stock'))['stock__sum'] or 0     # รวมสต็อกทั้งหมด
            )
        })

    # ================================================================
    # category_breakdown() — สถิติตามหมวดหมู่
    # เรียกผ่าน GET /admin-dashboard/category-breakdown/
    # ================================================================
    @action(detail=False, methods=['get'])
    def category_breakdown(self, request):
        categories = Category.objects.annotate(
            product_count=Count('product'),         # นับจำนวนสินค้าในหมวดหมู่
            total_stock=Sum('product__stock')       # รวมสต็อกในหมวดหมู่
        ).values('id', 'name', 'product_count', 'total_stock')
        return Response({'categories': list(categories)})

    # ================================================================
    # top_products() — สินค้าที่มีมูลค่าสต็อกสูงสุด
    # เรียกผ่าน GET /admin-dashboard/top-products/
    # ================================================================
    @action(detail=False, methods=['get'])
    def top_products(self, request):
        top_products_data = Product.objects.filter(
            is_deleted=False, stock__gt=0   # เฉพาะสินค้าที่ยังมีสต็อก
        ).annotate(
            inventory_value=F('stock') * F('selling_price')  # คำนวณมูลค่า = stock x ราคา
        ).values(
            'id', 'code', 'name', 'stock',
            'selling_price', 'category__name'
        ).order_by('-inventory_value')[:20]  # เรียงมูลค่าสูงไปต่ำ เอา 20 อันดับแรก
        return Response({'top_products': list(top_products_data)})


# ==================== CUSTOM EVENT VIEWSET ====================

class CustomEventViewSet(viewsets.ModelViewSet):
    """
    ระบบจัดการบันทึกส่วนตัว
    """
    serializer_class = CustomEventSerializer
    permission_classes = [IsAuthenticated] # ต้อง login ก่อน

    def get_queryset(self):
        user = self.request.user
        # ดึงงานที่สร้างเอง หรืองานที่ is_shared=True (แชร์ให้ทุกคน)
        return CustomEvent.objects.filter(
            Q(created_by=user) | Q(is_shared=True)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        #CustomEvent.objects.create(created_by=request.user) ──
        if user.is_superuser or user.is_staff:
            # Admin → สร้างงานและแชร์ให้ทุกคนเห็นอัตโนมัติ
            serializer.save(created_by=user, is_shared=True)
        else:
            # พนักงาน → สร้างงานเป็นส่วนตัว
            serializer.save(created_by=user)

    def perform_update(self, serializer):
        instance = self.get_object()
        # เช็คสิทธิ์ → แก้ไขได้เฉพาะงานที่ตัวเองสร้าง หรือเป็น Staff
        if (instance.created_by != self.request.user and
            not self.request.user.is_staff):
            raise PermissionDenied("คุณไม่มีสิทธิ์แก้ไขรายการนี้")
        serializer.save()

    def perform_destroy(self, instance):
        # เช็คสิทธิ์ → ลบได้เฉพาะงานที่ตัวเองสร้าง หรือเป็น Staff
        if (instance.created_by != self.request.user and
            not self.request.user.is_staff):
            raise PermissionDenied("คุณไม่มีสิทธิ์ลบรายการนี้")
        instance.delete()

    @action(detail=False, methods=['get'])
    def my_events(self, request):
        # GET /custom-events/my_events/ → ดึงเฉพาะงานที่ตัวเองสร้าง
        queryset = CustomEvent.objects.filter(created_by=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        # GET /custom-events/calendar/?year=xxx&month=xxx → ดึงงานตามเดือน/ปี
        year  = request.query_params.get('year')
        month = request.query_params.get('month')
        queryset = self.get_queryset()
        if year:  queryset = queryset.filter(date__year=year)
        if month: queryset = queryset.filter(date__month=month)
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'year': year, 'month': month,
            'events': serializer.data,
            'count': queryset.count()
        })

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        # GET /custom-events/upcoming/ → ดึงงานที่จะมาถึง 10 รายการแรก
        today    = timezone.now().date()
        queryset = self.get_queryset().filter(date__gte=today).order_by('date')[:10]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming_shared(self, request):
        # GET /custom-events/upcoming_shared/ → ดึงเฉพาะงานที่แชร์และยังไม่ถึงวัน
        today    = timezone.now().date()
        queryset = CustomEvent.objects.filter(
            is_shared=True, date__gte=today
        ).select_related('created_by').order_by('date')[:10]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
class FestivalViewSet(viewsets.ModelViewSet):
    """
    จัดการเทศกาล
    """
    queryset = Festival.objects.all()
    serializer_class = FestivalSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        today = timezone.now().date()
        next_days = today + timedelta(days=60)

        festivals = Festival.objects.filter(
            start_date__gte=today,
            start_date__lte=next_days
        ).order_by('start_date')

        serializer = self.get_serializer(festivals, many=True)
        return Response({
            'count': festivals.count(),
            'today': today,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))

        if month < 1 or month > 12:
            return Response(
                {'error': 'Month must be between 1 and 12'},
                status=status.HTTP_400_BAD_REQUEST
            )

        first_day = datetime(year, month, 1).date()
        if month == 12:
            last_day = (
                datetime(year + 1, 1, 1).date() - 
                timedelta(days=1)
            )
        else:
            last_day = (
                datetime(year, month + 1, 1).date() - 
                timedelta(days=1)
            )

        festivals = Festival.objects.filter(
            start_date__lte=last_day,
            end_date__gte=first_day
        ).order_by('start_date')

        serializer = self.get_serializer(festivals, many=True)
        
        return Response({
            'year': year,
            'month': month,
            'month_name': first_day.strftime('%B'),
            'festivals': serializer.data,
            'count': festivals.count()
        })
    
# ==================== API FUNCTIONS ====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def issue_products(request):
    """
    เบิกสินค้าออกจากคลัง
    """
    # ดึง items จาก payload ที่ Frontend ส่งมา
    items = request.data.get("items", [])

    # ถ้าไม่มี items → ส่ง error กลับทันที
    if not isinstance(items, list) or not items:
        return Response(
            {"detail": "items is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    #ถ้า error ตรงไหน → ยกเลิกทั้งหมด
    with transaction.atomic():

        # ── Issue.objects.create() → สร้างใบเบิก 1 ใบ ──
        issue = Issue.objects.create(created_by=request.user)
        updated_products = []

        # วนลูปสินค้าแต่ละรายการที่เบิก
        for it in items:
            pid = int(it.get("product", 0) or 0) # id สินค้า
            qty = int(it.get("qty", 0) or 0)     # จำนวนที่เบิก
            if pid <= 0 or qty <= 0:
                continue # ข้ามถ้าข้อมูลไม่ถูกต้อง

            try:
                # ดึงสินค้าจาก DB พร้อมล็อคไว้ ป้องกันคนอื่นแก้พร้อมกัน
                p = Product.objects.select_for_update().get(
                    id=pid, is_deleted=False
                )
            except ObjectDoesNotExist:
                return Response(
                    {"detail": f"product {pid} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # เช็คสต็อกพอไหม ถ้าไม่พอ → ส่ง error กลับ
            if p.stock < qty:
                return Response(
                    {"detail": f"stock not enough for product {p.code}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # หักสต็อก → product.stock -= qty (บันทึกลง DB)
            p.stock = F("stock") - qty
            p.on_sale = True
            p.save(update_fields=["stock", "on_sale"])

            # ── IssueLine.objects.create() → สร้างรายการเบิกสินค้า ──
            IssueLine.objects.create(issue=issue, product=p, qty=qty)

            # อัปเดต Listing — ถ้ายังไม่มี → สร้างใหม่, ถ้ามีแล้ว → เพิ่ม quantity
            listing, created = Listing.objects.get_or_create(
                product=p,
                defaults={
                    "is_active": True,
                    "title": p.name,
                    "sale_price": p.selling_price,
                    "unit": p.unit,
                    "quantity": qty
                }
            )
            if not created:
                # มี Listing อยู่แล้ว → เพิ่มจำนวน
                listing.quantity = F("quantity") + qty
                listing.is_active = True
                listing.save(update_fields=["quantity", "is_active"])

            # โหลดค่า stock ล่าสุดจาก DB หลังจากหักแล้ว
            p.refresh_from_db(fields=["stock", "on_sale"])
            updated_products.append(p)

            # ── แจ้งเตือน LINE ──────────────────────────────────────
            if LINE_AVAILABLE and line_service:
                try:
                    settings_obj = NotificationSettings.objects.get(
                        user=request.user
                    )
                    user_id = settings_obj.line_user_id

                    if user_id:
                        issued_by = (
                            request.user.get_full_name() or
                            request.user.username
                        )
                        # แจ้งเตือนว่าเบิกสินค้าออก
                        line_service.send_stock_out_notification(
                            user_id, p.name, p.code, qty,
                            p.unit, issued_by
                        )

                        # ถ้าสต็อกหมด → แจ้งเตือนสินค้าหมด
                        if p.stock == 0:
                            line_service.send_out_of_stock_alert(
                                user_id, p.name, p.code
                            )
                        # ถ้าสต็อกใกล้หมด → แจ้งเตือนสินค้าใกล้หมด
                        elif p.stock < 5:
                            line_service.send_low_stock_alert(
                                user_id, p.name, p.code,
                                p.stock, p.unit
                            )
                except Exception as e:
                    print(f"Error sending LINE notification: {e}")

    # ส่งข้อมูลสินค้าที่อัปเดตแล้วกลับไปให้ Frontend พร้อม 201 Created
    return Response(
        ProductSerializer(
            updated_products,
            many=True,
            context={"request": request}
        ).data,
        status=status.HTTP_201_CREATED
    )


@api_view(["POST", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def product_unlist(request, pk: int):
    try:
        product = Product.objects.get(pk=pk, is_deleted=False)
    except Product.DoesNotExist:
        return Response(
            {"detail": "ไม่พบสินค้า"}, 
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        listing = product.listing
    except Listing.DoesNotExist:
        return Response(
            {"detail": "สินค้านี้ยังไม่มีรายการในหน้าแสดง"}, 
            status=status.HTTP_404_NOT_FOUND
        )

    listing.delete()
    if product.on_sale:
        product.on_sale = False
        product.save(update_fields=["on_sale"])

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def movement_history(request):
    """
    ประวัติการเคลื่อนไหวสินค้า
    """
    from django.db.models import Q
    from .models import Issue, Product
    
    search = request.query_params.get('search', '')
    start_date = request.query_params.get('start_date', '')
    end_date = request.query_params.get('end_date', '')
    movement_type = request.query_params.get('type', 'all')
    limit = int(request.query_params.get('limit', 50))
    
    movements = []
    
    def get_profile_image_url(user):
        if not user:
            return None
        for field_name in ['profile_image', 'avatar']:
            if hasattr(user, field_name):
                field = getattr(user, field_name)
                if field:
                    try:
                        return request.build_absolute_uri(field.url)
                    except:
                        pass
        if hasattr(user, 'profile') and hasattr(user.profile, 'image'):
            if user.profile.image:
                try:
                    return request.build_absolute_uri(user.profile.image.url)
                except:
                    pass
        return None
    
    def get_user_display_name(user):
        if not user:
            return 'ไม่ระบุ'
        full_name = user.get_full_name()
        if full_name and full_name.strip():
            return full_name
        return user.username
    
    if movement_type in ['all', 'out']:
        issues = Issue.objects.select_related(
            'created_by'
        ).prefetch_related(
            'lines__product'
        ).order_by('-created_at')
        
        if start_date:
            issues = issues.filter(created_at__date__gte=start_date)
        if end_date:
            issues = issues.filter(created_at__date__lte=end_date)
        
        for issue in issues:
            for line in issue.lines.all():
                if search:
                    if (search.lower() not in line.product.name.lower() and 
                        search.lower() not in line.product.code.lower()):
                        continue
                
                user = issue.created_by
                movements.append({
                    'id': f'out-{issue.id}-{line.id}',
                    'date': issue.created_at.isoformat(),
                    'code': line.product.code,
                    'name': line.product.name,
                    'type': 'out',
                    'qty': line.qty,
                    'unit': line.product.unit,
                    'created_by_name': get_user_display_name(user),
                    'created_by_username': user.username if user else None,
                    'profile_image': get_profile_image_url(user),
                })
    
    if movement_type in ['all', 'in']:
        products = Product.objects.filter(
            is_deleted=False,
            initial_stock__gt=0
        ).select_related('created_by').order_by('-created_at')
        
        if search:
            products = products.filter(
                Q(name__icontains=search) | Q(code__icontains=search)
            )
        if start_date:
            products = products.filter(created_at__date__gte=start_date)
        if end_date:
            products = products.filter(created_at__date__lte=end_date)
        
        for product in products:
            user = product.created_by if hasattr(product, 'created_by') else None
            movements.append({
                'id': f'in-{product.id}',
                'date': product.created_at.isoformat(),
                'code': product.code,
                'name': product.name,
                'type': 'in',
                'qty': product.initial_stock,
                'unit': product.unit,
                'created_by_name': get_user_display_name(user),
                'created_by_username': user.username if user else None,
                'profile_image': get_profile_image_url(user),
            })
    
    movements.sort(key=lambda x: x['date'], reverse=True)
    total = len(movements)
    movements = movements[:limit]
    
    return Response({
        'movements': movements,
        'total': total,
        'showing': len(movements)
    })


# ==================== LINE MESSAGING API ====================

# ==================== LINE WEBHOOK ====================

@csrf_exempt
def line_webhook(request):
    # รับ POST จาก LINE Server เมื่อมีคนส่งข้อความมาหา Bot
    if not LINE_AVAILABLE:
        return HttpResponseBadRequest("LINE SDK not available")
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST allowed")

    # ตรวจสอบ signature ว่ามาจาก LINE จริงไหม
    signature = request.META.get('HTTP_X_LINE_SIGNATURE', '')
    body = request.body.decode('utf-8')

    try:
        # ส่งให้ handler จัดการ → เรียก handle_text_message()
        line_service.handler.handle(body, signature)
    except InvalidSignatureError:
        return HttpResponseBadRequest("Invalid signature") # signature ไม่ถูกต้อง
    except Exception as e:
        return HttpResponseBadRequest()

    return HttpResponse('OK')


if LINE_AVAILABLE and line_service:
    @line_service.handler.add(MessageEvent, message=TextMessage)
    def handle_text_message(event):
        # เรียกทุกครั้งที่มีคนส่งข้อความมาหา Bot
        user_id = event.source.user_id   # LINE user id ของคนที่ส่ง
        text = event.message.text.strip() # ข้อความที่ส่งมา

        # ── กรณีที่ 1: พิมพ์รหัส 6 หลัก ──
        if len(text) == 6 and text.isdigit():
            try:
                # หา NotificationSettings ที่มี verification_code ตรงกัน
                settings_obj = NotificationSettings.objects.get(verification_code=text)
                settings_obj.line_user_id = user_id   # บันทึก line_user_id
                settings_obj.verification_code = None  # ล้างรหัสทิ้ง
                settings_obj.save()
                line_service.send_text_message(user_id, "✅ เชื่อมต่อสำเร็จ!")
            except NotificationSettings.DoesNotExist:
                line_service.send_text_message(user_id, "❌ รหัสไม่ถูกต้อง หรือหมดอายุแล้ว")
            return

        # ── กรณีที่ 2: พิมพ์ "เชื่อม username" ──
        if text.startswith('เชื่อม ') or text.startswith('เชื่อม'):
            parts = text.split(maxsplit=1)
            if len(parts) == 2:
                username = parts[1].strip()
                try:
                    # หา user จาก username ที่พิมพ์มา
                    target_user = User.objects.get(username=username)

                    # สร้างหรือดึง NotificationSettings ของ user นั้น
                    settings_obj, created = NotificationSettings.objects.get_or_create(
                        user=target_user
                    )
                    settings_obj.line_user_id = user_id  # บันทึก line_user_id
                    settings_obj.verification_code = None
                    settings_obj.save()

                    # ดึงชื่อ LINE จาก profile
                    display_name = "คุณ"
                    try:
                        profile = line_service.line_bot_api.get_profile(user_id)
                        display_name = profile.display_name
                    except:
                        pass

                    line_service.send_text_message(user_id, f"✅ เชื่อมต่อสำเร็จ! สวัสดี {display_name}")
                    return

                except User.DoesNotExist:
                    line_service.send_text_message(user_id, f"❌ ไม่พบผู้ใช้ '{username}'")
                    return
            else:
                line_service.send_text_message(user_id, "📝 กรุณาพิมพ์: เชื่อม [username]")
                return

        # ── กรณีที่ 3: พิมพ์คำขอรหัส/help ──
        triggers = ['ขอรหัส', 'รหัส', 'code', 'id', 'userid', 'help', 'ช่วย']
        if any(keyword in text.lower() for keyword in triggers):
            line_service.send_text_message(user_id, f"🆔 User ID: {user_id}\nพิมพ์: เชื่อม [username]")
        else:
            # ── กรณีอื่นๆ: แนะนำวิธีใช้ ──
            line_service.send_text_message(user_id, "สวัสดีครับ! พิมพ์: เชื่อม [username]")


# ==================== FBV LINE ENDPOINTS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connection_code(request):
    # GET /line/get-connection-code/ → ดึงรหัส 6 หลักสำหรับเชื่อมต่อ
    settings_obj, created = NotificationSettings.objects.get_or_create(user=request.user)

    if settings_obj.line_user_id:
        return Response({"connected": True}) # เชื่อมต่อแล้ว

    # ถ้ายังไม่มีรหัส → สร้างรหัส 6 หลักใหม่
    if not settings_obj.verification_code:
        settings_obj.verification_code = ''.join(random.choices(string.digits, k=6))
        settings_obj.save()

    return Response({"connected": False, "code": settings_obj.verification_code})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_line_user_id(request):
    # GET /line/get-user-id/ → เช็คว่า user เชื่อมต่อ LINE แล้วไหม
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        has_id = bool(settings_obj.line_user_id) # มี → True / ไม่มี → False
        return Response({"has_user_id": has_id, "masked_user_id": "CONNECTED" if has_id else ""})
    except NotificationSettings.DoesNotExist:
        return Response({"has_user_id": False, "masked_user_id": ""})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connected_users(request):
    # GET /line/connected-users/ → ดึงรายชื่อทุกคนที่เชื่อมต่อ LINE แล้ว
    connected_settings = NotificationSettings.objects.filter(
        line_user_id__isnull=False  # มี line_user_id
    ).exclude(line_user_id='').select_related('user')

    users = []
    for setting in connected_settings:
        user_data = {
            'id': setting.user.id,
            'username': setting.user.username,
            'email': setting.user.email,
            'display_name': None,
            'picture_url': None,
        }

        # ดึง display_name และ picture_url จาก LINE API
        if LINE_AVAILABLE and line_service:
            try:
                profile_result = line_service.get_profile(setting.line_user_id)
                if profile_result.get('success'):
                    user_data['display_name'] = profile_result['data'].get('display_name')
                    user_data['picture_url']  = profile_result['data'].get('picture_url')
            except Exception as e:
                print(f"Error getting profile: {e}")

        # ถ้าไม่มีชื่อจาก LINE → ใช้ชื่อจาก DB แทน
        if not user_data['display_name']:
            user_data['display_name'] = setting.user.get_full_name() or setting.user.username

        users.append(user_data)

    return Response({'count': len(users), 'users': users})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_to_selected_users(request):
    # POST /line/send-to-users/ → ส่งข้อความหาผู้รับที่เลือก
    if not LINE_AVAILABLE or not line_service:
        return Response({"error": "LINE service unavailable"}, status=503)

    user_ids = request.data.get('user_ids', [])  # รายชื่อผู้รับที่เลือก
    message  = request.data.get('message', '🔔 ข้อความจากระบบ EasyStock')

    if not user_ids:
        return Response({"error": "No users selected"}, status=400)

    sent_count = 0
    failed_count = 0
    errors = []

    # วนลูปส่งข้อความทีละคน
    for user_id in user_ids:
        try:
            setting = NotificationSettings.objects.get(user_id=user_id)
            if setting.line_user_id:
                result = line_service.send_text_message(setting.line_user_id, message)
                if result.get('success'):
                    sent_count += 1  # ส่งสำเร็จ
                else:
                    failed_count += 1
                    errors.append(f"User {user_id}: {result.get('error')}")
            else:
                failed_count += 1
                errors.append(f"User {user_id}: No LINE ID")
        except NotificationSettings.DoesNotExist:
            failed_count += 1

    return Response({'success': True, 'sent_count': sent_count, 'failed_count': failed_count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def broadcast_message(request):
    # POST /line/broadcast/ → ส่งข้อความหาทุกคนที่เชื่อมต่อ LINE
    if not LINE_AVAILABLE or not line_service:
        return Response({"error": "LINE service unavailable"}, status=503)

    message = request.data.get('message')
    if not message:
        return Response({"error": "Message is required"}, status=400)

    # ดึงทุกคนที่มี line_user_id
    connected_settings = NotificationSettings.objects.filter(
        line_user_id__isnull=False
    ).exclude(line_user_id='')

    sent_count = 0
    failed_count = 0

    # วนลูปส่งหาทุกคน
    for setting in connected_settings:
        try:
            result = line_service.send_text_message(setting.line_user_id, message)
            if result.get('success'):
                sent_count += 1
            else:
                failed_count += 1
        except Exception as e:
            failed_count += 1

    return Response({'success': True, 'sent_count': sent_count, 'failed_count': failed_count, 'total': connected_settings.count()})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_line_user_id(request):
    # DELETE /line/delete-user-id/ → ยกเลิกการเชื่อมต่อ LINE ของตัวเอง
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        settings_obj.line_user_id = None  # ลบ line_user_id ออก
        settings_obj.save()
    except NotificationSettings.DoesNotExist:
        pass
    return Response({"success": True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_message(request):
    # POST /line/send-test/ → ส่งข้อความทดสอบหาตัวเอง
    if not LINE_AVAILABLE or not line_service:
        return Response({"error": "LINE service unavailable"}, status=503)
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        if not settings_obj.line_user_id:
            return Response({"error": "LINE not connected"}, status=400)
        result = line_service.send_test_message(settings_obj.line_user_id)
        if result.get('success'):
            return Response({"success": True, "message": "Test message sent"})
        else:
            return Response({"error": result.get('error')}, status=500)
    except NotificationSettings.DoesNotExist:
        return Response({"error": "Notification settings not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_low_stock_alerts(request):
    # POST /line/send-low-stock/ → ส่งแจ้งเตือนสินค้าใกล้หมดหาตัวเอง
    if not LINE_AVAILABLE:
        return Response({"error": "Service unavailable"}, status=503)
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        if not settings_obj.line_user_id:
            return Response({"error": "No Line ID"}, status=400)

        # ดึงสินค้าที่ stock < 5 ทั้งหมด
        low_stock = Product.objects.filter(is_deleted=False, stock__lt=5, stock__gt=0)
        cnt = 0
        for p in low_stock:
            res = line_service.send_low_stock_alert(
                settings_obj.line_user_id, p.name, p.code, p.stock, p.unit
            )
            if res.get('success'):
                cnt += 1
        return Response({"success": True, "count": cnt})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_line_profile(request):
    # GET /line/profile/ → ดึงข้อมูล LINE profile ของตัวเอง
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        if not settings_obj.line_user_id:
            return Response({"error": "No ID"}, status=400)
        res = line_service.get_profile(settings_obj.line_user_id)
        return Response(res['data'] if res.get('success') else res)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# ==================== TOP PRODUCTS (สินค้าขายดี) ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def top_products(request):
    """
    สินค้าขายดี - ดึงจากยอดเบิกจริงใน IssueLine
    """
    period = request.query_params.get('period', 'month')
    limit = int(request.query_params.get('limit', 10))
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    min_qty = int(request.query_params.get('min_qty', 25))

    if limit < 1 or limit > 100:
        limit = 10

    today = timezone.now().date()

    period_map = {
        'all': None,
        'year': today - timedelta(days=365),
        'month': today - timedelta(days=30),
        '1days': timezone.now() - timedelta(hours=24),
        '7days': today - timedelta(days=7),
    }

    if period == 'custom' and start_date_str and end_date_str:
        try:
            from datetime import datetime as dt
            start_date = dt.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = dt.strptime(end_date_str, '%Y-%m-%d').date()
            
            end_datetime = timezone.make_aware(dt.combine(end_date, dt.max.time()))
            start_datetime = timezone.make_aware(dt.combine(start_date, dt.min.time()))
            
            issue_data = IssueLine.objects.filter(
                issue__created_at__gte=start_datetime,
                issue__created_at__lte=end_datetime
            )
        except Exception as e:
            print(f"Error parsing custom dates: {e}")
            issue_data = IssueLine.objects.all()
    else:
        start_datetime = period_map.get(period)

        if start_datetime:
            if period == '1days':
                issue_data = IssueLine.objects.filter(
                    issue__created_at__gte=start_datetime
                )
            else:
                issue_data = IssueLine.objects.filter(
                    issue__created_at__date__gte=start_datetime
                )
        else:
            issue_data = IssueLine.objects.all()

    top_products_data = issue_data.values('product').annotate(
        total_issued=Sum('qty'),
        transactions=Count('id')
    ).filter(
        total_issued__gte=min_qty
    ).order_by('-total_issued')[:limit]

    results = []
    for idx, tp in enumerate(top_products_data, 1):
        try:
            product = Product.objects.get(id=tp['product'])
            results.append({
                'rank': idx,
                'product': {
                    'id': product.id,
                    'name': product.name,
                    'code': product.code,
                    'category': (
                        product.category.name 
                        if product.category 
                        else None
                    )
                },
                'total_issued': tp['total_issued'],
                'transactions': tp['transactions'],
                'period': period
            })
        except Product.DoesNotExist:
            continue

    return Response({
        'period': period,
        'limit': limit,
        'min_qty': min_qty,
        'count': len(results),
        'results': results
    })
