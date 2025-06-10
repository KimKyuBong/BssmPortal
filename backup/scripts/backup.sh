#!/bin/bash

# 로그 디렉토리 생성
mkdir -p /backup/logs
mkdir -p /backup/data

while true; do
    DATE=$(date +%Y%m%d_%H%M%S)
    LOG_FILE="/backup/logs/backup_${DATE}.log"
    
    echo "=== 백업 시작: $(date) ===" >> "$LOG_FILE"
    
    # KEA 데이터베이스 백업
    echo "KEA 데이터베이스 백업 시작..." >> "$LOG_FILE"
    if mysqldump -h "$KEA_DATABASE_HOST" -u "$BACKUP_USER" -p"$BACKUP_PASSWORD" "$KEA_DATABASE_NAME" > "/backup/data/kea_db_backup_${DATE}.sql"; then
        echo "KEA 백업 성공" >> "$LOG_FILE"
        gzip "/backup/data/kea_db_backup_${DATE}.sql"
    else
        echo "KEA 백업 실패" >> "$LOG_FILE"
    fi
    
    # BSSM 데이터베이스 백업
    echo "BSSM 데이터베이스 백업 시작..." >> "$LOG_FILE"
    if mysqldump -h "$BSSM_DATABASE_HOST" -u "$BACKUP_USER" -p"$BACKUP_PASSWORD" "$BSSM_DATABASE_NAME" > "/backup/data/bssm_db_backup_${DATE}.sql"; then
        echo "BSSM 백업 성공" >> "$LOG_FILE"
        gzip "/backup/data/bssm_db_backup_${DATE}.sql"
    else
        echo "BSSM 백업 실패" >> "$LOG_FILE"
    fi
    
    # 30일이 지난 백업 파일 삭제
    echo "오래된 백업 파일 정리 중..." >> "$LOG_FILE"
    find /backup/data -name "kea_db_backup_*.sql.gz" -type f -mtime +30 -delete
    find /backup/data -name "bssm_db_backup_*.sql.gz" -type f -mtime +30 -delete
    
    echo "=== 백업 완료: $(date) ===" >> "$LOG_FILE"
    echo "----------------------------------------" >> "$LOG_FILE"
    
    sleep 86400
done 