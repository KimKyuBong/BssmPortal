#!/bin/bash

# 템플릿에서 실제 설정 파일 생성
envsubst < /etc/kea/kea-dhcp4.conf.template > /etc/kea/kea-dhcp4.conf

# 설정 파일 권한 설정
chmod 644 /etc/kea/kea-dhcp4.conf

# MySQL 연결 정보 추출 (환경 변수 또는 설정 파일에서)
# network_mode: "host"를 사용하므로 항상 127.0.0.1 사용
DB_HOST="127.0.0.1"
DB_PORT="${KEA_DATABASE_PORT:-3306}"
DB_USER="${KEA_DATABASE_USER:-kea}"
DB_PASSWORD="${KEA_DATABASE_PASSWORD}"
DB_NAME="${KEA_DATABASE_NAME:-kea}"

# MySQL이 준비될 때까지 대기
echo "Waiting for MySQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # MySQL 연결 테스트 (TCP 소켓 연결 확인)
    if timeout 2 bash -c "</dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
        # MySQL 클라이언트로 실제 연결 테스트
        if mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT 1;" "${DB_NAME}" >/dev/null 2>&1; then
            echo "MySQL is ready!"
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "MySQL not ready yet, waiting... (${RETRY_COUNT}/${MAX_RETRIES})"
        sleep 2
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: MySQL connection failed after ${MAX_RETRIES} retries"
    exit 1
fi

# KEA DHCP 서버 실행
exec kea-dhcp4 -d -c /etc/kea/kea-dhcp4.conf 