#!/bin/bash

# 프론트엔드 디렉토리로 이동
cd front/bssminfo

# npm 패키지 설치
echo "Installing npm packages..."
npm install

# 프로덕션 빌드 실행
echo "Building frontend..."
npm run build

# 빌드 성공 여부 확인
if [ $? -eq 0 ]; then
    echo "Build successful!"
    
    # nginx 컨테이너 재시작
    echo "Restarting nginx container..."
    docker-compose restart nginx
    
    if [ $? -eq 0 ]; then
        echo "Nginx container restarted successfully!"
    else
        echo "Failed to restart nginx container."
        exit 1
    fi
else
    echo "Build failed!"
    exit 1
fi 