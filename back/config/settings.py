from pathlib import Path
import os
from datetime import timedelta
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# 환경변수에서 시크릿 키 가져오기
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-your-secret-key')

# 환경변수에서 디버그 모드 가져오기
DEBUG = os.environ.get('DEBUG', 'True') == 'False'

# 환경변수에서 허용된 호스트 가져오기
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',') if os.environ.get('ALLOWED_HOSTS') else []

# 한글 도메인과 punycode 도메인 추가
ALLOWED_HOSTS.extend([
    '정보포털.com',
    'xn--on3bn7rslhcxc.com',
    '정보포털.한국',
    'xn--on3bn7rslhcxc.xn--3e0b707e',
    'localhost',
    '127.0.0.1',
    '10.129.55.253',
])

# 앱 등록
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # 설치한 라이브러리
    'rest_framework',
    'corsheaders',
    'channels',
    
    # 로컬 앱
    'users',
    'devices',
    'system',
    'rentals',
    'dns',
    'broadcast',
]

# CORS 설정 추가
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # 최상단에 추가
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Next.js 프론트엔드를 위한 CORS 설정
CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
]

# 개발 환경에서는 모든 출처 허용 (필요시 활성화)
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

# CORS 허용 헤더 및 메소드 설정
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-real-ip',
    'x-forwarded-for',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# 데이터베이스 설정
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('BSSM_DATABASE_NAME', 'bssmdb'),
        'USER': os.environ.get('BSSM_DATABASE_USER', 'kea'),
        'PASSWORD': os.environ.get('BSSM_DATABASE_PASSWORD', 'Kea@Pass123!'),
        'HOST': os.environ.get('BSSM_DATABASE_HOST', '127.0.0.1'),
        'PORT': os.environ.get('BSSM_DATABASE_PORT', '3306'),
    },
    'kea': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('KEA_DATABASE_NAME', 'kea'),
        'USER': os.environ.get('KEA_DATABASE_USER', 'kea'),
        'PASSWORD': os.environ.get('KEA_DATABASE_PASSWORD', 'Kea@Pass123!'),
        'HOST': os.environ.get('KEA_DATABASE_HOST', '127.0.0.1'),
        'PORT': os.environ.get('KEA_DATABASE_PORT', '3306'),
    }
}

# KEA DHCP 설정
KEA_CONFIG = {
    'SUBNET_ID': int(os.environ.get('KEA_SUBNET_ID', '3')),
    'TEACHER_LIFETIME': int(os.environ.get('KEA_TEACHER_LIFETIME', '2592000')),  # 교사 IP 할당 유효기간 (30일, 초 단위)
    'STUDENT_LIFETIME': int(os.environ.get('KEA_STUDENT_LIFETIME', '28800')),    # 학생 IP 할당 유효기간 (8시간, 초 단위)
}

# TEMPLATES 설정 추가
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ROOT_URLCONF 설정 추가
ROOT_URLCONF = 'config.urls'

# WSGI 애플리케이션 설정 추가
WSGI_APPLICATION = 'config.wsgi.application'

# ASGI 애플리케이션 설정 추가 (Channels용)
ASGI_APPLICATION = 'config.asgi.application'

# Channels 레이어 설정
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}

# Redis가 없는 개발 환경을 위한 인메모리 채널 레이어 (필요시 사용)
# CHANNEL_LAYERS = {
#     'default': {
#         'BACKEND': 'channels.layers.InMemoryChannelLayer',
#     },
# }

# 정적 파일 설정 추가
STATIC_URL = 'static/'

# 미디어 파일 설정 추가 (업로드된 파일용)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# 기본 자동 필드 타입 설정
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 파일 끝에 추가
AUTH_USER_MODEL = 'users.User'

# 기존 설정 아래에 추가
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # 퍼포먼스 향상을 위한 설정
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,  # 페이지당 항목 수 증가
    # 셀러리얼라이저 최적화
    'COMPACT_JSON': True,
    'UNICODE_JSON': True,
    'JSON_UNDERSCOREIZE': {
        'no_underscore_before_number': True,
    },
}

# JWT 설정
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=int(os.environ.get('JWT_ACCESS_TOKEN_HOURS', '1'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_DAYS', '7'))),
    'ALGORITHM': os.environ.get('JWT_ALGORITHM', 'HS256'),
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.BCryptPasswordHasher',
]

# 시간대 설정
USE_TZ = True
TIME_ZONE = 'Asia/Seoul'

# 로깅 설정
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'level': 'DEBUG',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'django.log',
            'formatter': 'verbose',
            'level': 'DEBUG',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'rentals': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'devices': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'dns': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'DEBUG',
    },
}

# SSL 인증서 관련 설정
SSL_CA_DIR = os.environ.get('SSL_CA_DIR', '/etc/ssl/ca')
SSL_CERT_DIR = os.environ.get('SSL_CERT_DIR', '/etc/ssl/certs')
SSL_KEY_DIR = os.environ.get('SSL_KEY_DIR', '/etc/ssl/private')

# SSL 인증서 기본 유효기간 (일) - 100년
SSL_DEFAULT_VALIDITY_DAYS = int(os.environ.get('SSL_DEFAULT_VALIDITY_DAYS', '36500'))

# CA 인증서 기본 유효기간 (일) - 100년
SSL_CA_VALIDITY_DAYS = int(os.environ.get('SSL_CA_VALIDITY_DAYS', '36500'))

# FastAPI 방송 서비스 설정
BROADCAST_API_CONFIG = {
    'BASE_URL': os.environ.get('BROADCAST_API_BASE_URL', 'http://10.129.55.251:10200'),
    'API_KEY': os.environ.get('BROADCAST_API_KEY', ''),
    'TIMEOUT': int(os.environ.get('BROADCAST_API_TIMEOUT', '30')),  # 초 단위
    'RETRY_ATTEMPTS': int(os.environ.get('BROADCAST_API_RETRY_ATTEMPTS', '3')),
}

# 스피커 방송 관련 설정
BROADCAST_CONFIG = {
    'DEFAULT_LANGUAGE': os.environ.get('BROADCAST_DEFAULT_LANGUAGE', 'ko'),
    'MAX_TEXT_LENGTH': int(os.environ.get('BROADCAST_MAX_TEXT_LENGTH', '500')),
    'AUDIO_UPLOAD_PATH': os.environ.get('BROADCAST_AUDIO_UPLOAD_PATH', '/var/broadcast/audio'),
    'ALLOWED_AUDIO_FORMATS': ['mp3', 'wav', 'ogg', 'm4a'],
    'MAX_AUDIO_SIZE': int(os.environ.get('BROADCAST_MAX_AUDIO_SIZE', '50')),  # MB 단위
}