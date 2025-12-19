# MCP Server Dockerfile
FROM python:3.12-slim

WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# uv 설치
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# 의존성 파일 복사
COPY requirements.txt .

# uv로 의존성 설치 (가상환경 없이 시스템 패키지로)
RUN uv pip install --system -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 환경 변수 설정
ENV PYTHONUNBUFFERED=1
ENV DJANGO_API_URL=http://back:8000

# 실행
CMD ["python", "server.py"]
