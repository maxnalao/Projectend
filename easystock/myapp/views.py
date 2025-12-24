# myapp/views.py
from django.http import HttpResponse

def home(request):
    return HttpResponse(
        "Backend is running ✅ — API at /api/ , Admin at /admin/",
        content_type="text/plain; charset=utf-8",
    )
