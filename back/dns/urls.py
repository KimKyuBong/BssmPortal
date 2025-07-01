from django.urls import path
from .views import (
    CustomDnsRequestCreateView, CustomDnsRequestListView, MyDnsRequestListView, CustomDnsRequestApproveView, CustomDnsRequestDeleteView,
    CustomDnsRecordListView, CustomDnsRecordCreateView, CustomDnsRecordUpdateView, 
    CustomDnsRecordDeleteView, MyDnsRecordDeleteView, ApplyDnsRecordsView,
    SslCertificateListView, SslCertificateDetailView, SslCertificateRenewView, SslCertificateRevokeView,
    ExpiringCertificatesView, CertificateAuthorityView, DownloadCaCertificateView,
    GenerateCertificateView, MyDnsRecordsView, DownloadSslPackageView, OCSPView
)

urlpatterns = [
    path('request/', CustomDnsRequestCreateView.as_view()),
    path('request/list/', CustomDnsRequestListView.as_view()),
    path('request/my/', MyDnsRequestListView.as_view()),
    path('request/<int:pk>/approve/', CustomDnsRequestApproveView.as_view()),
    path('request/<int:pk>/delete/', CustomDnsRequestDeleteView.as_view()),
    path('records/', CustomDnsRecordListView.as_view()),
    path('records/create/', CustomDnsRecordCreateView.as_view()),
    path('records/<int:pk>/update/', CustomDnsRecordUpdateView.as_view()),
    path('records/<int:pk>/delete/', CustomDnsRecordDeleteView.as_view()),
    path('records/my/', MyDnsRecordsView.as_view()),
    path('records/my/<int:pk>/delete/', MyDnsRecordDeleteView.as_view()),
    path('apply/', ApplyDnsRecordsView.as_view()),
    path('ssl/certificates/', SslCertificateListView.as_view()),
    path('ssl/certificates/<int:pk>/', SslCertificateDetailView.as_view()),
    path('ssl/certificates/<int:pk>/renew/', SslCertificateRenewView.as_view()),
    path('ssl/certificates/<int:pk>/revoke/', SslCertificateRevokeView.as_view()),
    path('ssl/certificates/expiring/', ExpiringCertificatesView.as_view()),
    path('ssl/certificates/generate/', GenerateCertificateView.as_view()),
    path('ssl/ca/', CertificateAuthorityView.as_view()),
    path('ssl/ca/download/', DownloadCaCertificateView.as_view()),
    path('ssl/packages/<str:domain>/download/', DownloadSslPackageView.as_view()),
    path('ocsp/', OCSPView.as_view(), name='ocsp'),
] 