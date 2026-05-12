# DengueShield AI - Early Warning System

Production-ready AI-native full-stack starter for dengue risk monitoring.

## Architecture

1. **User Interaction Layer**: React + Tailwind frontend (`client`)
2. **Application Logic Layer**: Express REST APIs (`server/src/routes`, `controllers`)
3. **AI Intelligence Layer**: Rule-based risk + explainability (`server/src/services`)
4. **Knowledge Retrieval Layer (RAG-ready)**: modular service boundary (`server/src/services`)
5. **Data Layer**: MongoDB + Mongoose models (`server/src/models`)
6. **Deployment-ready Infra**: env-driven config, security middleware, JWT auth

Data flow: `input -> processing -> AI reasoning -> output -> feedback loop`

## Folder Structure

```text
DengueShield/
  client/
    src/
      components/
      context/
      pages/
      translations/
      api.js
      i18n.js
  server/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      app.js
      server.js
    .env.example
```

## Core Features Implemented

- JWT auth + role-based access (`admin`, `user`)
- Daily symptom entry and historical tracking
- 3/7 day trend analytics with charts
- AI risk score (0-100) + risk level (Low/Medium/High/Critical)
- Explainable AI reasoning output
- Critical phase detection (day 3-7 + fever drop + warning signs)
- AI doctor report generation (structured placeholder)
- Rash image upload placeholder endpoint
- Family shareable read-only dashboard
- Nearby hospital finder (geolocation + Google Maps links)
- Multi-language toggle (English/Bangla)
- Admin dashboard for users, records, and high-risk monitoring

## Backend API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/health/dashboard`
- `POST /api/health/records`
- `POST /api/health/records/:recordId/rash`
- `POST /api/health/family/share-link`
- `GET /api/health/family/:token`
- `POST /api/reports`
- `GET /api/reports`
- `GET /api/admin/overview` (admin)
- `GET /api/admin/users` (admin)
- `GET /api/admin/records` (admin)
- `GET /api/hospitals/nearby?lat=...&lng=...`

## Run Locally

### 1) Backend

```bash
cd server
copy .env.example .env
# Fill MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

### 2) Frontend

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

### 3) Docker Deployment

```bash
docker compose up --build
```

## Future AI Plug-ins

- XGBoost risk classifier replacement in `riskEngine`
- SHAP explanation module
- RAG retriever with WHO/vector DB integration
- Gemini API integration for medical report generation

## Security Note

Do not commit real database passwords or JWT secrets. Use environment variables only.
