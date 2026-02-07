# Google Drive 증빙 사진 자동 업로드 설정 가이드

웹에서 세미나 증빙 사진을 업로드하면 Google Drive 지정 폴더에 자동으로 저장되도록 하는 설정 방법입니다.

---

## 1. Google Cloud에서 서비스 계정 만들기

### 1-1. 프로젝트 생성 (이미 있으면 생략)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속 후 로그인
2. 상단 프로젝트 선택 → **새 프로젝트** → 이름 입력 후 만들기

### 1-2. Drive API 사용 설정

1. 왼쪽 메뉴 **API 및 서비스** → **라이브러리**
2. "**Google Drive API**" 검색 → 선택 → **사용** 클릭

### 1-3. 서비스 계정 생성

1. **API 및 서비스** → **사용자 인증 정보**
2. **+ 사용자 인증 정보 만들기** → **서비스 계정**
3. 서비스 계정 이름 입력 (예: `attendance-drive-upload`) → **만들기 및 계속**
4. 역할은 건너뛰어도 됨 → **완료**

### 1-4. 키(JSON) 다운로드

1. 사용자 인증 정보 페이지에서 방금 만든 **서비스 계정** 클릭
2. **키** 탭 → **키 추가** → **새 키 만들기**
3. **JSON** 선택 → **만들기** (JSON 파일이 다운로드됨)
4. **서비스 계정 이메일** 복사해 두기  
   - 형식: `xxxxx@xxxxx.iam.gserviceaccount.com`  
   - 나중에 Google Drive 공유할 때 이 이메일을 사용합니다.

---

## 2. Google Drive 폴더 준비 (둘 중 하나 선택)

서비스 계정은 **자체 저장 용량이 없습니다.** 반드시 아래 ① 또는 ② 중 하나로 설정해야 합니다.

### 방법 ① 공유 드라이브 사용 (권장)

