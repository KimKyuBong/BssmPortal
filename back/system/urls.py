from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.system_status, name='system_status'),
    path('health/refresh/', views.refresh_health_data, name='refresh_health_data'),
    path('pihole/stats/', views.pihole_detailed_stats, name='pihole_detailed_stats'),
] 