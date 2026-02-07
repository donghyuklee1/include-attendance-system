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



# 동아리 세미나 관리 시스템 (Include Attendance Check)

## 🎯 프로젝트 개요

동아리의 세미나/스터디 운영을 효율적으로 관리하기 위한 웹 애플리케이션입니다. 기존의 수기 관리 방식(구글 폼, 카카오톡 등)을 자동화하여 세미나 개설부터 출석 관리까지 통합된 플랫폼을 제공합니다.

### 🔍 벤치마킹 분석
- **KUCheck (고려대 KUCC)**: React + Firebase 기반, 출석 관리 자동화에 중점
- **PoolC (연세대)**: 학기별 세미나 관리, 카드형 UI, 회차별 상세 정보 제공

## 🚀 기술 스택

### Frontend
- **Next.js 14+** - React 기반 풀스택 프레임워크
- **TypeScript** - 타입 안정성 및 개발 생산성
- **shadcn/ui** - 현대적이고 접근성 좋은 UI 컴포넌트
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크

### Backend & Database
- **Supabase** - PostgreSQL 기반 BaaS
  - Authentication (사용자 인증)
  - Real-time Database (실시간 데이터 동기화)
  - Row Level Security (세밀한 권한 관리)
  - Storage (파일 업로드)

### Deployment & Infrastructure
- **Vercel** - Next.js 최적화 배포 플랫폼
- **Domain & SSL** - 안전한 HTTPS 연결

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Vercel        │
│   (Next.js)     │◄──►│   Database      │    │   Deployment    │
│   - shadcn/ui   │    │   - Auth        │    │   - Edge CDN    │
│   - TypeScript  │    │   - Real-time   │    │   - Auto Scale  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 핵심 기능

### 1. 사용자 관리 및 권한 시스템
- **관리자**: 전체 시스템 관리, 학기 생성, 사용자 권한 부여
- **세미나장**: 세미나 개설, 출석 관리, 회차별 내용 관리
- **일반회원**: 세미나 신청, 개인 출석 현황 조회

### 2. 세미나/스터디 관리
- **세미나 개설**: 제목, 설명, 정원, 일정, 태그 설정
- **학기별 관리**: 2025-1, 2024-2 등 학기별 세미나 분류
- **회차별 관리**: 각 회차의 날짜, 주제, 학습 내용 상세 기록
- **카테고리 태그**: #기초, #백엔드, #프론트엔드, #AI 등

### 3. 신청 및 수강 관리
- **실시간 신청**: 정원 대비 신청 현황 실시간 표시
- **선착순/선발제**: 신청 방식 선택 가능
- **신청 기간 설정**: 시작/종료 시간 자동 관리

### 4. 출석 관리 시스템
- **QR 코드 출석**: 빠른 출석 체크 시스템
- **수동 출석**: 세미나장의 직접 출석 관리
- **출석률 계산**: 개인별/세미나별 통계 자동 생성
- **최소 활동 기준**: 동아리 규정에 따른 활동 기준 체크

### 5. 대시보드 및 통계
- **개인 대시보드**: 신청 세미나, 출석률, 활동 기록
- **세미나장 대시보드**: 참여자 관리, 출석 현황, 회차별 통계
- **관리자 대시보드**: 전체 통계, 학기별 리포트, 사용자 관리

### 6. 커뮤니케이션
- **공지사항**: 세미나별/전체 공지 시스템
- **알림 시스템**: 이메일/인앱 알림 (신청 승인, 세미나 변경 등)
- **댓글 시스템**: 세미나 Q&A 및 피드백

## 🎨 UI/UX 디자인 컨셉

### 디자인 원칙
- **Clean & Modern**: 깔끔하고 현대적인 인터페이스
- **Mobile First**: 모바일 우선 반응형 디자인
- **Accessibility**: 웹 접근성 표준 준수
- **Intuitive**: 직관적인 사용자 경험

### 주요 화면 구성
- **메인 페이지**: 현재 진행 중인 세미나 카드 형태로 표시
- **세미나 목록**: 학기별 필터링, 태그별 검색 기능
- **세미나 상세**: 개요, 일정, 회차별 정보, 신청 상태
- **개인 대시보드**: 내 세미나, 출석률, 활동 히스토리

## 📊 데이터베이스 설계

