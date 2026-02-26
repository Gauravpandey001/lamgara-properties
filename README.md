# Lamgara Properties

Mobile-first property website with an admin panel, backend API, and AWS S3 image uploads.

## Stack
- Frontend: React + Vite
- Backend: Node + Express
- Database: SQLite (file-backed)
- Media: AWS S3 (`lamgara-media-prod`)

## Data Storage
- Website content (hero, listings, spotlight, videos) is stored in SQLite DB.
- Uploaded images are stored in S3.
- Admin saves all content updates through backend API.

## Environment
Create `.env`:

```env
PORT=4000
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
S3_BUCKET=lamgara-media-prod
# Optional CloudFront/media domain
# S3_PUBLIC_BASE_URL=https://dxxxxxx.cloudfront.net
# Optional custom SQLite location
# SQLITE_DB_PATH=./server/data/lamgara.db
```

Optional frontend API base (only needed when frontend and backend are different origins):

```env
VITE_API_BASE_URL=http://localhost:4000
```

## Run Locally
Install dependencies:

```bash
npm install
```

Start backend API:

```bash
npm run dev:server
```

Start frontend:

```bash
npm run dev:client
```

Vite proxies `/api` to `http://localhost:4000` in development.

## API Endpoints
- `GET /api/health`
- `GET /api/content`
- `PUT /api/content`
- `POST /api/uploads/presign`

## Admin Flow
1. Open `/admin`.
2. Upload images (S3) and edit content.
3. Click **Save All Changes**.
4. Content persists in SQLite and is served to all clients.
