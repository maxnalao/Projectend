# tasks/serializers.py
from rest_framework import serializers
from .models import Task
from django.contrib.auth import get_user_model

User = get_user_model()


class TaskSerializer(serializers.ModelSerializer):
    """Serializer สำหรับ Task"""
    
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'task_type',
            'task_type_display',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'assigned_to',
            'assigned_to_name',
            'created_by',
            'created_by_name',
            'due_date',
            'completed_at',
            'target_quantity',
            'actual_quantity',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            if obj.assigned_to.first_name and obj.assigned_to.last_name:
                return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
            return obj.assigned_to.username
        return None
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            if obj.created_by.first_name and obj.created_by.last_name:
                return f"{obj.created_by.first_name} {obj.created_by.last_name}"
            return obj.created_by.username
        return None
    
    def create(self, validated_data):
        # Auto set created_by จาก request user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskUpdateStatusSerializer(serializers.ModelSerializer):
    """Serializer สำหรับอัพเดทสถานะ Task"""
    
    class Meta:
        model = Task
        fields = ['status', 'actual_quantity']