from django.urls import path
from .views import (
    CustomDnsRequestCreateView, CustomDnsRequestListView, MyDnsRequestListView, CustomDnsRequestApproveView,
    CustomDnsRecordListView, CustomDnsRecordCreateView, CustomDnsRecordUpdateView, 
    CustomDnsRecordDeleteView, MyDnsRecordDeleteView, ApplyDnsRecordsView
)

urlpatterns = [
    path('request/', CustomDnsRequestCreateView.as_view()),
    path('request/list/', CustomDnsRequestListView.as_view()),
    path('request/my/', MyDnsRequestListView.as_view()),
    path('request/<int:pk>/approve/', CustomDnsRequestApproveView.as_view()),
    path('records/', CustomDnsRecordListView.as_view()),
    path('records/create/', CustomDnsRecordCreateView.as_view()),
    path('records/<int:pk>/update/', CustomDnsRecordUpdateView.as_view()),
    path('records/<int:pk>/delete/', CustomDnsRecordDeleteView.as_view()),
    path('records/my/<int:pk>/delete/', MyDnsRecordDeleteView.as_view()),
    path('apply/', ApplyDnsRecordsView.as_view()),
] 