### 주요 테이블 구조
```sql
-- 사용자 관리
users (id, email, name, role, created_at)
profiles (user_id, nickname, department, student_id)

-- 학기 및 세미나 관리
semesters (id, name, start_date, end_date, is_active)
seminars (id, title, description, capacity, semester_id, owner_id)
sessions (id, seminar_id, session_number, date, topic, content)

-- 신청 및 출석 관리
enrollments (id, user_id, seminar_id, status, enrolled_at)
attendances (id, user_id, session_id, status, checked_at)

-- 공지 및 커뮤니케이션
announcements (id, seminar_id, title, content, created_by)
comments (id, seminar_id, user_id, content, created_at)
```

## 🚦 개발 로드맵

### Phase 1: 기본 인프라 (2주)
- [x] 프로젝트 초기 설정
- [ ] Next.js + TypeScript 환경 구성
- [ ] Supabase 프로젝트 생성 및 연동
- [ ] shadcn/ui 기본 컴포넌트 설정
- [ ] 인증 시스템 구현      

### Phase 2: 핵심 기능 개발 (4주)
- [ ] 사용자 관리 및 권한 시스템
- [ ] 세미나 CRUD 기능
- [ ] 학기별 관리 시스템
- [ ] 기본 신청 시스템

### Phase 3: 고급 기능 (3주)
- [ ] 출석 관리 시스템
- [ ] QR 코드 출석 체크
- [ ] 대시보드 및 통계
- [ ] 알림 시스템

### Phase 4: UI/UX 개선 및 최적화 (2주)
- [ ] 반응형 디자인 완성
- [ ] 성능 최적화
- [ ] 접근성 개선
- [ ] 사용자 테스트 및 피드백 반영

### Phase 5: 배포 및 운영 (1주)
- [ ] Vercel 배포 설정
- [ ] 도메인 연결 및 SSL 설정
- [ ] 모니터링 및 로그 시스템
- [ ] 백업 및 보안 설정

## 🔧 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn
- Git

### 로컬 개발 시작하기
```bash
# 프로젝트 클론
git clone [repository-url]
cd include_attendance_check

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local에 Supabase 키 설정

# 개발 서버 실행
npm run dev
```

### Google Drive 설정 (세미나 증빙 사진 동기화)

웹에서 업로드한 증빙 사진을 Google Drive에 저장하려면 **서비스 계정은 자체 저장 용량이 없습니다.**  
반드시 아래 둘 중 하나로 설정해야 합니다.

1. **Shared Drive 사용 (권장)**  
   - Google Drive에서 **공유 드라이브**를 만든 뒤, 서비스 계정 이메일을 멤버로 추가(편집 권한)  
   - 공유 드라이브 안에 폴더를 만들고, 그 폴더 ID를 `GOOGLE_DRIVE_FOLDER_ID`로 설정  

2. **일반 사용자 Drive 폴더 공유**  
   - 본인 Google Drive에 폴더를 만들고, 서비스 계정 이메일과 **편집 권한**으로 공유  
   - 해당 폴더 ID를 `GOOGLE_DRIVE_FOLDER_ID`로 설정  

환경 변수: `GOOGLE_SERVICE_ACCOUNT_KEY`(JSON 또는 Base64), `GOOGLE_DRIVE_FOLDER_ID`  
참고: [Google 지원 - 서비스 계정 저장 공간](https://support.google.com/a/answer/7281227)

## 📈 성공 지표

### 기술적 목표
- **성능**: Core Web Vitals 기준 점수 90+ 달성
- **접근성**: WCAG 2.1 AA 수준 준수
- **보안**: Supabase RLS 기반 데이터 보안 구현

### 사용성 목표
- **사용자 만족도**: 5점 만점 4.5점 이상
- **기능 사용률**: 핵심 기능 80% 이상 활용
- **관리 효율성**: 기존 대비 업무 시간 50% 단축

## 🤝 기여 가이드

### 개발 규칙
- TypeScript strict mode 사용
- ESLint + Prettier 코드 스타일 준수
- 컴포넌트 단위 테스트 작성
- 의미 있는 커밋 메시지 작성

### Pull Request 가이드
1. feature 브랜치에서 개발
2. 코드 리뷰 후 master 브랜치 머지
3. 배포 전 staging 환경에서 테스트

---

**프로젝트 시작일**: 2025년 1월
**예상 완료일**: 2025년 3월
**팀 구성**: Frontend/Backend 통합 개발

> 이 프로젝트는 동아리 세미나 운영의 디지털 혁신을 목표로 합니다. 효율적인 관리와 향상된 사용자 경험을 통해 더 나은 학습 환경을 만들어가겠습니다. 