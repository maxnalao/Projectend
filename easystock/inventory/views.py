
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
    Festival, BestSeller, Task, CustomEvent
)

from .serializers import (
    ProductSerializer, CategorySerializer, ListingSerializer,
    FestivalSerializer, BestSellerSerializer, BestSellerDetailSerializer,
    FestivalWithBestSellersSerializer, TaskSerializer, UserSerializer,
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
        return Response(
            {"detail": "ไม่อนุญาตให้ลบสินค้าในคลังผ่านหน้านี้"}, 
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )


# ==================== CATEGORY VIEWSET ====================

class CategoryViewSet(viewsets.ModelViewSet):
    """
    จัดการหมวดหมู่สินค้า
    """
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]


# ==================== LISTING VIEWSET ====================

class ListingViewSet(viewsets.ModelViewSet):
    """
    จัดการสินค้าที่แสดงขาย
    """
    queryset = Listing.objects.select_related(
        "product", "product__category"
    ).filter(product__is_deleted=False)
    serializer_class = ListingSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser] 
    http_method_names = ["get", "patch", "post", "delete"]

    def get_queryset(self):
        qs = super().get_queryset().order_by("-id")
        active = self.request.query_params.get("active", "1")
        if str(active).lower() in ("1", "true", "yes"):
            qs = qs.filter(is_active=True)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(product__name__icontains=search) |
                Q(product__code__icontains=search) |
                Q(title__icontains=search)
            )

        cat = self.request.query_params.get("category")
        if cat:
            if str(cat).isdigit():
                qs = qs.filter(product__category_id=int(cat))
            else:
                qs = qs.filter(product__category__name=cat)
        return qs

    def perform_update(self, serializer):
        instance = self.get_object()
        serializer.save(product=instance.product)

    @action(detail=True, methods=["post", "patch"])
    def unlist(self, request, pk=None):
        obj = self.get_object()
        if obj.is_active:
            obj.is_active = False
            obj.save(update_fields=["is_active"])
        return Response(self.get_serializer(obj).data)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== TASK VIEWSET ====================

class TaskViewSet(viewsets.ModelViewSet):
    """
    จัดการงานที่มอบหมาย
    """
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return Task.objects.all().order_by('-due_date')
        else:
            return Task.objects.filter(
                assigned_to=user
            ).order_by('-due_date')
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        user = request.user
        tasks = Task.objects.filter(
            assigned_to=user
        ).order_by('-due_date')
        
        pending = tasks.filter(status='pending')
        in_progress = tasks.filter(status='in_progress')
        completed = tasks.filter(status='completed')
        
        return Response({
            'pending': TaskSerializer(pending, many=True).data,
            'in_progress': TaskSerializer(in_progress, many=True).data,
            'completed': TaskSerializer(completed, many=True).data,
            'total': tasks.count()
        })
    
    @action(detail=False, methods=['get'])
    def urgent_tasks(self, request):
        user = request.user
        tasks = Task.objects.filter(
            assigned_to=user,
            priority__in=['high', 'urgent'],
            status__in=['pending', 'in_progress']
        ).order_by('due_date')
        
        return Response({
            'count': tasks.count(),
            'tasks': TaskSerializer(tasks, many=True).data
        })
    
    @action(detail=True, methods=['post', 'patch'])
    def update_status(self, request, pk=None):
        task = self.get_object()
        status_choice = request.data.get('status')
        notes = request.data.get('notes', '')
        
        if status_choice in dict(Task.STATUS_CHOICES):
            task.status = status_choice
            if notes:
                current_notes = task.notes or ''
                task.notes = (
                    f"{current_notes}\n"
                    f"[{timezone.now()}] {notes}"
                )
            
            task.save()
            return Response(TaskSerializer(task).data)
        else:
            return Response(
                {'error': 'Invalid status'}, 
                status=400
            )

