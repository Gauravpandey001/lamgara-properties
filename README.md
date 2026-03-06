# Lamgara Properties

Mobile-first property website with an admin panel, backend API, and AWS S3 image uploads.

## Stack
- Frontend: React + Vite
- Backend: Node + Express
- Database: SQLite (file-backed)
- Media: AWS S3 (`lamgara-media-prod`)

## Data Storage
- Website content (hero, listings, spotlight flags, videos) is stored in SQLite DB.
- Contact inquiries are stored in SQLite DB.
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
PUBLIC_BASE_URL=http://localhost:4000
# Optional CORS allow-list (comma-separated).
# If omitted, localhost/127.0.0.1 origins are allowed.
# CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
ADMIN_USERNAME=YOUR_ADMIN_USERNAME
# Use either ADMIN_PASSWORD or ADMIN_PASSWORD_HASH.
# To generate hash: echo -n "your-password" | shasum -a 256
# ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD
ADMIN_PASSWORD_HASH=sha256:YOUR_SHA256_PASSWORD_HASH
ADMIN_JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
ADMIN_TOKEN_TTL_SECONDS=43200
# Optional "nearby" radius for location search results
# SEARCH_NEARBY_RADIUS_KM=60
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
For production serving through Express, run `npm run build` so `dist/assets` exists.

## API Endpoints
- `GET /api/health`
- `GET /api/content`
- `PUT /api/content`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/inquiries`
- `GET /api/geocode`
- `GET /api/search/properties?q=<locality>&category=<type>`
- `POST /api/uploads/presign`

## SEO Files
- `robots.txt` and `sitemap.xml` are served dynamically by the backend using `PUBLIC_BASE_URL` (or request host if unset).
- Static files in `public/` are development fallbacks.

## Admin Flow
1. Open `/admin`.
2. Upload images (S3) and edit content.
3. Click **Save All Changes**.
4. Content persists in SQLite and is served to all clients.
