# Debian Bullseye를 베이스 이미지로 사용
FROM debian:bullseye-slim

# 환경 변수 설정
ENV DEBIAN_FRONTEND=noninteractive

# ISC Kea 2.6.1 저장소 추가 및 필수 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    ca-certificates \
    default-mysql-client \
    gettext-base \
    && curl -1sLf "https://dl.cloudsmith.io/public/isc/kea-2-6/setup.deb.sh" | bash \
    && apt-get update && apt-get install -y --no-install-recommends \
    isc-kea-dhcp4-server \
    isc-kea-admin \
    isc-kea-hooks \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 로그 디렉토리 생성 및 권한 설정
RUN mkdir -p /var/log/kea && chmod -R 777 /var/log/kea

# 설정 파일 및 데이터 디렉토리 마운트 지점 생성
VOLUME ["/etc/kea", "/var/lib/kea"]

# 시작 스크립트 추가
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

# 시작 스크립트를 통해 실행
ENTRYPOINT ["/entrypoint.sh"]
