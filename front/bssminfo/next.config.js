/** @type {import('next').NextConfig} */
const nextConfig = {
  // 프로덕션 환경에서는 정적 내보내기 활성화
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    images: {
      unoptimized: true
    },
    trailingSlash: true
  }),
  
  // 개발 환경에서는 기본 설정 사용
  ...(process.env.NODE_ENV === 'development' && {
    images: {
      unoptimized: true
    },
    trailingSlash: true
  })
}

module.exports = nextConfig