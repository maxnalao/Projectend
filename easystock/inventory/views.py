# inventory/views.py (FINAL - COMPLETE WITH PHASE 3A + DASHBOARD + TOP PRODUCTS FIX)
# Copy this ENTIRE file and replace your inventory/views.py completely

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser 
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Count, F, Q
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, HttpResponseBadRequest
from django.conf import settings
import random
import string
from datetime import timedelta, datetime
import logging

# ✅ Import all models (existing + Phase 3A)
from .models import (
    Product, Category, Issue, IssueLine, Listing,
    Festival, BestSeller, FestivalForecast, ForecastProduct
)

# ✅ Import all serializers (existing + Phase 3A)
from .serializers import (
    ProductSerializer, CategorySerializer, ListingSerializer,
    FestivalSerializer, BestSellerSerializer, BestSellerDetailSerializer,
    FestivalForecastSerializer, ForecastProductSerializer,
    FestivalWithBestSellersSerializer
)

# ✅ Import NotificationSettings
try:
    from accounts.models import NotificationSettings
except ImportError:
    NotificationSettings = None
    print("⚠️ Warning: accounts.models.NotificationSettings not found.")

# ✅ Import permissions for Dashboard
try:
    from accounts.permissions import IsAdmin, IsEmployee
except ImportError:
    IsAdmin = IsAuthenticated
    IsEmployee = IsAuthenticated

# ✅ LINE Messaging API Setup
LINE_AVAILABLE = False
line_service = None
logger = logging.getLogger(__name__)

try:
    from linebot.exceptions import InvalidSignatureError
    from linebot.models import MessageEvent, TextMessage
    from .line_messaging import LineMessagingService
    
    # สร้าง LINE Service Instance
    line_service = LineMessagingService(
        channel_access_token=getattr(settings, 'LINE_CHANNEL_ACCESS_TOKEN', ''),
        channel_secret=getattr(settings, 'LINE_CHANNEL_SECRET', '')
    )
    LINE_AVAILABLE = True
except Exception as e:
    print(f"⚠️ LINE SDK initialization error: {e}")


# ==================== EXISTING VIEWSETS ====================

