FROM python:3.12-slim

WORKDIR /app

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 가상 환경 대신 시스템에 직접 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 포트 8000 노출
EXPOSE 8000

# 서버 실행
CMD ["gunicorn", "-c", "/app/gunicorn.conf.py", "config.wsgi:application"] 