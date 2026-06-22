# admin

Google OAuth 인증을 통과해야 접근할 수 있는 관리자 페이지와 Docker 기반 배포 템플릿입니다.

## Local setup

필요하면 `.env.example`을 복사해서 포트나 이미지명을 바꿔 사용할 수 있습니다.

```bash
cp .env.example .env
```

GCP에서 API key가 아니라 OAuth 2.0 Client의 `Client ID`와 `Client Secret`을 발급받아 넣으면 됩니다.

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8001/auth/google/callback
SESSION_SECRET_KEY=...
DATAHUB_DATABASE_FILE=../datahub/datahub.db
DATAHUB_UPLOAD_DIR=../datahub/uploads
```

GCP Authorized redirect URI에는 로컬 기준으로 아래 주소를 등록하세요.

```text
http://localhost:8001/auth/google/callback
```

## Local development

```bash
docker compose up --build
```

브라우저에서 `http://localhost:8001`으로 접속하면 Google 로그인 화면이 뜹니다. 인증 성공 후 `/admin/tree`에서 문서 트리를 추가/수정/삭제할 수 있습니다. `/admin`으로 접근해도 같은 트리 관리 화면으로 이동합니다.

Docker Compose에서는 `../datahub`를 `/datahub`로 마운트해서 datahub 앱과 같은 SQLite DB 및 업로드 폴더를 공유합니다.

Text editor 빌드 결과물은 admin 앱이 `admin/text_editor_dist`에서 서빙합니다. 에디터 소스가 바뀌면 admin 폴더에서 아래 명령으로 다시 반영하세요.

```bash
./build-text-editor.sh
```

## Production with Docker Swarm

운영 배포 전 `.env`의 `IMAGE_NAME`을 registry 주소가 포함된 이미지명으로 바꿔주세요.

```bash
IMAGE_NAME=registry.example.com/admin:latest
STACK_NAME=admin
APP_ENV=production
PORT=8000
SESSION_COOKIE_SECURE=true
```

이미 빌드/푸시된 이미지를 Swarm에 배포할 때:

```bash
./deploy.sh
```

현재 소스를 빌드하고 push한 뒤 Swarm에 배포할 때:

```bash
./build-deploy.sh
```

`build-deploy.sh`는 기본적으로 `docker push`를 실행합니다. 로컬 Swarm에서만 테스트하고 push가 필요 없다면:

```bash
PUSH_IMAGE=false ./build-deploy.sh
```

## Health check

```bash
curl http://localhost:8001/health
```