# ==================== API FUNCTIONS ====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def issue_products(request):
    """
    เบิกสินค้าออกจากคลัง
    """
    items = request.data.get("items", [])
    if not isinstance(items, list) or not items:
        return Response(
            {"detail": "items is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    with transaction.atomic():
        issue = Issue.objects.create(created_by=request.user)
        updated_products = []

        for it in items:
            pid = int(it.get("product", 0) or 0)
            qty = int(it.get("qty", 0) or 0)
            if pid <= 0 or qty <= 0:
                continue

            try:
                p = Product.objects.select_for_update().get(
                    id=pid, is_deleted=False
                )
            except ObjectDoesNotExist:
                return Response(
                    {"detail": f"product {pid} not found"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            if p.stock < qty:
                return Response(
                    {"detail": f"stock not enough for product {p.code}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            p.stock = F("stock") - qty
            p.on_sale = True
            p.save(update_fields=["stock", "on_sale"])

            IssueLine.objects.create(issue=issue, product=p, qty=qty)

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
                listing.quantity = F("quantity") + qty
                listing.is_active = True
                listing.save(update_fields=["quantity", "is_active"])

            p.refresh_from_db(fields=["stock", "on_sale"])
            updated_products.append(p)
            
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
                        line_service.send_stock_out_notification(
                            user_id, p.name, p.code, qty, 
                            p.unit, issued_by
                        )

                        if p.stock == 0:
                            line_service.send_out_of_stock_alert(
                                user_id, p.name, p.code
                            )
                        elif p.stock < 5:
                            line_service.send_low_stock_alert(
                                user_id, p.name, p.code, 
                                p.stock, p.unit
                            )
                except Exception as e:
                    print(f"Error sending LINE notification: {e}")

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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    สถิติแดชบอร์ด
    """
    from zoneinfo import ZoneInfo
    from datetime import time
    
    bangkok_tz = ZoneInfo('Asia/Bangkok')
    now = timezone.now().astimezone(bangkok_tz)
    today = now.date()
    start = datetime.combine(today, time.min, tzinfo=bangkok_tz)
    end = datetime.combine(today, time.max, tzinfo=bangkok_tz)

    products = Product.objects.filter(is_deleted=False)
    total_stock = products.aggregate(total=Sum("stock"))["total"] or 0
    
    low_qs = Product.objects.filter(
        is_deleted=False, stock__gt=0, stock__lt=5
    )
    in_today = Product.objects.filter(
        is_deleted=False, 
        created_at__gte=start, 
        created_at__lte=end
    ).count()
    out_today = IssueLine.objects.filter(
        issue__created_at__gte=start, 
        issue__created_at__lte=end
    ).aggregate(total=Sum("qty"))["total"] or 0

    total_inventory_value = 0
    for p in products:
        price = float(p.selling_price) if p.selling_price else 0
        total_inventory_value += price * p.stock

    low_items = []
    for p in low_qs.order_by("stock")[:10]:
        img = (
            request.build_absolute_uri(p.image.url) 
            if p.image 
            else None
        )
        low_items.append({
            "id": p.id, 
            "code": p.code, 
            "name": p.name, 
            "stock": p.stock, 
            "unit": p.unit, 
            "image_url": img
        })

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
            'id': f'out_{l.id}', 
            'date': l.issue.created_at.isoformat(), 
            'code': l.product.code, 
            'name': l.product.name, 
            'type': 'out', 
            'qty': l.qty
        })
    
    received = Product.objects.filter(
        is_deleted=False, 
        created_at__gte=start, 
        created_at__lte=end
    )
    for p in received:
        all_mv.append({
            'datetime': p.created_at, 
            'id': f'in_{p.id}', 
            'date': p.created_at.isoformat(), 
            'code': p.code, 
            'name': p.name, 
            'type': 'in', 
            'qty': p.initial_stock or p.stock
        })
    
    all_mv.sort(key=lambda x: x['datetime'], reverse=True)
    movements = [
        {
            'id': m['id'], 
            'date': m['date'], 
            'code': m['code'], 
            'name': m['name'], 
            'type': m['type'], 
            'qty': m['qty']
        } 
        for m in all_mv[:20]
    ]

    cats = Product.objects.filter(is_deleted=False).values(
        'category__name'
    ).annotate(
        count=Count('id'), 
        total_stock=Sum('stock')
    ).order_by('-count')
    
    cat_list = [
        {
            'category': c['category__name'] or 'ไม่ระบุ', 
            'count': c['count'], 
            'total_stock': c['total_stock'] or 0
        } 
        for c in cats
    ]

    return Response({
        "total_products": total_stock,
        "low_stock_count": low_qs.count(),
        "in_today": in_today, 
        "out_today": out_today,
        "total_inventory_value": round(total_inventory_value, 2),
        "low_stock_items": low_items, 
        "movements": movements, 
        "category_stats": cat_list
    })


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
        
        # ตรวจสอบ field ต่างๆ ที่อาจเก็บรูป profile
        for field_name in ['profile_image', 'avatar']:
            if hasattr(user, field_name):
                field = getattr(user, field_name)
                if field:
                    try:
                        return request.build_absolute_uri(field.url)
                    except:
                        pass
        
        # ตรวจสอบ related profile model
        if hasattr(user, 'profile') and hasattr(user.profile, 'image'):
            if user.profile.image:
                try:
                    return request.build_absolute_uri(
                        user.profile.image.url
                    )
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
            user = (
                product.created_by 
                if hasattr(product, 'created_by') 
                else None
            )
            
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

@csrf_exempt
def line_webhook(request):
    print("🔥 WEBHOOK CALLED!")
    
    if not LINE_AVAILABLE: 
        return HttpResponseBadRequest("LINE SDK not available")
    
    if request.method != 'POST':
        return HttpResponseBadRequest("Only POST allowed")
    
    signature = request.META.get('HTTP_X_LINE_SIGNATURE', '')
    body = request.body.decode('utf-8')
    
    print(f"📩 Body: {body[:200]}")
    
    try:
        line_service.handler.handle(body, signature)
    except InvalidSignatureError:
        print("❌ Invalid signature")
        return HttpResponseBadRequest("Invalid signature")
    except Exception as e:
        print(f"❌ Webhook error: {e}")
        return HttpResponseBadRequest()
    
    return HttpResponse('OK')


if LINE_AVAILABLE and line_service:
    @line_service.handler.add(MessageEvent, message=TextMessage)
    def handle_text_message(event):
        print("📩 MESSAGE RECEIVED!")
        print(f"Text: {event.message.text}")
        print(f"User ID: {event.source.user_id}")
        
        user_id = event.source.user_id
        text = event.message.text.strip()
        
        if len(text) == 6 and text.isdigit():
            try:
                settings_obj = NotificationSettings.objects.get(
                    verification_code=text
                )
                settings_obj.line_user_id = user_id
                settings_obj.verification_code = None
                settings_obj.save()
                
                line_service.send_text_message(
                    user_id,
                    f"✅ เชื่อมต่อสำเร็จ!\n"
                    f"สวัสดีคุณ {settings_obj.user.username}\n"
                    f"ระบบพร้อมแจ้งเตือนแล้วครับ"
                )
            except NotificationSettings.DoesNotExist:
                line_service.send_text_message(
                    user_id, 
                    "❌ รหัสไม่ถูกต้อง หรือหมดอายุแล้ว"
                )
            return
        if text.startswith('เชื่อม ') or text.startswith('เชื่อม'):
            parts = text.split(maxsplit=1)
            if len(parts) == 2:
                username = parts[1].strip()
                
                try:
                    target_user = User.objects.get(username=username)
                    
                    settings_obj, created = (
                        NotificationSettings.objects.get_or_create(
                            user=target_user
                        )
                    )
                    
                    settings_obj.line_user_id = user_id
                    settings_obj.verification_code = None
                    settings_obj.save()
                    
                    display_name = "คุณ"
                    try:
                        profile = line_service.line_bot_api.get_profile(
                            user_id
                        )
                        display_name = profile.display_name
                    except:
                        pass
                    
                    line_service.send_text_message(
                        user_id,
                        f"""✅ เชื่อมต่อสำเร็จ!

สวัสดี คุณ {display_name} 😊
นี่คือบัญชีทางการของ ร้านทองศูนย์

เราจะส่งข่าวสารล่าสุดผ่านบัญชีทางการนี้เป็นระยะ ❤️
เตรียมรับได้เลย! 🎁🎉✨

📱 บัญชี: {target_user.username}
🔔 ระบบพร้อมแจ้งเตือนแล้ว!"""
                    )
                    return
                    
                except User.DoesNotExist:
                    line_service.send_text_message(
                        user_id,
                        f"❌ ไม่พบผู้ใช้ '{username}' ในระบบ\n"
                        f"กรุณาตรวจสอบ username อีกครั้ง"
                    )
                    return
            else:
                line_service.send_text_message(
                    user_id,
                    "📝 กรุณาพิมพ์: เชื่อม [username]\n"
                    "ตัวอย่าง: เชื่อม maxnalao11"
                )
                return

        triggers = [
            'ขอรหัส', 'รหัส', 'code', 'id', 
            'userid', 'help', 'ช่วย'
        ]
        
        if any(keyword in text.lower() for keyword in triggers):
            msg = (
                f"🆔 User ID ของคุณคือ:\n{user_id}\n\n"
                "📋 วิธีเชื่อมต่อระบบ:\n"
                "พิมพ์: เชื่อม [username ของคุณ]\n"
                "ตัวอย่าง: เชื่อม maxnalao11"
            )
            line_service.send_text_message(user_id, msg)
        else:
            line_service.send_text_message(
                user_id, 
                "สวัสดีครับ! 👋\n\n"
                "วิธีเชื่อมต่อระบบ:\n"
                "พิมพ์: เชื่อม [username]\n"
                "ตัวอย่าง: เชื่อม maxnalao11"
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connection_code(request):
    try:
        settings_obj, created = (
            NotificationSettings.objects.get_or_create(
                user=request.user
            )
        )
        
        if settings_obj.line_user_id:
            return Response({"connected": True})
            
        if not settings_obj.verification_code:
            settings_obj.verification_code = ''.join(
                random.choices(string.digits, k=6)
            )
            settings_obj.save()
        
        return Response({
            "connected": False, 
            "code": settings_obj.verification_code
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_line_user_id(request):
    try:
        settings_obj = NotificationSettings.objects.get(
            user=request.user
        )
        has_id = bool(settings_obj.line_user_id)
        return Response({
            "has_user_id": has_id, 
            "masked_user_id": "CONNECTED" if has_id else ""
        })
    except NotificationSettings.DoesNotExist:
        return Response({
            "has_user_id": False, 
            "masked_user_id": ""
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connected_users(request):
    try:
        connected_settings = NotificationSettings.objects.filter(
            line_user_id__isnull=False
        ).exclude(line_user_id='').select_related('user')
        
        users = []
        for setting in connected_settings:
            user_data = {
                'id': setting.user.id,
                'username': setting.user.username,
                'email': setting.user.email,
                'display_name': None,
                'picture_url': None,
                'connected_at': (
                    setting.updated_at.isoformat() 
                    if hasattr(setting, 'updated_at') 
                    else None
                )
            }
            
            if LINE_AVAILABLE and line_service:
                try:
                    profile_result = line_service.get_profile(
                        setting.line_user_id
                    )
                    if profile_result.get('success'):
                        user_data['display_name'] = (
                            profile_result['data'].get('display_name')
                        )
                        user_data['picture_url'] = (
                            profile_result['data'].get('picture_url')
                        )
                except Exception as e:
                    print(
                        f"Error getting profile for "
                        f"{setting.user.username}: {e}"
                    )
            
            if not user_data['display_name']:
                user_data['display_name'] = (
                    setting.user.get_full_name() or 
                    setting.user.username
                )
            
            users.append(user_data)
        
        return Response({
            'count': len(users),
            'users': users
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_to_selected_users(request):
    if not LINE_AVAILABLE or not line_service:
        return Response(
            {"error": "LINE service unavailable"}, 
            status=503
        )
    
    user_ids = request.data.get('user_ids', [])
    message = request.data.get(
        'message', 
        '🔔 ข้อความจากระบบ EasyStock'
    )
    
    if not user_ids:
        return Response(
            {"error": "No users selected"}, 
            status=400
        )
    
    sent_count = 0
    failed_count = 0
    errors = []
    
    for user_id in user_ids:
        try:
            setting = NotificationSettings.objects.get(user_id=user_id)
            
            if setting.line_user_id:
                result = line_service.send_text_message(
                    setting.line_user_id, message
                )
                if result.get('success'):
                    sent_count += 1
                else:
                    failed_count += 1
                    errors.append(
                        f"User {user_id}: {result.get('error')}"
                    )
            else:
                failed_count += 1
                errors.append(f"User {user_id}: No LINE ID")
                
        except NotificationSettings.DoesNotExist:
            failed_count += 1
            errors.append(f"User {user_id}: Settings not found")
        except Exception as e:
            failed_count += 1
            errors.append(f"User {user_id}: {str(e)}")
    
    return Response({
        'success': True,
        'sent_count': sent_count,
        'failed_count': failed_count,
        'errors': errors if errors else None
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def broadcast_message(request):
    if not LINE_AVAILABLE or not line_service:
        return Response(
            {"error": "LINE service unavailable"}, 
            status=503
        )
    
    message = request.data.get('message')
    
    if not message:
        return Response(
            {"error": "Message is required"}, 
            status=400
        )
    
    connected_settings = NotificationSettings.objects.filter(
        line_user_id__isnull=False
    ).exclude(line_user_id='')
    
    sent_count = 0
    failed_count = 0
    
    for setting in connected_settings:
        try:
            result = line_service.send_text_message(
                setting.line_user_id, message
            )
            if result.get('success'):
                sent_count += 1
            else:
                failed_count += 1
        except Exception as e:
            failed_count += 1
            print(
                f"Broadcast error for user "
                f"{setting.user.username}: {e}"
            )
    
    return Response({
        'success': True,
        'sent_count': sent_count,
        'failed_count': failed_count,
        'total': connected_settings.count()
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_line_user_id(request):
    try:
        settings_obj = NotificationSettings.objects.get(
            user=request.user
        )
        settings_obj.line_user_id = None
        settings_obj.save()
    except NotificationSettings.DoesNotExist: 
        pass
    return Response({"success": True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_message(request):
    if not LINE_AVAILABLE or not line_service:
        return Response(
            {"error": "LINE service unavailable"}, 
            status=503
        )
    
    try:
        settings_obj = NotificationSettings.objects.get(
            user=request.user
        )
        
        if not settings_obj.line_user_id:
            return Response(
                {"error": "LINE not connected"}, 
                status=400
            )
        
        result = line_service.send_test_message(
            settings_obj.line_user_id
        )
        
        if result.get('success'):
            return Response({
                "success": True, 
                "message": "Test message sent"
            })
        else:
            return Response(
                {"error": result.get('error')}, 
                status=500
            )
            
    except NotificationSettings.DoesNotExist:
        return Response(
            {"error": "Notification settings not found"}, 
            status=404
        )
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_low_stock_alerts(request):
    if not LINE_AVAILABLE: 
        return Response(
            {"error": "Service unavailable"}, 
            status=503
        )
    
    try:
        settings_obj = NotificationSettings.objects.get(
            user=request.user
        )
        
        if not settings_obj.line_user_id: 
            return Response(
                {"error": "No Line ID"}, 
                status=400
            )
        
        low_stock = Product.objects.filter(
            is_deleted=False, stock__lt=5, stock__gt=0
        )
        cnt = 0
        
        for p in low_stock:
            res = line_service.send_low_stock_alert(
                settings_obj.line_user_id, 
                p.name, p.code, p.stock, p.unit
            )
            if res.get('success'): 
                cnt += 1
        
        return Response({"success": True, "count": cnt})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_line_profile(request):
    try:
        settings_obj = NotificationSettings.objects.get(
            user=request.user
        )
        
        if not settings_obj.line_user_id: 
            return Response(
                {"error": "No ID"}, 
                status=400
            )
        
        res = line_service.get_profile(settings_obj.line_user_id)
        
        return Response(
            res['data'] if res.get('success') else res
        )
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ==================== FESTIVAL VIEWSET ====================

class FestivalViewSet(viewsets.ModelViewSet):
    """
    จัดการเทศกาล
    """
    queryset = Festival.objects.all()
    serializer_class = FestivalSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'with_best_sellers':
            return FestivalWithBestSellersSerializer
        elif self.action == 'retrieve':
            return FestivalWithBestSellersSerializer
        return FestivalSerializer

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

    @action(detail=False, methods=['get'])
    def with_best_sellers(self, request):
        festivals = Festival.objects.prefetch_related(
            'best_sellers'
        ).all()
        serializer = self.get_serializer(festivals, many=True)
        return Response({
            'count': festivals.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['get'])
    def best_sellers(self, request, pk=None):
        festival = self.get_object()
        best_sellers = BestSeller.objects.filter(
            festival=festival
        ).order_by('rank')

        serializer = BestSellerDetailSerializer(best_sellers, many=True)
        return Response({
            'festival': FestivalSerializer(festival).data,
            'best_sellers': serializer.data,
            'count': best_sellers.count()
        })


# ==================== BEST SELLER VIEWSET ====================

class BestSellerViewSet(viewsets.ModelViewSet):
    """
    วิเคราะห์สินค้าขายดี
    """
    queryset = BestSeller.objects.all()
    serializer_class = BestSellerSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def top_products(self, request):
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
                start_date = dt.strptime(
                    start_date_str, '%Y-%m-%d'
                ).date()
                end_date = dt.strptime(
                    end_date_str, '%Y-%m-%d'
                ).date()
                
                end_datetime = timezone.make_aware(
                    dt.combine(end_date, dt.max.time())
                )
                start_datetime = timezone.make_aware(
                    dt.combine(start_date, dt.min.time())
                )
                
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

        top_products = issue_data.values('product').annotate(
            total_issued=Sum('qty'),
            transactions=Count('id')
        ).filter(
            total_issued__gte=min_qty
        ).order_by('-total_issued')[:limit]

        results = []
        for idx, tp in enumerate(top_products, 1):
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

    @action(detail=False, methods=['get'])
    def festival_forecast(self, request):
        today = timezone.now().date()

        upcoming_festival = Festival.objects.filter(
            start_date__gte=today
        ).order_by('start_date').first()

        if not upcoming_festival:
            return Response({
                'message': 'No upcoming festival found',
                'today': today
            })

        best_sellers = BestSeller.objects.filter(
            festival=upcoming_festival
        ).order_by('rank')[:10]

        recommendations = []
        for bs in best_sellers:
            suggested_qty = int(bs.last_year_count * 1.1)
            confidence = min(
                90, 50 + abs(bs.percentage_increase)
            )

            recommendations.append({
                'product': {
                    'id': bs.product.id,
                    'name': bs.product.name,
                    'code': bs.product.code,
                    'unit': bs.product.unit
                },
                'last_year_count': bs.last_year_count,
                'suggested_increase': (
                    suggested_qty - bs.last_year_count
                ),
                'suggested_quantity': suggested_qty,
                'percentage_increase': bs.percentage_increase,
                'confidence': confidence,
                'rank': bs.rank
            })

        days_left = (
            upcoming_festival.start_date - today
        ).days

        return Response({
            'upcoming_festival': {
                'id': upcoming_festival.id,
                'name': upcoming_festival.name,
                'icon': upcoming_festival.icon,
                'start_date': upcoming_festival.start_date,
                'end_date': upcoming_festival.end_date,
                'days_left': days_left,
                'duration': upcoming_festival.duration_days
            },
            'recommendations': recommendations,
            'count': len(recommendations),
            'average_confidence': (
                sum([r['confidence'] for r in recommendations]) / 
                len(recommendations) 
                if recommendations 
                else 0
            )
        })

    @action(detail=False, methods=['get'])
    def category_analysis(self, request):
        festival_id = request.query_params.get('festival_id')

        if not festival_id:
            return Response(
                {'error': 'festival_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            festival = Festival.objects.get(id=festival_id)
        except Festival.DoesNotExist:
            return Response(
                {'error': 'Festival not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        best_sellers = BestSeller.objects.filter(
            festival=festival
        ).select_related('product__category')

        analysis = {}
        for bs in best_sellers:
            category_name = (
                bs.product.category.name 
                if bs.product.category 
                else 'Uncategorized'
            )
            if category_name not in analysis:
                analysis[category_name] = {
                    'category': category_name,
                    'products': [],
                    'total_issued': 0,
                    'count': 0
                }
            
            analysis[category_name]['products'].append({
                'name': bs.product.name,
                'code': bs.product.code,
                'total_issued': bs.total_issued,
                'rank': bs.rank
            })
            analysis[category_name]['total_issued'] += bs.total_issued
            analysis[category_name]['count'] += 1

        return Response({
            'festival': FestivalSerializer(festival).data,
            'categories': list(analysis.values()),
            'total_categories': len(analysis)
        })

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        try:
            festival_id = request.data.get('festival_id')
            best_sellers_data = request.data.get('best_sellers', [])

            festival = Festival.objects.get(id=festival_id)
            created_count = 0

            for data in best_sellers_data:
                try:
                    product = Product.objects.get(
                        id=data['product_id']
                    )
                    bs, created = (
                        BestSeller.objects.update_or_create(
                            product=product,
                            festival=festival,
                            defaults={
                                'total_issued': data.get(
                                    'total_issued', 0
                                ),
                                'rank': data.get('rank', 0),
                                'last_year_count': data.get(
                                    'last_year_count', 0
                                ),
                                'this_year_count': data.get(
                                    'total_issued', 0
                                )
                            }
                        )
                    )
                    if created:
                        created_count += 1
                except Product.DoesNotExist:
                    continue

            return Response({
                'festival_id': festival_id,
                'created': created_count,
                'total': len(best_sellers_data)
            }, status=status.HTTP_201_CREATED)

        except Festival.DoesNotExist:
            return Response(
                {'error': 'Festival not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ==================== DASHBOARD VIEWSETS ====================

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
        
        total_products = Product.objects.filter(
            is_deleted=False
        ).count()
        
        low_stock = Product.objects.filter(
            is_deleted=False, stock__gt=0, stock__lt=5
        ).values(
            'id', 'code', 'name', 'stock', 'unit'
        ).order_by('stock')[:10]
        
        today_issued = IssueLine.objects.filter(
            issue__created_at__gte=start,
            issue__created_at__lte=end
        ).aggregate(
            total_qty=Sum('qty'), 
            total_items=Count('id')
        )
        
        upcoming_festivals = Festival.objects.filter(
            start_date__gte=today
        ).order_by('start_date')[:5].values(
            'id', 'name', 'icon', 'start_date'
        )
        
        top_products = IssueLine.objects.filter(
            issue__created_at__gte=start,
            issue__created_at__lte=end
        ).values(
            'product__id', 
            'product__code', 
            'product__name'
        ).annotate(
            qty=Sum('qty')
        ).order_by('-qty')[:5]
        
        return Response({
            'total_products': total_products,
            'low_stock_count': low_stock.count(),
            'low_stock_items': list(low_stock),
            'today_sales': {
                'total_quantity': today_issued['total_qty'] or 0,
                'total_transactions': today_issued['total_items'] or 0,
            },
            'upcoming_festivals': list(upcoming_festivals),
            'top_products_today': list(top_products)
        })


class AdminDashboardViewSet(viewsets.ModelViewSet):
    """
    แดชบอร์ดสำหรับ Admin
    """
    permission_classes = [IsAdmin]
    http_method_names = ['get']
    queryset = Product.objects.none()

    @action(detail=False, methods=['get'])
    def financial(self, request):
        products = Product.objects.filter(is_deleted=False)
        
        total_selling_value = 0
        
        for p in products:
            total_selling_value += float(p.selling_price or 0) * p.stock


        return Response({
            'total_selling_value': total_selling_value,
            'total_products': products.count(),
            'total_stock_items': (
                products.aggregate(Sum('stock'))['stock__sum'] or 0
            )
        })

    @action(detail=False, methods=['get'])
    def category_breakdown(self, request):
        categories = Category.objects.annotate(
            product_count=Count('product'),
            total_stock=Sum('product__stock')
        ).values('id', 'name', 'product_count', 'total_stock')
        
        return Response({
            'categories': list(categories)
        })

    @action(detail=False, methods=['get'])
    def top_products(self, request):
        top_products = Product.objects.filter(
            is_deleted=False, stock__gt=0
        ).annotate(
            inventory_value=F('stock') * F('selling_price')
        ).values(
            'id', 'code', 'name', 'stock', 
            'selling_price', 'category__name'
        ).order_by('-inventory_value')[:20]
        
        return Response({
            'top_products': list(top_products)
        })


# ==================== CUSTOM EVENT VIEWSET ====================

class CustomEventViewSet(viewsets.ModelViewSet):
    """
    ระบบจัดการบันทึกส่วนตัว
    """
    serializer_class = CustomEventSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return CustomEvent.objects.filter(
            Q(created_by=user) | Q(is_shared=True)
        ).distinct()
    
    def perform_create(self, serializer):
        user = self.request.user
        
        if user.is_superuser or user.is_staff:
            serializer.save(
                created_by=user,
                is_shared=True  
            )
        else:
            serializer.save(created_by=user)
    
    def perform_update(self, serializer):
        instance = self.get_object()
        if (instance.created_by != self.request.user and 
            not self.request.user.is_staff):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("คุณไม่มีสิทธิ์แก้ไขรายการนี้")
        serializer.save()
    
    def perform_destroy(self, instance):
        if (instance.created_by != self.request.user and 
            not self.request.user.is_staff):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("คุณไม่มีสิทธิ์ลบรายการนี้")
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def my_events(self, request):
        queryset = CustomEvent.objects.filter(
            created_by=request.user
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def calendar(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        queryset = self.get_queryset()
        
        if year:
            queryset = queryset.filter(date__year=year)
        if month:
            queryset = queryset.filter(date__month=month)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'year': year,
            'month': month,
            'events': serializer.data,
            'count': queryset.count()
        })
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        today = timezone.now().date()
        queryset = self.get_queryset().filter(
            date__gte=today
        ).order_by('date')[:10]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def upcoming_shared(self, request):
        today = timezone.now().date()
        
        queryset = CustomEvent.objects.filter(
            is_shared=True,
            date__gte=today 
        ).select_related('created_by').order_by('date')[:10]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)