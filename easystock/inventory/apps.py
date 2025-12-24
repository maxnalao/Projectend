from django.apps import AppConfig

class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventory'   # ต้องตรงชื่อโฟลเดอร์แอป
    label = 'inventory'  # ระบุชัด ๆ กันพลาด
