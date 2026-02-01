# tasks/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Task
from .serializers import TaskSerializer, TaskUpdateStatusSerializer


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet สำหรับจัดการ Tasks
    
    list: แสดงรายการงานทั้งหมด
    create: สร้างงานใหม่
    retrieve: ดูรายละเอียดงาน
    update: แก้ไขงาน
    destroy: ลบงาน
    """
    
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        กรองงานตาม user role:
        - Admin: เห็นทุกงาน
        - Employee: เห็นเฉพาะงานที่ได้รับมอบหมาย
        """
        user = self.request.user
        queryset = Task.objects.all()
        
        # ถ้าไม่ใช่ admin/staff ให้เห็นเฉพาะงานที่ได้รับมอบหมาย
        if not user.is_staff and not user.is_superuser:
            queryset = queryset.filter(assigned_to=user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by priority
        priority_filter = self.request.query_params.get('priority')
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        
        # Filter by task_type
        task_type_filter = self.request.query_params.get('task_type')
        if task_type_filter:
            queryset = queryset.filter(task_type=task_type_filter)
        
        # Filter by assigned_to
        assigned_to_filter = self.request.query_params.get('assigned_to')
        if assigned_to_filter:
            queryset = queryset.filter(assigned_to_id=assigned_to_filter)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """เริ่มทำงาน - เปลี่ยนสถานะเป็น in_progress"""
        task = self.get_object()
        task.status = 'in_progress'
        task.save()
        return Response({'status': 'กำลังทำ', 'task': TaskSerializer(task).data})
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """เสร็จงาน - เปลี่ยนสถานะเป็น completed"""
        task = self.get_object()
        task.status = 'completed'
        task.completed_at = timezone.now()
        
        # อัพเดท actual_quantity ถ้ามี
        actual_quantity = request.data.get('actual_quantity')
        if actual_quantity:
            task.actual_quantity = actual_quantity
        
        task.save()
        return Response({'status': 'เสร็จแล้ว', 'task': TaskSerializer(task).data})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """ยกเลิกงาน"""
        task = self.get_object()
        task.status = 'cancelled'
        task.save()
        return Response({'status': 'ยกเลิก', 'task': TaskSerializer(task).data})
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """ดูเฉพาะงานของตัวเอง"""
        tasks = Task.objects.filter(assigned_to=request.user).order_by('-created_at')
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """ดูงานที่รอดำเนินการ"""
        queryset = self.get_queryset().filter(status='pending')
        serializer = TaskSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def in_progress(self, request):
        """ดูงานที่กำลังทำ"""
        queryset = self.get_queryset().filter(status='in_progress')
        serializer = TaskSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """สถิติงาน"""
        queryset = self.get_queryset()
        return Response({
            'total': queryset.count(),
            'pending': queryset.filter(status='pending').count(),
            'in_progress': queryset.filter(status='in_progress').count(),
            'completed': queryset.filter(status='completed').count(),
            'cancelled': queryset.filter(status='cancelled').count(),
        })