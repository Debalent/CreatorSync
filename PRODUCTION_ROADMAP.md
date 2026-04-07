# CreatorSync — Production Roadmap
**Target: June 1, 2026 | Atlas School Capstone | Graduation: August 14, 2026**

---

## Current Status (April 6, 2026)

### ✅ Already Built
- Full Node.js/Express backend with 15+ route modules
- JWT authentication + WebSocket auth middleware
- Socket.IO real-time collaboration
- Beat marketplace, payments (Stripe), subscriptions
- Audio processing pipeline (multer + FFmpeg + music-metadata)
- Redis caching layer
- Winston structured logging
- Rate limiting (4 tiers)
- Multi-language support (EN/DE/ES/FR)
- Swagger API docs
- Docker + docker-compose
- Dockerfile (multi-stage, non-root)
- MongoDB + Mongoose models
- Unit + integration test scaffolding
- Render deployment config (`render.yaml`)

### 🔴 Fixed Today (April 6)
- Added missing `socket.io`, `uuid`, `redis`, `swagger-ui-express`, `swagger-jsdoc` to `package.json`
- Added `jest`, `supertest`, `nodemon` to devDependencies
- CORS updated to support **comma-separated origins** — local + CloudFront + custom domain
- Socket.IO CORS synced to same multi-origin list
- GitHub Actions workflow: `deploy-frontend.yml` (S3 + CloudFront)
- GitHub Actions workflow: `test.yml` (CI test runner)
- AWS S3 config files: `aws/s3-bucket-policy.json`, `aws/s3-website-config.json`

---

## 8-Week Sprint Plan (April 6 → June 1)

### Week 1 — Foundation & AWS Setup (April 6–13)
**Goal: Frontend live on AWS, dependencies clean, server starts**

- [ ] Run `npm install` to install all fixed dependencies
- [ ] Verify `npm start` succeeds locally with a `.env` file
- [ ] Create AWS account (if not exists) at https://aws.amazon.com
- [ ] Create S3 bucket for frontend hosting:
  - Bucket name: `creatorsync-frontend` (or your domain name)
  - Enable "Static website hosting"
  - Apply `aws/s3-bucket-policy.json` (replace `YOUR-BUCKET-NAME`)
  - Upload `public/` folder contents
- [ ] Create CloudFront distribution:
  - Origin: your S3 bucket website endpoint
  - Enable HTTPS (use ACM certificate)
  - Default root object: `index.html`
  - Error page 403/404 → `index.html` (SPA support)
- [ ] Add GitHub repository secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (e.g., `us-east-1`)
  - `S3_BUCKET_NAME`
  - `CLOUDFRONT_DISTRIBUTION_ID`
- [ ] Push to `main` → verify GitHub Actions deploys automatically
- [ ] Update `CLIENT_URL` in backend `.env` to include CloudFront URL

### Week 2 — Backend Production Hosting (April 14–20)
**Goal: API live and accessible from deployed frontend**

- [ ] Choose backend host (Render recommended — free tier works for capstone):
  - Already have `render.yaml` configured
  - OR use AWS Elastic Beanstalk if staying fully on AWS
- [ ] Set up MongoDB Atlas (free M0 tier):
  - https://cloud.mongodb.com → New Project → Free Cluster
  - Create database user, whitelist `0.0.0.0/0`
  - Copy connection string → `MONGODB_URI`
- [ ] Set up Redis (Render managed Redis, or Upstash free tier):
  - https://upstash.com → Create Redis → Copy URL → `REDIS_URL`
- [ ] Deploy backend to Render:
  - Connect GitHub repo → New Web Service
  - Build: `npm install`, Start: `npm start`
  - Set all env vars from `.env.example`
- [ ] Test: `curl https://your-api.onrender.com/api/health`
- [ ] Update `API_BASE_URL` in frontend JS files to point to Render URL

### Week 3 — Auth & Core Flows Working End-to-End (April 21–27)
**Goal: Register, login, and basic app features work in production**

- [ ] Test user registration + JWT login via deployed frontend
- [ ] Verify Beat marketplace loads beats from DB
- [ ] Verify file uploads work (or configure S3 for audio uploads)
- [ ] Test Socket.IO collaboration (WebSocket through Render/backend)
- [ ] Fix any CORS errors in browser DevTools Network tab
- [ ] Ensure all `console.log` removed from production code — use Winston only

### Week 4 — Payments & Subscriptions (April 28 – May 4)
**Goal: Stripe payments work in production**

