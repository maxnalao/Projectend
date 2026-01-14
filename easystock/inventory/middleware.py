# inventory/middleware.py

class DisableCSRFForLineWebhook:
    """Middleware to disable CSRF for LINE webhook endpoint"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Debug: พิมพ์ path ออกมาดู
        print(f"🔍 Request path: {request.path}")
        
        # ถ้าเป็น LINE webhook ให้ข้าม CSRF
        if '/line/webhook' in request.path:
            setattr(request, '_dont_enforce_csrf_checks', True)
            print("✅ CSRF disabled for webhook")
        
        response = self.get_response(request)
        return response