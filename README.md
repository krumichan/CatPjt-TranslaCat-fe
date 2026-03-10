This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## 디렉토리 구조
```text
src/
├── app/                  # Routing & Layout (Spring의 Controller 역할)
│   ├── (auth)/           # Route Group (URL에 영향 없음)
│   │   └── login/
│   │       └── page.tsx  # /login 페이지
│   ├── api/              # Route Handlers (Backend API 역할)
│   │   └── auth/
│   │       └── [...nextauth]/route.ts
│   ├── layout.tsx        # 공통 레이아웃
│   └── page.tsx          # 메인 페이지 (/)
├── components/           # 재사용 가능한 UI 컴포넌트
│   ├── common/           # Button, Input 등 공통 UI
│   └── auth/             # LoginButton 등 도메인별 컴포넌트
├── hooks/                # Custom Hooks
├── lib/                  # 외부 라이브러리 설정 (Prisma, NextAuth 등)
├── services/             # API 호출 로직 (Spring의 Service 계층과 유사)
└── types/                # TypeScript 인터페이스/타입 정의
```