- [ ] Create Stripe account at https://stripe.com
- [ ] Get test API keys → add to backend env vars
- [ ] Configure Stripe webhook:
  - Dashboard → Developers → Webhooks → Add endpoint
  - URL: `https://your-api.onrender.com/api/payments/webhook`
  - Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`
- [ ] Test full purchase flow: browse beat → buy → receive confirmation
- [ ] Test subscription signup (The Finisher feature gating)
- [ ] Confirm payout scheduler configured correctly

### Week 5 — Testing & Code Quality (May 5–11)
**Goal: Test suite passing, coverage respectable for capstone demo**

- [ ] Run `npm test` — identify failing tests
- [ ] Fix unit tests: `tests/unit/auth.test.js`, `logger.test.js`, `rateLimiter.test.js`
- [ ] Fix integration tests: `tests/integration/auth.test.js`, `beats.test.js`, `payments.test.js`
- [ ] Add at minimum: registration test, login test, beat listing test
- [ ] Raise coverage threshold in `jest.config.js` to at least 50%
- [ ] Run `npm run lint:fix` — clean ESLint errors
- [ ] Verify GitHub Actions test workflow passes on push

### Week 6 — Polish & Capstone Demo Prep (May 12–18)
**Goal: Demo-worthy, all critical flows presentable**

- [ ] Update `README.md` with live URLs (CloudFront + Render API)
- [ ] Add architecture diagram (draw.io or Mermaid) to docs/
- [ ] Record a short demo video walkthrough
- [ ] Verify mobile responsiveness of all main pages
- [ ] Test in Chrome, Firefox, Safari
- [ ] Fix any broken UI elements found in cross-browser testing
- [ ] Ensure error pages are friendly (404, 500)

### Week 7 — Security Hardening (May 19–25)
**Goal: Production-safe, OWASP Top 10 addressed**

- [ ] Verify Helmet CSP headers — check browser console for violations
- [ ] Confirm rate limiting is active on all sensitive routes
- [ ] Ensure no secrets are committed to git (audit with `git log --all`)
- [ ] Set `BCRYPT_SALT_ROUNDS=12` in production
- [ ] Enable HTTPS-only: force redirect HTTP → HTTPS
- [ ] Add `Strict-Transport-Security` header (via Helmet or CloudFront)
- [ ] Review all file upload validation (MIME type + extension)
- [ ] Confirm MongoDB user has read/write only (no admin) privileges

### Week 8 — Final Verification & Buffer (May 26 – June 1)
**Goal: Everything works, documented, ready to submit**

- [ ] Full end-to-end manual test pass (all user flows)
- [ ] Confirm all GitHub Actions pass (test + deploy)
- [ ] Update `PRODUCTION_LAUNCH_CHECKLIST.md` — check off completed items
- [ ] Prepare capstone presentation materials:
  - Live URL
  - Architecture overview
  - Key technical decisions
  - Challenges solved
- [ ] Tag release: `git tag v1.0.0-production`

---

## AWS Architecture (Frontend)

```
User Browser
    │
    ▼
CloudFront (HTTPS CDN)
    │  ← global edge caching, SSL/TLS
    ▼
S3 Bucket (Static Website Hosting)
    │  ← HTML, CSS, JS, images
    │
    └─── API calls ──→ Backend API (Render or AWS EB)
                              │
                        MongoDB Atlas + Redis
```

## GitHub Secrets Required

| Secret | Where to get it |
|--------|----------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM → Create user with S3+CloudFront permissions |
| `AWS_SECRET_ACCESS_KEY` | Same IAM user creation step |
| `AWS_REGION` | Your chosen region, e.g. `us-east-1` |
| `S3_BUCKET_NAME` | Name of your S3 bucket |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront console → distribution ID (starts with E) |

## Backend Environment Variables (Render / Production)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render default) |
| `CLIENT_URL` | `https://dxxxxxxx.cloudfront.net,https://creatorsync.io` |
| `JWT_SECRET` | 32+ char random string (use `openssl rand -base64 32`) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Upstash or Render Redis URL |
| `STRIPE_SECRET_KEY` | `sk_live_...` (or `sk_test_...` for capstone) |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook dashboard |
| `SENDGRID_API_KEY` | From SendGrid dashboard |

---

## Capstone Demo Script (Atlas School)

1. **Open CloudFront URL** — show live production site
2. **Register a new user** — JWT auth, hashed password
3. **Browse the Beat Marketplace** — real DB data, search + filter
4. **Upload a beat** — multer + audio metadata extraction
5. **Purchase a beat** — Stripe test mode payment flow
6. **Open Collaboration** — Socket.IO real-time room
7. **Show API docs** — `/api/docs` Swagger UI
8. **Show GitHub Actions** — CI/CD auto-deploy pipeline
9. **Show test coverage** — `npm test` output

---

*Last updated: April 6, 2026*
