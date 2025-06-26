from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/system/health/$', consumers.HealthCheckConsumer.as_asgi()),
] 