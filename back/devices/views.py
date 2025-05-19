# views.py 파일은 구조 개선을 위해 여러 파일로 나뉘었습니다.
# 이 파일은 하위 호환성을 위해 유지됩니다.

from .views import DeviceViewSet, DeviceHistoryViewSet, get_current_mac

__all__ = ['DeviceViewSet', 'DeviceHistoryViewSet', 'get_current_mac']
