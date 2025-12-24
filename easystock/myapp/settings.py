# ✅ backend/settings.py (Updated with .env support)

from pathlib import Path
from datetime import timedelta
from decouple import config  # ✅ เพิ่มบรรทัดนี้

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-&3wg#uj!m$4j0pf0u(@&x6c0@+m4w+&slry&2lgy5_f%$iysnf')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '*.ngrok-free.app',
    '*.ngrok-free.dev',  # ✅ เพิ่มนี้ (สำหรับ ngrok URL ใหม่)
    '*.ngrok.io',
    '*'
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # 3rd Party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    # My Apps
    'accounts',
    'inventory',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # อยู่บนสุดเสมอ
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = "myapp.urls"

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'myapp.wsgi.application'
ASGI_APPLICATION = "myapp.asgi.application"

# Database
DATABASES = {
   "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": config('DB_NAME', default='projectend'),
        "USER": config('DB_USER', default='root'),
        "PASSWORD": config('DB_PASSWORD', default='root'),       
        "HOST": config('DB_HOST', default='127.0.0.1'),
        "PORT": config('DB_PORT', default='3306'),
    }
}

# ✅ สำคัญมาก: ต้องระบุ User Model ที่เราสร้างเอง
AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Bangkok'
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = 'static/'
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==========================================
# 🔵 NGROK & CORS Configuration
# ==========================================

# ✅ ดึง NGROK_URL จาก .env
NGROK_URL = config('NGROK_URL', default='http://localhost:8000')

# CORS Settings
CORS_ALLOW_ALL_ORIGINS = True  # สำหรับ Dev

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    NGROK_URL,  # ✅ ใช้ค่าจาก .env
]

# ✅ CSRF Trusted Origins - ยืดหยุ่น
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:8000',
    'https://api.line.me',
    NGROK_URL,  # ✅ ใช้ค่าจาก .env
    'https://*.ngrok-free.app',
    'https://*.ngrok-free.dev',  # ✅ เพิ่มนี้
    'https://*.ngrok.io',
]

# Channel Layers
CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
}

# ==========================================
# 🔵 LINE MESSAGING API Configuration
# ==========================================

# ✅ ดึง LINE credentials จาก .env
LINE_CHANNEL_ACCESS_TOKEN = config('LINE_CHANNEL_ACCESS_TOKEN', default='')
LINE_CHANNEL_SECRET = config('LINE_CHANNEL_SECRET', default='')

# ✅ ตรวจสอบ
if not LINE_CHANNEL_ACCESS_TOKEN or not LINE_CHANNEL_SECRET:
    import warnings
    warnings.warn(
        "⚠️  LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_CHANNEL_SECRET ยังไม่ตั้งค่า\n"
        "ตรวจสอบ: backend/.env ว่ามี LINE credentials"
    )