# ---------- Product (สต๊อก) ----------
class ProductViewSet(ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    parser_classes = [MultiPartParser, FormParser] 

    def get_queryset(self):
        qs = Product.objects.select_related("category").filter(is_deleted=False)
        show_empty = self.request.query_params.get("show_empty", "0")
        if str(show_empty).lower() not in ("1", "true", "yes"):
            qs = qs.filter(stock__gt=0)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))

        cat = self.request.query_params.get("category")
        if cat:
            if str(cat).isdigit():
                qs = qs.filter(category_id=int(cat))
            else:
                qs = qs.filter(category__name=cat)
        return qs.order_by("-id")

    def create(self, request, *args, **kwargs):
        """Create product + send LINE notification for stock in"""
        response = super().create(request, *args, **kwargs)
        
        if response.status_code != 201:
            return response
        
        product = Product.objects.get(id=response.data['id'])
        product.initial_stock = product.stock
        product.save(update_fields=['initial_stock'])
        
        if LINE_AVAILABLE and line_service:
            try:
                settings_obj = NotificationSettings.objects.get(user=request.user)
                user_id = settings_obj.line_user_id
                
                if user_id:
                    line_service.send_stock_in_notification(
                        user_id,
                        product.name,
                        product.code,
                        product.stock,
                        product.unit
                    )
            except NotificationSettings.DoesNotExist:
                pass
            except Exception as e:
                print(f"Error sending LINE notification: {e}")
        
        return response

    def update(self, request, *args, **kwargs):
        """Update product + send LINE notification for stock change"""
        
        instance = self.get_object()
        old_stock = instance.stock
        
        response = super().update(request, *args, **kwargs)
        
        if response.status_code != 200:
            return response
        
        new_stock = response.data.get('stock', old_stock)
        stock_change = new_stock - old_stock
        
        if stock_change != 0 and LINE_AVAILABLE and line_service:
            try:
                settings_obj = NotificationSettings.objects.get(user=request.user)
                user_id = settings_obj.line_user_id
                
                if user_id:
                    product = Product.objects.get(id=response.data['id'])
                    updated_by = request.user.get_full_name() or request.user.username
                    
                    if stock_change > 0:
                        line_service.send_stock_in_notification(
                            user_id,
                            product.name,
                            product.code,
                            stock_change,
                            product.unit
                        )
                        
                        if product.stock < 5 and product.stock > 0:
                            line_service.send_low_stock_alert(
                                user_id,
                                product.name,
                                product.code,
                                product.stock,
                                product.unit
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
                                user_id,
                                product.name,
                                product.code
                            )
            except NotificationSettings.DoesNotExist:
                pass
            except Exception as e:
                print(f"Error sending LINE notification: {e}")
        
        return response

    def destroy(self, request, *args, **kwargs):
        return Response({"detail": "ไม่อนุญาตให้ลบสินค้าในคลังผ่านหน้านี้"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)


# ---------- Category ----------
class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


# ---------- Listing (หน้า "รายการสินค้า") ----------
class ListingViewSet(ModelViewSet):
    queryset = Listing.objects.select_related("product", "product__category").filter(product__is_deleted=False)
    serializer_class = ListingSerializer
    permission_classes = [AllowAny]
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

    @action(detail=True, methods=["post","patch"])
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


# ==================== EXISTING API FUNCTIONS ====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def issue_products(request):
    items = request.data.get("items", [])
    if not isinstance(items, list) or not items:
        return Response({"detail": "items is required"}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        issue = Issue.objects.create(created_by=request.user)
        updated_products = []

        for it in items:
            pid = int(it.get("product", 0) or 0)
            qty = int(it.get("qty", 0) or 0)
            if pid <= 0 or qty <= 0: continue

            try:
                p = Product.objects.select_for_update().get(id=pid, is_deleted=False)
            except ObjectDoesNotExist:
                return Response({"detail": f"product {pid} not found"}, status=status.HTTP_404_NOT_FOUND)

            if p.stock < qty:
                return Response({"detail": f"stock not enough for product {p.code}"}, status=status.HTTP_400_BAD_REQUEST)

            p.stock = F("stock") - qty
            p.on_sale = True
            p.save(update_fields=["stock","on_sale"])

            IssueLine.objects.create(issue=issue, product=p, qty=qty)

            # ✅ FIX #1: Use selling_price instead of price
            listing, created = Listing.objects.get_or_create(
                product=p,
                defaults={"is_active": True, "title": p.name, "sale_price": p.selling_price, "unit": p.unit, "quantity": qty}
            )
            if not created:
                listing.quantity = F("quantity") + qty
                listing.is_active = True
                listing.save(update_fields=["quantity","is_active"])

            p.refresh_from_db(fields=["stock","on_sale"])
            updated_products.append(p)
            
            if LINE_AVAILABLE and line_service:
                try:
                    settings_obj = NotificationSettings.objects.get(user=request.user)
                    user_id = settings_obj.line_user_id
                    
                    if user_id:
                        issued_by = request.user.get_full_name() or request.user.username
                        line_service.send_stock_out_notification(user_id, p.name, p.code, qty, p.unit, issued_by)

                        if p.stock == 0:
                            line_service.send_out_of_stock_alert(user_id, p.name, p.code)
                        elif p.stock < 5:
                            line_service.send_low_stock_alert(user_id, p.name, p.code, p.stock, p.unit)
                except Exception as e:
                    print(f"Error sending LINE notification: {e}")

    return Response(
        ProductSerializer(updated_products, many=True, context={"request": request}).data,
        status=status.HTTP_201_CREATED
    )


@api_view(["POST", "PATCH", "DELETE"])
@permission_classes([AllowAny])
def product_unlist(request, pk: int):
    try:
        product = Product.objects.get(pk=pk, is_deleted=False)
    except Product.DoesNotExist:
        return Response({"detail": "ไม่พบสินค้า"}, status=status.HTTP_404_NOT_FOUND)

    try:
        listing = product.listing
    except Listing.DoesNotExist:
        return Response({"detail": "สินค้านี้ยังไม่มีรายการในหน้าแสดง"}, status=status.HTTP_404_NOT_FOUND)

    listing.delete()
    if product.on_sale:
        product.on_sale = False
        product.save(update_fields=["on_sale"])

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([AllowAny])
def dashboard_stats(request):
    from zoneinfo import ZoneInfo
    from datetime import time
    bangkok_tz = ZoneInfo('Asia/Bangkok')
    now = timezone.now().astimezone(bangkok_tz)
    today = now.date()
    start = datetime.combine(today, time.min, tzinfo=bangkok_tz)
    end = datetime.combine(today, time.max, tzinfo=bangkok_tz)

    # ✅ FIXED: แสดง total_stock (จำนวนชิ้นทั้งหมด) แทน count
    products = Product.objects.filter(is_deleted=False)
    total_stock = products.aggregate(total=Sum("stock"))["total"] or 0
    
    low_qs = Product.objects.filter(is_deleted=False, stock__gt=0, stock__lt=5)
    in_today = Product.objects.filter(is_deleted=False, created_at__gte=start, created_at__lte=end).count()
    out_today = IssueLine.objects.filter(issue__created_at__gte=start, issue__created_at__lte=end).aggregate(total=Sum("qty"))["total"] or 0

    # ✅ คำนวณมูลค่าสต๊อก = selling_price × stock รวมทั้งหมด
    total_inventory_value = 0
    for p in products:
        price = float(p.selling_price) if p.selling_price else 0
        total_inventory_value += price * p.stock

    low_items = []
    for p in low_qs.order_by("stock")[:10]:
        img = request.build_absolute_uri(p.image.url) if p.image else None
        low_items.append({"id": p.id, "code": p.code, "name": p.name, "stock": p.stock, "unit": p.unit, "image_url": img})

    all_mv = []
    issued = IssueLine.objects.select_related("issue","product").filter(issue__created_at__gte=start, issue__created_at__lte=end)
    for l in issued: all_mv.append({'datetime':l.issue.created_at, 'id':f'out_{l.id}', 'date':l.issue.created_at.isoformat(), 'code':l.product.code, 'name':l.product.name, 'type':'out', 'qty':l.qty})
    received = Product.objects.filter(is_deleted=False, created_at__gte=start, created_at__lte=end)
    for p in received: all_mv.append({'datetime':p.created_at, 'id':f'in_{p.id}', 'date':p.created_at.isoformat(), 'code':p.code, 'name':p.name, 'type':'in', 'qty':p.initial_stock or p.stock})
    all_mv.sort(key=lambda x:x['datetime'], reverse=True)
    movements = [{'id':m['id'], 'date':m['date'], 'code':m['code'], 'name':m['name'], 'type':m['type'], 'qty':m['qty']} for m in all_mv[:20]]

    cats = Product.objects.filter(is_deleted=False).values('category__name').annotate(count=Count('id'), total_stock=Sum('stock')).order_by('-count')
    cat_list = [{'category':c['category__name'] or 'ไม่ระบุ', 'count':c['count'], 'total_stock':c['total_stock'] or 0} for c in cats]

    return Response({
        "total_products": total_stock,  # ✅ KEY CHANGE: ส่ง total_stock ไม่ใช่ count
        "low_stock_count": low_qs.count(),
        "in_today": in_today, 
        "out_today": out_today,
        "total_inventory_value": round(total_inventory_value, 2),
        "low_stock_items": low_items, 
        "movements": movements, 
        "category_stats": cat_list
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def movement_history(request):
    search = request.query_params.get('search', '')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    movement_type = request.query_params.get('type', 'all')
    limit = int(request.query_params.get('limit', 100))
    
    all_movements = []
    
    if movement_type in ['all', 'out']:
        issued_qs = IssueLine.objects.select_related('issue', 'product')
        if search: issued_qs = issued_qs.filter(Q(product__name__icontains=search) | Q(product__code__icontains=search))
        if start_date: 
            try: issued_qs = issued_qs.filter(issue__created_at__date__gte=datetime.strptime(start_date, '%Y-%m-%d').date())
            except ValueError: pass
        if end_date:
            try: issued_qs = issued_qs.filter(issue__created_at__date__lte=datetime.strptime(end_date, '%Y-%m-%d').date())
            except ValueError: pass
        for line in issued_qs.order_by('-issue__created_at'):
            all_movements.append({'id': f'out_{line.id}', 'date': line.issue.created_at.isoformat(), 'code': line.product.code, 'name': line.product.name, 'type': 'out', 'qty': line.qty, 'unit': line.product.unit})
    
    if movement_type in ['all', 'in']:
        received_qs = Product.objects.filter(is_deleted=False)
        if search: received_qs = received_qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        if start_date:
            try: received_qs = received_qs.filter(created_at__date__gte=datetime.strptime(start_date, '%Y-%m-%d').date())
            except ValueError: pass
        if end_date:
            try: received_qs = received_qs.filter(created_at__date__lte=datetime.strptime(end_date, '%Y-%m-%d').date())
            except ValueError: pass
        for p in received_qs.order_by('-created_at'):
            all_movements.append({'id': f'in_{p.id}', 'date': p.created_at.isoformat(), 'code': p.code, 'name': p.name, 'type': 'in', 'qty': p.initial_stock or p.stock, 'unit': p.unit})
    
    all_movements.sort(key=lambda x: x['date'], reverse=True)
    return Response({'movements': all_movements[:limit], 'total': len(all_movements), 'showing': len(all_movements[:limit])})


# ==================== LINE MESSAGING API ====================

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def line_webhook(request):
    """Webhook endpoint สำหรับรับ events จาก LINE"""
    if not LINE_AVAILABLE: 
        return HttpResponseBadRequest("LINE SDK not available")
    
    signature = request.META.get('HTTP_X_LINE_SIGNATURE', '')
    body = request.body.decode('utf-8')
    
    try:
        line_service.handler.handle(body, signature)
    except InvalidSignatureError: 
        return HttpResponseBadRequest("Invalid signature")
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return HttpResponseBadRequest()
    
    return HttpResponse('OK')


if LINE_AVAILABLE and line_service:
    @line_service.handler.add(MessageEvent, message=TextMessage)
    def handle_text_message(event):
        """Handler สำหรับ text messages จาก LINE"""
        user_id = event.source.user_id
        text = event.message.text.strip()
        
        if len(text) == 6 and text.isdigit():
            try:
                settings_obj = NotificationSettings.objects.get(verification_code=text)
                settings_obj.line_user_id = user_id
                settings_obj.verification_code = None
                settings_obj.save()
                
                line_service.send_text_message(
                    user_id,
                    f"✅ เชื่อมต่อสำเร็จ!\nสวัสดีคุณ {settings_obj.user.username}\nระบบพร้อมแจ้งเตือนแล้วครับ"
                )
            except NotificationSettings.DoesNotExist:
                line_service.send_text_message(
                    user_id, 
                    "❌ รหัสไม่ถูกต้อง หรือหมดอายุแล้ว\n(ลองกดรีเฟรชหน้าเว็บเพื่อขอรหัสใหม่ครับ)"
                )
            return

        triggers = ['ขอรหัส', 'รหัส', 'code', 'id', 'userid', 'help', 'ช่วย', 'เชื่อม']
        
        if any(keyword in text.lower() for keyword in triggers):
            msg = (
                f"🆔 User ID ของคุณคือ:\n{user_id}\n"
                "(เผื่อต้องใช้แจ้งผู้ดูแลระบบ)\n\n"
                "📋 วิธีเชื่อมต่อระบบ:\n"
                "1. เปิดหน้าเว็บ 'การแจ้งเตือน LINE'\n"
                "2. นำรหัสตัวเลข 6 หลักที่เห็นบนเว็บ\n"
                "3. พิมพ์ส่งมาในแชทนี้ได้เลยครับ"
            )
            line_service.send_text_message(user_id, msg)
        else:
            line_service.send_text_message(
                user_id, 
                "สวัสดีครับ! กรุณาพิมพ์ 'รหัส 6 หลัก' จากหน้าเว็บไซต์ส่งมาเพื่อเชื่อมต่อระบบครับ"
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connection_code(request):
    """สร้างหรือดึงรหัสเชื่อมต่อ 6 หลัก"""
    try:
        settings_obj, created = NotificationSettings.objects.get_or_create(user=request.user)
        
        if settings_obj.line_user_id:
            return Response({"connected": True})
            
        if not settings_obj.verification_code:
            settings_obj.verification_code = ''.join(random.choices(string.digits, k=6))
            settings_obj.save()
        
        return Response({"connected": False, "code": settings_obj.verification_code})
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_line_user_id(request):
    """เช็คว่าเชื่อมต่อ LINE แล้วหรือยัง"""
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        has_id = bool(settings_obj.line_user_id)
        return Response({
            "has_user_id": has_id, 
            "masked_user_id": "CONNECTED" if has_id else ""
        })
    except NotificationSettings.DoesNotExist:
        return Response({"has_user_id": False, "masked_user_id": ""})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_line_user_id(request):
    """ยกเลิกการเชื่อมต่อ LINE"""
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        settings_obj.line_user_id = None
        settings_obj.save()
    except NotificationSettings.DoesNotExist: 
        pass
    return Response({"success": True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_message(request):
    """ส่งข้อความทดสอบไปยัง LINE"""
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
    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_low_stock_alerts(request):
    """ส่งแจ้งเตือนสินค้าใกล้หมดทั้งหมด"""
    if not LINE_AVAILABLE: 
        return Response({"error": "Service unavailable"}, status=503)
    
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        
        if not settings_obj.line_user_id: 
            return Response({"error": "No Line ID"}, status=400)
        
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
    """ดึงข้อมูลโปรไฟล์ LINE"""
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        
        if not settings_obj.line_user_id: 
            return Response({"error": "No ID"}, status=400)
        
        res = line_service.get_profile(settings_obj.line_user_id)
        
        return Response(res['data'] if res.get('success') else res)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ==================== PHASE 3A: FESTIVAL & BEST-SELLERS VIEWSETS ====================

class FestivalViewSet(ModelViewSet):
    """ViewSet สำหรับจัดการเทศกาล"""
    queryset = Festival.objects.all()
    serializer_class = FestivalSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        """เลือก serializer ตามที่เรียก"""
        if self.action == 'with_best_sellers':
            return FestivalWithBestSellersSerializer
        elif self.action == 'retrieve':
            return FestivalWithBestSellersSerializer
        return FestivalSerializer

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """ดึงเทศกาลที่มาในระหว่าง 60 วันข้างหน้า"""
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
        """ดึงปฏิทินเทศกาลตามเดือน/ปี"""
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))

        if month < 1 or month > 12:
            return Response(
                {'error': 'Month must be between 1 and 12'},
                status=status.HTTP_400_BAD_REQUEST
            )

        festivals = Festival.objects.filter(
            start_date__year=year,
            start_date__month=month
        ).order_by('start_date')

        serializer = self.get_serializer(festivals, many=True)
        return Response({
            'year': year,
            'month': month,
            'month_name': datetime(year, month, 1).strftime('%B'),
            'festivals': serializer.data,
            'count': festivals.count()
        })

    @action(detail=False, methods=['get'])
    def with_best_sellers(self, request):
        """ดึง Festival พร้อมกับ Best Sellers"""
        festivals = Festival.objects.prefetch_related('best_sellers').all()
        serializer = self.get_serializer(festivals, many=True)
        return Response({
            'count': festivals.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['get'])
    def best_sellers(self, request, pk=None):
        """ดึง Best Sellers สำหรับเทศกาลเฉพาะ"""
        festival = self.get_object()
        best_sellers = BestSeller.objects.filter(festival=festival).order_by('rank')

        serializer = BestSellerDetailSerializer(best_sellers, many=True)
        return Response({
            'festival': FestivalSerializer(festival).data,
            'best_sellers': serializer.data,
            'count': best_sellers.count()
        })


class BestSellerViewSet(ModelViewSet):
    """ViewSet สำหรับจัดการ Best Sellers"""
    queryset = BestSeller.objects.all()
    serializer_class = BestSellerSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def top_products(self, request):
        """ดึง Top N สินค้าขายดี - เรียงตามยอดเบิกจากมากไปน้อย"""
        period = request.query_params.get('period', 'month')
        limit = int(request.query_params.get('limit', 10))

        if limit < 1 or limit > 100:
            limit = 10

        today = timezone.now().date()

        period_map = {
            'all': None,
            'year': today - timedelta(days=365),
            'month': today - timedelta(days=30),
            '7days': today - timedelta(days=7),
            '30days': today - timedelta(days=30),
        }

        start_date = period_map.get(period)

        if start_date:
            issue_data = IssueLine.objects.filter(
                issue__created_at__date__gte=start_date
            )
        else:
            issue_data = IssueLine.objects.all()

        # ✅ เรียงลำดับตามยอดเบิก (total_issued) จากมากไปน้อย
        top_products = issue_data.values('product').annotate(
            total_issued=Sum('qty'),
            transactions=Count('id')
        ).order_by('-total_issued')[:limit]  # ← จากมากไปน้อย

        results = []
        for idx, tp in enumerate(top_products, 1):  # idx เริ่มจาก 1
            try:
                product = Product.objects.get(id=tp['product'])
                results.append({
                    'rank': idx,  # ✅ อันดับตามลำดับ (1, 2, 3, ...)
                    'product': {
                        'id': product.id,
                        'name': product.name,
                        'code': product.code,
                        'category': product.category.name if product.category else None
                    },
                    'total_issued': tp['total_issued'],  # ✅ จำนวนเบิกรวม
                    'transactions': tp['transactions'],   # จำนวนครั้งเบิก
                    'period': period
                })
            except Product.DoesNotExist:
                continue

        return Response({
            'period': period,
            'limit': limit,
            'count': len(results),
            'results': results  # ✅ เรียงตามยอดเบิก
        })

    @action(detail=False, methods=['get'])
    def festival_forecast(self, request):
        """ดึงข้อมูล Festival Forecast สำหรับเทศกาลที่มาถึง"""
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
            confidence = min(90, 50 + abs(bs.percentage_increase))

            recommendations.append({
                'product': {
                    'id': bs.product.id,
                    'name': bs.product.name,
                    'code': bs.product.code,
                    'unit': bs.product.unit
                },
                'last_year_count': bs.last_year_count,
                'suggested_increase': suggested_qty - bs.last_year_count,
                'suggested_quantity': suggested_qty,
                'percentage_increase': bs.percentage_increase,
                'confidence': confidence,
                'rank': bs.rank
            })

        days_left = (upcoming_festival.start_date - today).days

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
            'average_confidence': sum([r['confidence'] for r in recommendations]) / len(recommendations) if recommendations else 0
        })

    @action(detail=False, methods=['get'])
    def category_analysis(self, request):
        """วิเคราะห์สินค้าขายดีตามหมวดหมู่"""
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
            category_name = bs.product.category.name if bs.product.category else 'Uncategorized'
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
        """สร้าง Best Seller records หลายรายการพร้อมกัน"""
        try:
            festival_id = request.data.get('festival_id')
            best_sellers_data = request.data.get('best_sellers', [])

            festival = Festival.objects.get(id=festival_id)
            created_count = 0

            for data in best_sellers_data:
                try:
                    product = Product.objects.get(id=data['product_id'])
                    bs, created = BestSeller.objects.update_or_create(
                        product=product,
                        festival=festival,
                        defaults={
                            'total_issued': data.get('total_issued', 0),
                            'rank': data.get('rank', 0),
                            'last_year_count': data.get('last_year_count', 0),
                            'this_year_count': data.get('total_issued', 0)
                        }
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

class EmployeeDashboardViewSet(ModelViewSet):
    """Dashboard สำหรับพนักงาน (ไม่มีราคา)"""
    permission_classes = [IsEmployee]
    http_method_names = ['get']
    queryset = Product.objects.none()

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """หน้า overview สำหรับพนักงาน"""
        from zoneinfo import ZoneInfo
        from datetime import time
        
        bangkok_tz = ZoneInfo('Asia/Bangkok')
        now = timezone.now().astimezone(bangkok_tz)
        today = now.date()
        start = datetime.combine(today, time.min, tzinfo=bangkok_tz)
        end = datetime.combine(today, time.max, tzinfo=bangkok_tz)
        
        # 1. Total products
        total_products = Product.objects.filter(is_deleted=False).count()
        
        # 2. Low stock items
        low_stock = Product.objects.filter(
            is_deleted=False, stock__gt=0, stock__lt=5
        ).values('id', 'code', 'name', 'stock', 'unit').order_by('stock')[:10]
        
        # 3. Today's sales
        today_issued = IssueLine.objects.filter(
            issue__created_at__gte=start,
            issue__created_at__lte=end
        ).aggregate(total_qty=Sum('qty'), total_items=Count('id'))
        
        # 4. Upcoming festivals
        upcoming_festivals = Festival.objects.filter(
            start_date__gte=today
        ).order_by('start_date')[:5].values('id', 'name', 'icon', 'start_date')
        
        # 5. Top products today
        top_products = IssueLine.objects.filter(
            issue__created_at__gte=start,
            issue__created_at__lte=end
        ).values('product__id', 'product__code', 'product__name').annotate(
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


class AdminDashboardViewSet(ModelViewSet):
    """Dashboard สำหรับเจ้าของ/Admin (มีราคา)"""
    permission_classes = [IsAdmin]
    http_method_names = ['get']
    queryset = Product.objects.none()

    @action(detail=False, methods=['get'])
    def financial(self, request):
        """หน้า financial overview"""
        products = Product.objects.filter(is_deleted=False)
        
        # ✅ FIX #2: Use cost_price and selling_price instead of price
        total_inventory_value = 0
        total_selling_value = 0
        total_profit = 0
        
        for p in products:
            cost_value = float(p.cost_price) * p.stock
            selling_value = float(p.selling_price) * p.stock
            profit = selling_value - cost_value
            
            total_inventory_value += cost_value
            total_selling_value += selling_value
            total_profit += profit
        
        profit_margin = (total_profit / total_selling_value * 100) if total_selling_value > 0 else 0
        
        return Response({
            'total_inventory_value': total_inventory_value,
            'total_selling_value': total_selling_value,
            'total_profit': total_profit,
            'profit_margin': profit_margin,
            'total_products': products.count(),
            'total_stock_items': products.aggregate(Sum('stock'))['stock__sum'] or 0
        })

    @action(detail=False, methods=['get'])
    def category_breakdown(self, request):
        """Breakdown ตามหมวดหมู่"""
        categories = Category.objects.annotate(
            product_count=Count('product'),
            total_stock=Sum('product__stock')
        ).values('id', 'name', 'product_count', 'total_stock')
        
        return Response({
            'categories': list(categories)
        })

    @action(detail=False, methods=['get'])
    def top_products(self, request):
        """สินค้าที่มีค่าสูงสุด"""
        # ✅ FIX #3: Use cost_price instead of price
        top_products = Product.objects.filter(
            is_deleted=False, stock__gt=0
        ).annotate(
            inventory_value=F('stock') * F('cost_price')
        ).values(
            'id', 'code', 'name', 'stock', 'cost_price', 'selling_price', 'category__name'
        ).order_by('-inventory_value')[:20]
        
        return Response({
            'top_products': list(top_products)
        })