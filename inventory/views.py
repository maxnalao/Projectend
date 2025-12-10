# inventory/views.py
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

from .models import Product, Category, Issue, IssueLine, Listing
from .serializers import ProductSerializer, CategorySerializer, ListingSerializer

# ✅ Import NotificationSettings
try:
    from accounts.models import NotificationSettings
except ImportError:
    NotificationSettings = None
    print("⚠️ Warning: accounts.models.NotificationSettings not found.")

# ✅ LINE Messaging API Setup
LINE_AVAILABLE = False
line_service = None
logger = None

try:
    from linebot.exceptions import InvalidSignatureError
    from linebot.models import MessageEvent, TextMessage
    from .line_messaging import LineMessagingService
    import logging
    
    logger = logging.getLogger(__name__)
    
    # สร้าง LINE Service Instance
    line_service = LineMessagingService(
        channel_access_token=getattr(settings, 'LINE_CHANNEL_ACCESS_TOKEN', ''),
        channel_secret=getattr(settings, 'LINE_CHANNEL_SECRET', '')
    )
    LINE_AVAILABLE = True
except Exception as e:
    print(f"⚠️ LINE SDK initialization error: {e}")


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


# ---------- เบิกสต๊อก ----------
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

            listing, created = Listing.objects.get_or_create(
                product=p,
                defaults={"is_active": True, "title": p.name, "sale_price": p.price, "unit": p.unit, "quantity": qty}
            )
            if not created:
                listing.quantity = F("quantity") + qty
                listing.is_active = True
                listing.save(update_fields=["quantity","is_active"])

            p.refresh_from_db(fields=["stock","on_sale"])
            updated_products.append(p)
            
            # ✅ แจ้งเตือน LINE
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


# ---------- Dashboard & History ----------
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
    from datetime import datetime, time
    bangkok_tz = ZoneInfo('Asia/Bangkok')
    now = timezone.now().astimezone(bangkok_tz)
    today = now.date()
    start = datetime.combine(today, time.min, tzinfo=bangkok_tz)
    end = datetime.combine(today, time.max, tzinfo=bangkok_tz)

    total = Product.objects.filter(is_deleted=False).count()
    low_qs = Product.objects.filter(is_deleted=False, stock__gt=0, stock__lt=5)
    in_today = Product.objects.filter(is_deleted=False, created_at__gte=start, created_at__lte=end).count()
    out_today = IssueLine.objects.filter(issue__created_at__gte=start, issue__created_at__lte=end).aggregate(total=Sum("qty"))["total"] or 0

    low_items = []
    for p in low_qs.order_by("stock")[:10]:
        img = request.build_absolute_uri(p.image.url) if p.image else None
        low_items.append({"id": p.id, "code": p.code, "name": p.name, "stock": p.stock, "unit": p.unit, "image_url": img})

    all_mv = []
    issued = IssueLine.objects.select_related("issue","product").filter(issue__created_at__gte=start, issue__created_at__lte=end)
    for l in issued: all_mv.append({'datetime':l.issue.created_at, 'id':f'out_{l.id}', 'date':l.issue.created_at.isoformat(), 'code':l.product.code, 'name':l.product.name, 'type':'out', 'qty':l.qty})
    received = Product.objects.filter(is_deleted=False, created_at__gte=start, created_at__lte=end)
    for p in received: all_mv.append({'datetime':p.created_at, 'id':f'in_{p.id}', 'date':p.created_at.isoformat(), 'code':p.code, 'name':p.name, 'type':'in', 'qty':p.stock})
    all_mv.sort(key=lambda x:x['datetime'], reverse=True)
    movements = [{'id':m['id'], 'date':m['date'], 'code':m['code'], 'name':m['name'], 'type':m['type'], 'qty':m['qty']} for m in all_mv[:20]]

    cats = Product.objects.filter(is_deleted=False).values('category__name').annotate(count=Count('id'), total_stock=Sum('stock')).order_by('-count')
    cat_list = [{'category':c['category__name'] or 'ไม่ระบุ', 'count':c['count'], 'total_stock':c['total_stock'] or 0} for c in cats]

    return Response({
        "total_products": total, "low_stock_count": low_qs.count(),
        "in_today": in_today, "out_today": out_today,
        "low_stock_items": low_items, "movements": movements, "category_stats": cat_list
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def movement_history(request):
    from datetime import datetime
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
            all_movements.append({'id': f'in_{p.id}', 'date': p.created_at.isoformat(), 'code': p.code, 'name': p.name, 'type': 'in', 'qty': p.stock, 'unit': p.unit})
    
    all_movements.sort(key=lambda x: x['date'], reverse=True)
    return Response({'movements': all_movements[:limit], 'total': len(all_movements), 'showing': len(all_movements[:limit])})


# ==================== LINE MESSAGING API ====================

# ✅ สำคัญมาก: เพิ่ม @csrf_exempt
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def line_webhook(request):
    """
    Webhook endpoint สำหรับรับ events จาก LINE
    """
    if not LINE_AVAILABLE: 
        return HttpResponseBadRequest("LINE SDK not available")
    
    signature = request.META.get('HTTP_X_LINE_SIGNATURE', '')
    body = request.body.decode('utf-8')
    
    try:
        line_service.handler.handle(body, signature)
    except InvalidSignatureError: 
        return HttpResponseBadRequest("Invalid signature")
    except Exception as e:
        if logger: 
            logger.error(f"Webhook error: {e}")
        return HttpResponseBadRequest()
    
    return HttpResponse('OK')


if LINE_AVAILABLE and line_service:
    @line_service.handler.add(MessageEvent, message=TextMessage)
    def handle_text_message(event):
        """
        Handler สำหรับ text messages จาก LINE
        """
        user_id = event.source.user_id
        text = event.message.text.strip()
        
        # 1. เชื่อมต่อด้วยรหัส 6 หลัก
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

        # 2. คำสั่งช่วยเหลือ
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
            # ตอบกลับทั่วไป
            line_service.send_text_message(
                user_id, 
                "สวัสดีครับ! กรุณาพิมพ์ 'รหัส 6 หลัก' จากหน้าเว็บไซต์ส่งมาเพื่อเชื่อมต่อระบบครับ"
            )


# ✅ API: ขอรหัสเชื่อมต่อ
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connection_code(request):
    """
    สร้างหรือดึงรหัสเชื่อมต่อ 6 หลัก
    """
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
    """
    เช็คว่าเชื่อมต่อ LINE แล้วหรือยัง
    """
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
    """
    ยกเลิกการเชื่อมต่อ LINE
    """
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        settings_obj.line_user_id = None
        settings_obj.save()
    except NotificationSettings.DoesNotExist: 
        pass
    return Response({"success": True})


# ✅ API: ส่งข้อความทดสอบ
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_test_message(request):
    """
    ส่งข้อความทดสอบไปยัง LINE
    """
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
    """
    ส่งแจ้งเตือนสินค้าใกล้หมดทั้งหมด
    """
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
    """
    ดึงข้อมูลโปรไฟล์ LINE
    """
    try:
        settings_obj = NotificationSettings.objects.get(user=request.user)
        
        if not settings_obj.line_user_id: 
            return Response({"error": "No ID"}, status=400)
        
        res = line_service.get_profile(settings_obj.line_user_id)
        
        return Response(res['data'] if res.get('success') else res)
    except Exception as e:
        return Response({"error": str(e)}, status=500)