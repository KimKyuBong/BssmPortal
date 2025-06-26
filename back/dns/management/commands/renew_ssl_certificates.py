from django.core.management.base import BaseCommand
from django.utils import timezone
from dns.models import SslCertificate
from dns.ssl_utils import renew_ssl_certificate
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'SSL 인증서 자동 갱신 (만료 30일 전)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='만료 몇 일 전에 갱신할지 설정 (기본값: 30일)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='실제 갱신하지 않고 갱신 대상만 출력'
        )

    def handle(self, *args, **options):
        days_threshold = options['days']
        dry_run = options['dry_run']
        
        self.stdout.write(f'만료 {days_threshold}일 전 인증서 갱신 작업을 시작합니다...')
        
        # 만료 예정 인증서 조회
        threshold_date = timezone.now() + timezone.timedelta(days=days_threshold)
        expiring_certs = SslCertificate.objects.filter(
            expires_at__lte=threshold_date,
            status='활성'
        )
        
        if not expiring_certs.exists():
            self.stdout.write(
                self.style.SUCCESS(f'갱신이 필요한 인증서가 없습니다.')
            )
            return
        
        self.stdout.write(f'갱신 대상 인증서: {expiring_certs.count()}개')
        
        renewed_count = 0
        failed_count = 0
        
        for cert in expiring_certs:
            self.stdout.write(f'처리 중: {cert.domain} (만료일: {cert.expires_at})')
            
            if dry_run:
                self.stdout.write(f'  -> [DRY RUN] 갱신 예정')
                continue
            
            try:
                renewed_cert = renew_ssl_certificate(cert)
                renewed_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'  -> 갱신 완료 (새 만료일: {renewed_cert.expires_at})')
                )
                logger.info(f'SSL 인증서 자동 갱신 완료: {cert.domain}')
                
            except Exception as e:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(f'  -> 갱신 실패: {str(e)}')
                )
                logger.error(f'SSL 인증서 자동 갱신 실패 ({cert.domain}): {e}')
        
        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'갱신 작업 완료 - 성공: {renewed_count}개, 실패: {failed_count}개'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN 모드 - 실제 갱신은 수행되지 않았습니다.')
            ) 