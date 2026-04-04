# ScreenFlow — Project Summary Log

## Deployment

- **Platform:** Railway
- **Live URL:** screenflow-production-0576.up.railway.app
- **Server:** Express serving a Vite SPA build (`dist/`) with a catch-all fallback to `index.html` for client-side routing
- **Start command:** `npm run build && node server.js`

## Stripe Integration

- **Mode:** Live
- **Product:** ScreenFlow — $15/month subscription
- **Price ID:** `price_1TIK7LDrJ1YnwWrt8cD7xjjM`
- **Library:** `@stripe/stripe-js` (client-side Checkout via `redirectToCheckout`)
- **Files updated:**
  - `src/pages/Paywall.jsx` — Stripe Checkout redirect for expired trials
  - `src/pages/Settings.jsx` — Resubscribe button + `session_id` handling to activate subscription in Supabase

## Environment Variables (Railway)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side) |
| `VITE_STRIPE_PRICE_ID` | Stripe Price ID for $15/month plan |
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side) |

## Subscription Flow

1. New users get a **14-day free trial** (no payment required)
2. Trial status tracked in Supabase `operator_profile` table (`subscription_status`, `trial_start`, `trial_end`)
3. When trial expires, users are redirected to `/paywall`
4. Paywall redirects to Stripe Checkout for payment
5. On success, Stripe redirects to `/settings?session_id=...` which sets `subscription_status: 'active'` in Supabase
