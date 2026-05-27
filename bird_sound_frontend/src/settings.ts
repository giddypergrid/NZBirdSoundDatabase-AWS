// API Configuration
// CRA exposes only env vars prefixed REACT_APP_* to the browser.
// Set REACT_APP_API_BASE_URL in:
//   .env.development.local  → local Docker backend (http://localhost:8000/birds/api)
//   Vercel project env vars → production backend (https://api.nzbirddatabase.com/birds/api)
// The fallback below is the dev default so `npm start` works out of the box.
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ?? "http://localhost:8000/birds/api";

// Bird Data Configuration
export const DEFAULT_BIRD_BATCH_SIZE = 10;


