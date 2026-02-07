# Google Drive 연동 설정 (세미나 증빙 자료)

- **세미나 개설 시**: Google Drive에 세미나명으로 폴더가 자동 생성됩니다.
- **증빙 자료 업로드 시**: 해당 세미나 폴더에 `세미나명_세미나일자` 형식으로 파일이 저장됩니다.

## 1. Google Cloud 프로젝트 설정

### 1.1 프로젝트 생성 및 API 활성화

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** → **라이브러리**에서 **Google Drive API** 검색 후 사용 설정

### 1.2 서비스 계정 생성

1. **API 및 서비스** → **사용자 인증 정보**로 이동
2. **사용자 인증 정보 만들기** → **서비스 계정** 선택
3. 서비스 계정 이름 입력 (예: `seminar-proof-materials`) 후 생성
4. 생성된 서비스 계정 클릭 → **키** 탭 → **키 추가** → **새 키 만들기**
5. **JSON** 형식 선택 후 다운로드

### 1.3 Google Drive 폴더 공유

1. Google Drive에서 증빙 자료를 저장할 **폴더** 생성
2. 해당 폴더 우클릭 → **공유**
3. 서비스 계정 JSON 파일에 있는 `client_email` (예: `xxx@project-id.iam.gserviceaccount.com`)을 **편집자** 권한으로 추가

> ⚠️ 폴더 ID 확인: Google Drive에서 해당 폴더를 열고 URL의 `folders/` 뒤 부분이 폴더 ID입니다.  
> 예: `https://drive.google.com/drive/folders/1ABC...XYZ` → `1ABC...XYZ`

## 2. 환경 변수 설정

`.env.local` 파일에 다음 변수를 추가하세요:

```bash
# Google Drive (세미나 증빙 자료)
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"xxx@project-id.iam.gserviceaccount.com","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### 설정 방법

- **GOOGLE_DRIVE_FOLDER_ID**: 위에서 확인한 저장 대상 폴더 ID
- **GOOGLE_SERVICE_ACCOUNT_KEY**: 다운로드한 JSON 파일의 전체 내용을 **한 줄 문자열**로 넣어야 합니다.
  - JSON을 한 줄로 변환하거나, `JSON.stringify(require('./service-account.json'))` 등으로 생성 가능
  - 배포 환경(Vercel 등)에서는 JSON을 이스케이프하여 한 줄로 저장

> 🔒 **보안**: `GOOGLE_SERVICE_ACCOUNT_KEY`는 절대 Git에 커밋하지 마세요. `.gitignore`에 `.env.local`이 포함되어 있는지 확인하세요.

## 3. 패키지 설치

Google Drive API용 패키지 설치:

```bash
npm install googleapis
# 또는
pnpm add googleapis
```

## 4. DB 마이그레이션

seminars 테이블에 `google_drive_folder_id` 컬럼을 추가합니다. Supabase SQL Editor에서 실행:

```sql
-- scripts/add-google-drive-folder-id.sql 내용 실행
ALTER TABLE seminars ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT;
```

## 5. 사용 방법

1. **세미나 개설**: 새 세미나를 만들면 Google Drive 루트 폴더 아래에 세미나명으로 폴더가 자동 생성됩니다.
2. **증빙 자료 업로드**: 세미나 상세 페이지 → 오른쪽 **증빙 자료 업로드** 카드 → 파일 선택 후 업로드 → 해당 세미나 폴더에 저장됩니다.

### 저장 형식

- **세미나 폴더** (개설 시 생성): `{세미나명}` (예: `React_기초`)
- **파일** (업로드 시): `{세미나명}_{YYYY-MM-DD}_{timestamp}.{확장자}` (예: `React_기초_2025-02-07_1736245123456.jpg`)

> 기존에 `google_drive_folder_id`가 없는 세미나는 업로드 시 기존 방식으로 `{세미나명}_{날짜}` 하위 폴더를 만들어 저장합니다.
