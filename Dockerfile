# 1. 의존성 설치 단계
FROM public.ecr.aws/docker/library/node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. 빌드 단계
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ($NEXT_PUBLIC_API_URL <- 값 주입은 CodeBuild 환경변수 추가로 주입 )
# [추가] CodeBuild에서 넘겨줄 인자(ARG) 정의
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL

# [추가] 인자를 환경 변수(ENV)로 변환해서 빌드에 반영
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build

# 3. 실행 단계
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# 보안을 위해 루트 권한이 아닌 별도 유저 사용
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 빌드 결과물 중 실행에 필요한 파일만 복사 (Standalone 모드)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# 서버 실행
CMD ["node", "server.js"]