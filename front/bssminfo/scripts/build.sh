#!/bin/bash

# 빌드 디렉토리로 이동
cd "$(dirname "$0")/.."

# 기존 빌드 파일 삭제
rm -rf out

# 빌드 실행
npm run build

# 파일 권한 설정
chmod -R 755 out

# Nginx 재시작
docker-compose restart nginx 