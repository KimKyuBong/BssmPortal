# Gunicorn 설정 파일

# 바인딩할 서버 주소와 포트
bind = "0.0.0.0:8000"

# 워커 프로세스 수
# 일반적으로 CPU 코어 수의 2-4배가 권장됨
workers = 4

# 워커 클래스 설정
# 'sync'는 기본값, 'gevent' 또는 'uvicorn.workers.UvicornWorker'로 변경 가능
worker_class = 'sync'

# 워커 타임아웃 (초)
timeout = 120

# 최대 요청 수 - 이 횟수 이후 worker가 재시작됨
max_requests = 1000
max_requests_jitter = 50

# 로깅 설정
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# 프로세스 이름 접두사
proc_name = 'bssm_captive'

# 데몬 모드 (백그라운드에서 실행)
daemon = False

# 작업 디렉토리
# chdir = '/app'

# 유저와 그룹 (Docker 내부에서는 보통 필요하지 않음)
# user = 'www-data'
# group = 'www-data'

# SSL 관련 설정 (필요시)
# keyfile = '/path/to/keyfile'
# certfile = '/path/to/certfile'

# Django의 WSGI 애플리케이션은 이제 Dockerfile에서 직접 지정됨