1. [Google Drive](https://drive.google.com) 접속
2. 왼쪽 **공유 드라이브** → **새로 만들기** → 이름 입력 (예: Include)
3. 만들어진 공유 드라이브 안에 **폴더** 생성 (예: `활동 사진`)
4. 공유 드라이브 우클릭 → **멤버 관리** (또는 공유 드라이브 설정)
5. **멤버 추가**에 1-4에서 복사한 **서비스 계정 이메일** 입력
6. 권한: **콘텐츠 관리자** 또는 **편집자** 선택 후 저장
7. **활동 사진** 폴더를 연 상태에서 주소창 URL 확인  
   - 예: `https://drive.google.com/drive/folders/1ABC...xyz`  
   - **`/folders/` 뒤의 `1ABC...xyz` 부분**이 **폴더 ID**입니다. 복사해 두세요.

### 방법 ② 내 드라이브 폴더 공유

1. Google Drive **내 드라이브**에 **폴더** 하나 생성 (예: `세미나 증빙`)
2. 해당 폴더 우클릭 → **공유**
3. **일반 액세스**에서 **제한됨** 유지
4. **사용자 및 그룹 추가**에 **서비스 계정 이메일** 입력
5. 권한: **편집자** 선택 후 **전송**
6. 폴더를 연 상태에서 주소창 URL 확인  
   - 예: `https://drive.google.com/drive/folders/1ABC...xyz`  
   - **`/folders/` 뒤의 문자열**이 **폴더 ID**입니다. 복사해 두세요.

---

## 3. 환경 변수 설정

### 3-1. 서비스 계정 키 값 준비

다운로드한 JSON 파일을 텍스트 에디터로 열면 아래와 비슷합니다.

```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "xxxxx@xxxxx.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

**방법 A – JSON 그대로 사용**

- 전체 내용을 **한 줄로** 붙여넣기 (줄바꿈 제거하거나, 그대로 둬도 되는 경우가 많음)
- 이 문자열을 `GOOGLE_SERVICE_ACCOUNT_KEY` 값으로 사용

**방법 B – Base64로 인코딩 (줄바꿈 이슈 방지)**

- 터미널에서:
  ```bash
  base64 -i 서비스계정키파일.json | tr -d '\n'
  ```
- 출력된 문자열을 `GOOGLE_SERVICE_ACCOUNT_KEY` 값으로 사용  
  (코드에서 Base64인 경우 자동으로 디코딩합니다)

### 3-2. 로컬 개발 (.env.local)

프로젝트 루트에 `.env.local` 파일을 만들고 다음 두 개를 넣습니다.

```env
# Google Drive 증빙 업로드
GOOGLE_SERVICE_ACCOUNT_KEY="여기에_JSON_전체_또는_Base64_문자열"
GOOGLE_DRIVE_FOLDER_ID="2단계에서_복사한_폴더_ID"
```

- `GOOGLE_SERVICE_ACCOUNT_KEY`: 3-1에서 준비한 값
- `GOOGLE_DRIVE_FOLDER_ID`: 2단계에서 복사한 **폴더 ID** (공유 드라이브 안의 "활동 사진" 또는 공유한 "세미나 증빙" 폴더)

### 3-3. Vercel 배포

1. [Vercel](https://vercel.com) → 해당 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 아래 두 개 추가:

| Name | Value |
|------|--------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | 3-1에서 준비한 JSON 또는 Base64 문자열 |
| `GOOGLE_DRIVE_FOLDER_ID` | 2단계에서 복사한 폴더 ID |

4. **Save** 후 **Redeploy** 한 번 실행

---

## 4. 동작 확인

1. 웹/앱에 로그인
2. 세미나 상세 → **증빙자료 제출** (또는 증빙 폴더 생성) 클릭
3. 사진 선택 후 **업로드**
4. Google Drive에서 위에서 설정한 폴더를 열어보기  
   - **세미나명_YYYYMMDD** 형태의 하위 폴더가 생기고, 그 안에 파일이 있으면 성공입니다.

---

## 5. 문제 해결

### 5-1. "이미 공유 드라이브로 설정했는데 안 돼요" 체크리스트

아래를 **순서대로** 확인하세요.

| # | 확인 항목 | 어떻게 확인할까요 |
|---|-----------|-------------------|
| 1 | **서비스 계정이 공유 드라이브 멤버인가?** | Google Drive → 해당 **공유 드라이브** 우클릭 → **멤버 관리** → 멤버 목록에 `xxxxx@xxxxx.iam.gserviceaccount.com` 형태의 이메일이 **편집자** 또는 **콘텐츠 관리자**로 있는지 확인. 없으면 **멤버 추가**로 서비스 계정 이메일(JSON 키의 `client_email`) 추가 |
| 2 | **폴더 ID를 올바르게 넣었나?** | `GOOGLE_DRIVE_FOLDER_ID`에는 **폴더를 연 상태의 URL**에서 `/folders/` **뒤에 오는 ID만** 넣어야 합니다. 공유 드라이브 **루트**가 아니라, 그 안의 **폴더**(예: 활동 사진)를 연 뒤 URL에서 복사하는 것을 권장. 예: `https://drive.google.com/drive/folders/1ABC...xyz` → `1ABC...xyz` (따옴표·공백 없이) |
| 3 | **환경 변수가 배포에 반영됐나?** | Vercel 사용 시: **Settings** → **Environment Variables**에 두 변수 모두 있고, **값 수정 후에는 반드시 Redeploy** 했는지 확인. 로컬이면 `.env.local` 저장 후 서버 재시작 |
| 4 | **서비스 계정과 Drive가 같은 계정인가?** | JSON 키를 준 **Google Cloud 프로젝트**에서 만든 서비스 계정 이메일과, 공유 드라이브에 추가한 이메일이 **완전히 동일**한지 확인 (복사·붙여넣기 권장) |

**여전히 "Service Accounts do not have storage quota"가 나오면**  
→ `GOOGLE_DRIVE_FOLDER_ID`가 **실제로 공유 드라이브 안의 폴더**(또는 공유 드라이브 루트) ID가 맞는지 다시 확인. 실수로 **다른 프로젝트의 폴더 ID**나 **내 드라이브의 다른 폴더** ID를 넣었을 수 있습니다.

### 5-2. 증상별 요약

| 증상 | 확인할 것 |
|------|------------|
| "Service Accounts do not have storage quota" | `GOOGLE_DRIVE_FOLDER_ID`가 **공유 드라이브 안 폴더** 또는 **서비스 계정과 공유한 폴더** ID인지 확인. 서비스 계정 "내 드라이브" 루트/폴더는 사용 불가 |
| "Google Drive configuration is missing" | `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`가 실제로 설정되어 있는지 확인 (Vercel이면 재배포 후 적용 여부 확인) |
| "Permission denied" / 403 | Google Drive에서 해당 폴더(또는 공유 드라이브)에 **서비스 계정 이메일**이 **편집자** 이상으로 추가되어 있는지 확인 |
| 날짜가 하루 밀림 | 코드에서 이미 한국 시간(Asia/Seoul)으로 처리 중. 서버 재배포 후 다시 업로드해 보기 |

---

## 요약

1. **Google Cloud**: 프로젝트 생성 → Drive API 사용 → 서비스 계정 생성 → JSON 키 다운로드, 서비스 계정 이메일 복사  
2. **Google Drive**: 공유 드라이브(또는 내 드라이브 폴더)에 **활동 사진용 폴더** 만들고, **서비스 계정 이메일**을 편집자로 공유 → 폴더 ID 복사  
3. **환경 변수**: `GOOGLE_SERVICE_ACCOUNT_KEY`(JSON 또는 Base64), `GOOGLE_DRIVE_FOLDER_ID`(폴더 ID)를 `.env.local`과 Vercel에 설정  
4. **재배포** 후 웹에서 증빙 업로드 → Drive에 `세미나명_YYYYMMDD` 폴더와 파일 생성 여부 확인  

이 순서대로 설정하면 이미지 자동 업로드 기능을 사용할 수 있습니다.
