from django.urls import path
from .views import (
    BroadcastHistoryView, AudioFileView,
    DeviceMatrixView, TextBroadcastView, AudioBroadcastView, 
    AudioPreviewView, TextPreviewView, PreviewListView, 
    PreviewDetailView, PreviewApprovalView, PreviewRejectView,
    TestExternalPreviewView, broadcast_status, preview_audio_file, download_audio_file, download_history_audio,
    AdminBroadcastHistoryView, AdminPreviewListView, BroadcastHistoryDetailView
)

app_name = 'broadcast'

urlpatterns = [
    # 장치 매트릭스 관련
    path('devices/', DeviceMatrixView.as_view(), name='device_matrix'),
    path('device-matrix/', DeviceMatrixView.as_view(), name='device_matrix_alt'),  # 프론트엔드 호환성
    
    # 방송 실행
    path('text/', TextBroadcastView.as_view(), name='text_broadcast'),
    path('audio/', AudioBroadcastView.as_view(), name='audio_broadcast'),
    
    # 방송 이력
    path('history/', BroadcastHistoryView.as_view(), name='broadcast_history'),
    path('history/<int:history_id>/', BroadcastHistoryDetailView.as_view(), name='broadcast_history_detail'),
    path('history/audio/<int:history_id>/download/', download_history_audio, name='history_audio_download'),
    
    # 어드민 전용 API
    path('admin/history/', AdminBroadcastHistoryView.as_view(), name='admin_broadcast_history'),
    path('admin/previews/', AdminPreviewListView.as_view(), name='admin_preview_list'),
    
    # 오디오 파일 관리
    path('audio/upload/', AudioFileView.as_view(), name='audio-upload'),
    path('audio/files/', AudioFileView.as_view(), name='audio-files'),
    path('audio/download/<int:file_id>/', download_audio_file, name='audio-download'),
    
    # 프리뷰 관련
    path('preview/audio/', AudioPreviewView.as_view(), name='audio_preview'),
    path('preview/text/', TextPreviewView.as_view(), name='text_preview'),
    path('previews/', PreviewListView.as_view(), name='preview_list'),
    path('preview/<str:preview_id>/', PreviewDetailView.as_view(), name='preview_detail'),
    path('preview/<str:preview_id>/approve/', PreviewApprovalView.as_view(), name='preview_approve'),
    path('preview/<str:preview_id>/reject/', PreviewRejectView.as_view(), name='preview_reject'),
    
    # 프리뷰 오디오 파일 (외부 API와 호환되는 경로)
    path('preview/<str:preview_id>.mp3', preview_audio_file, name='preview_audio_file'),
    
    # 시스템 상태
    path('status/', broadcast_status, name='broadcast_status'),
    
    # 테스트용
    path('test/external-preview/', TestExternalPreviewView.as_view(), name='test_external_preview'),
] 