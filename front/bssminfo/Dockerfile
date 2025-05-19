FROM node:20-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 네이티브 모듈 의존성 설치
RUN apk add --no-cache libc6-compat

# package.json만 먼저 복사 (yarn.lock이 없어도 작동하도록)
COPY package.json ./

# 의존성 설치 (yarn.lock이 없어도 작동)
RUN yarn install

# 소스 코드 복사
COPY . .

# 애플리케이션 빌드
ENV NODE_ENV=production
RUN yarn build

# 프로덕션 이미지
FROM node:20-alpine

WORKDIR /app

# 프로덕션 환경 설정
ENV NODE_ENV=production

# 필요한 파일 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 포트 설정
EXPOSE 3000

# 앱 실행
CMD ["yarn", "start"]