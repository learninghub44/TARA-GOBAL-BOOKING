# TARA — Tours • Travels • Rentals • Adventures

**A multi-tenant travel marketplace built for East Africa** — vendors list tours, travel
services, car rentals, and adventure activities; TARA handles verification, discovery, and
platform billing, while customers and vendors settle bookings directly between themselves.

Vendors pay TARA a recurring platform subscription; customers pay vendors directly, off-platform,
using whatever method the vendor prefers. Built for the Kenyan/East African market from the
ground up: M-Pesa, Paystack, and Pesapal as first-class payment rails; KES-first pricing; and a
KYC pipeline sized for local business verification.

> **Note on multi-tenancy**: "Tenant" here means a vendor business (a tour operator, a car rental
> company, an adventure outfitter), not an individual customer. Customers browse and book without
> an account tied to a tenant; vendors and their staff operate inside a tenant.

---
YOU CAN BUY ME A COFEE USING THE LINK BELOW AND APPRECIATE YOU 
https://paystack.shop/pay/christech
## Table of contents

- [What TARA does](#what-tara-does)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Database](#database)
- [Payments](#payments)
- [Roles & permissions](#roles--permissions)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Scheduled jobs](#scheduled-jobs)
- [Deployment](#deployment)
- [Security notes](#security-notes)

---

## What TARA does

**For travelers (no account required to browse):**
- Discover tours, travel services, car rentals, and adventure activities by destination, price,
  and category
- Request a booking directly with a vendor; payment happens off-platform between the two of you
- Message vendors in-app, including voice/video calls over WebRTC for live support
- Leave reviews after a completed booking

**For vendors:**
- Register a business, complete KYC verification (automated via Didit, with a manual-review
  fallback), and get approved to sell
- Create and manage listings across four categories, each with its own schema (tours have
  itineraries, car rentals have vehicle specs, etc.)
- Manage bookings, respond to customer messages, and track reviews
- Subscribe to a platform plan (monthly/quarterly/annual) to unlock listing access — paid via
  Paystack, Pesapal, or M-Pesa STK push
- Buy promotional add-ons: featured listings, sponsored placement, homepage promotion, banner ads

**For platform admins:**
- Review and approve/reject vendor KYC submissions
- Monitor tenants, subscriptions, and platform-wide payments from a dashboard
- Configure which payment providers are live and which is the default — no deploy required
- Issue refunds on platform subscription payments, reconcile stuck transactions, and audit every
  webhook TARA has ever received
- Triage support tickets

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, shadcn/ui on Base UI, `lucide-react` |
| Backend / DB | Supabase (Postgres + Auth + Row Level Security + Realtime) |
| Maps | Leaflet |
| Email | Resend |
| KYC | Didit |
| Payments | Paystack, Pesapal, M-Pesa (Safaricom Daraja) |
| Real-time messaging & calls | Supabase Realtime + WebRTC signaling |
| File/image storage | Cloudflare R2 + a Cloudflare Worker for image processing |
| AI support assistant | Groq |
| Language | TypeScript throughout |

---

## Architecture

**Multi-tenancy** is enforced at the database layer via Postgres Row Level Security, not just in
application code. Every tenant-owned table (`tours`, `bookings`, `payments`, etc.) carries a
`tenant_id`, and RLS policies restrict reads/writes to:
- the service-role key (used only in trusted server code — webhooks, admin operations), or
- a platform admin (`tenant_id IS NULL AND role = 'owner'`), or
- a user whose own `tenant_id` matches the row.

**Two Supabase clients** are used deliberately:
- `src/lib/supabase/server.ts` / `client.ts` — the normal, RLS-respecting client used in
  user-facing pages and API routes. Auth comes from the request's session cookie.
- `src/lib/supabase/admin.ts` — a service-role client that bypasses RLS. Used only for payment
  webhooks (which have no user session) and admin operations that intentionally need
  cross-tenant access. Never imported into client components.

**Auth & routing** are gated by `src/middleware.ts`: unauthenticated requests to `/dashboard`,
`/vendor/*`, or `/admin/*` are redirected to login; authenticated users hitting an auth page are
bounced to their dashboard.

**RBAC** (`src/lib/rbac/utils.ts`, `src/types/rbac.ts`) layers five roles on top of tenant
membership — `owner`, `manager`, `staff`, `sales_agent`, `customer_support` — each with a fixed
permission set per resource/action. Platform admins are simply users with `role = 'owner'` and
`tenant_id = NULL`.

---

## Project structure

```
src/
├── app/
│   ├── (public marketing/browse pages)     about, contact, privacy, terms,
│   │                                       tours, travel-services, car-rentals, adventures,
│   │                                       listings/[type]/[slug], booking/[id]
│   ├── auth/                                login, register, forgot/reset password, callback
│   ├── dashboard/                           customer dashboard
│   ├── vendor/                              register, onboarding/kyc, dashboard, listings/new,
│   │                                       subscription (+callback), payments
│   ├── admin/                               dashboard, payments
│   ├── support/new/                         support ticket creation
│   └── api/
│       ├── bookings/                        create a booking
│       ├── kyc/verify/                      Didit KYC submission
│       ├── vendor/listings/                 vendor listing CRUD
│       ├── vendor/subscription/             checkout, verify
│       ├── vendor/payments/                 vendor's own payment history
│       ├── webhooks/subscription/           paystack, pesapal, mpesa callbacks
│       ├── admin/payment-providers/         enable/disable/default provider config
│       ├── admin/payments/                  platform-wide payment history, refund, reconcile
│       └── cron/subscriptions/              renewal reminders + auto-expiry
├── components/ui/                           shadcn/ui primitives (button, card, dialog, etc.)
├── lib/
│   ├── ai/assistant.ts                      Groq-backed support assistant
│   ├── audit/logger.ts                      structured audit_logs writer
│   ├── cloudflare/workers.ts                image processing via Cloudflare Worker
│   ├── email/resend.ts                      transactional email templates
│   ├── kyc/didit.ts                         Didit KYC client
│   ├── listings/queries.ts                  cross-category listing queries
│   ├── payments/                            provider clients, service layer, plans, settings
│   ├── rbac/utils.ts                        auth/permission guards
│   ├── supabase/                            server, browser, and admin (service-role) clients
│   ├── tenant/utils.ts                      tenant resolution and access guards
│   └── webrtc/signaling.ts                  WebRTC offer/answer/ICE signaling over Supabase
├── types/                                    shared TS types (listings, rbac)
└── middleware.ts                             auth-gated routing

supabase/
├── schema.sql                                base schema (run first)
├── migrations/002_...sql                     payment provider admin config, refunds, retries
└── rls_policies.sql                          all Row Level Security policies

.github/workflows/payment-cron.yml            scheduled reconciliation + reminder jobs
```

---

## Database

Postgres via Supabase. Apply in order:

1. `supabase/schema.sql` — tables, enums, indexes, triggers (invoice/reference number
   generation, `updated_at` maintenance)
2. `supabase/migrations/002_payment_admin_and_refunds.sql` — adds `payment_provider_settings`,
   `payment_refunds`, retry columns on `payments`, and reminder tracking on `subscriptions`
3. `supabase/rls_policies.sql` — Row Level Security for every table

### Core tables

| Table | Purpose |
|---|---|
| `tenants` | Vendor businesses — KYC status, subscription status, featured/sponsored flags |
| `users` | Platform + vendor-staff users, role-based (`user_role` enum) |
| `tours`, `travel_services`, `car_rentals`, `adventure_activities` | The four listing types, each with category-specific columns |
| `bookings` | Customer bookings against any listing type (`listing_type` discriminator) |
| `conversations` / `messages` | In-app messaging between customers, vendors, and support |
| `webrtc_signals` | Ephemeral offer/answer/ICE rows for voice/video calls, delivered via Realtime and deleted after use |
| `reviews` | Post-booking reviews |
| `support_tickets` | Customer/vendor support requests, auto-numbered `TKT-YYYYMMDD-######` |
| `kyc_verifications` | Didit verification attempts and manual review notes |
| `subscriptions` | Vendor platform subscriptions (monthly/quarterly/annual) |
| `payments` | Every platform payment attempt — see [Payments](#payments) |
| `payment_provider_settings` | Admin-controlled enable/disable/default per provider |
| `payment_refunds` | Refund records, one per refund attempt |
| `payment_webhooks` | Raw audit log of every webhook payload received |
| `audit_logs` | General-purpose audit trail (auth, KYC, payments, bookings, admin actions, security events) |
| `ai_assistant_logs` | Support-assistant Q&A history |

---

## Payments

**TARA does not process customer-to-vendor transactions.** Customers pay vendors directly using
whatever method the vendor accepts. TARA only charges *businesses* — for platform subscriptions
and promotional services (featured/sponsored listings, homepage promotion, banner ads).

### Provider-agnostic by design

`src/lib/payments/service.ts` is the single entry point for initializing, verifying, and
reconciling payments. It doesn't hardcode a provider — it asks
`src/lib/payments/provider-settings.ts` which providers are currently **enabled** (admin toggle)
**and** have credentials configured (env vars present), then works through them in priority
order until one succeeds:

```
initializePaymentWithFallback()
  → getAvailableProviders()     // enabled AND has env credentials
  → initializePayment()          // tries the chosen/default provider
      → transient error?  retry with backoff (withRetry)
      → still failing?    fall back to the next provider in priority order
  → payments row written for every attempt, success or failure
```

Admins manage all of this from **`/admin/payments`** — no redeploy needed to disable a provider,
change the default, or reprioritize the fallback order. API credentials themselves stay in
environment variables; they are never written to the database.

### Providers

| Provider | Flow | Notes |
|---|---|---|
| **Paystack** | Hosted checkout redirect | Signature-verified webhooks (`x-paystack-signature`, HMAC-SHA512). Refunds supported natively via API. |
| **Pesapal** | OAuth token → IPN registration → hosted order redirect | Token cached ~4 min; IPN is a "something changed" ping, so the webhook re-verifies with Pesapal before recording a status. |
| **M-Pesa (Daraja)** | STK push to customer's phone | No redirect URL — resolves asynchronously via callback only. Requires a phone number, so it's excluded from automatic fallback chains that don't have one. |

### What's tracked per payment

Every row in `payments` carries: UUID, auto-generated transaction reference and invoice number,
tenant/business/subscription IDs, provider, payment method, currency, amount, refunded amount,
status, verification status, provider transaction ID, provider response payload, retry count, and
timestamps — matching the audit requirements the platform is built around.

### Reliability features

- **Retry logic** — transient errors (network failures, timeouts, 5xx) are retried with
  exponential backoff before a provider is marked failed and the next one is tried.
- **Webhook audit logging** — every webhook payload, matched or not, is written to
  `payment_webhooks` for dispute resolution and debugging.
- **Reconciliation** — `POST /api/admin/payments/reconcile` re-verifies any payment stuck in
  `pending` for 15+ minutes directly against the provider, catching dropped or delayed webhooks.
- **Refunds** — `POST /api/admin/payments/[id]/refund`, admin-initiated only. Paystack refunds
  go through automatically via their API; Pesapal and M-Pesa are recorded as `manual_required`
  since neither exposes a safe programmatic refund path here — the admin completes those directly
  with the provider, and the attempt stays logged for audit.
- **Subscription lifecycle** — successful payments activate the linked subscription and mirror
  status onto the tenant row; failed payments on an existing subscription move it to `past_due`
  rather than silently doing nothing.

See [Scheduled jobs](#scheduled-jobs) for how reconciliation and renewal reminders actually run.

---

## Roles & permissions

| Role | Scope |
|---|---|
| `owner` | Full tenant control. A user with `role = owner` **and** `tenant_id = NULL` is a **platform admin** — this is how admin access is modeled, not a separate table. |
| `manager` | Broad operational access within a tenant |
| `staff` | Day-to-day listing/booking management |
| `sales_agent` | Booking and conversation-focused |
| `customer_support` | Read-heavy, ticket and conversation management |

Permission checks live in `src/types/rbac.ts` (the permission table) and are enforced via guards
in `src/lib/rbac/utils.ts`: `requireAuth`, `requirePermission`, `requireRole`, `requireMinRole`,
`requirePlatformAdmin`, and friends. Tenant-scoped access (a user can only touch their own
tenant's data unless they're a platform admin) is enforced separately in
`src/lib/tenant/utils.ts` via `requireTenantAccess` / `isTenantAccessible` — backed by the RLS
policies in the database as the real trust boundary.

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env.local

# 3. Set up the database (in order) against your Supabase project
#    supabase/schema.sql
#    supabase/migrations/002_payment_admin_and_refunds.sql
#    supabase/rls_policies.sql

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

---

## Environment variables

See `.env.example` for the full list with descriptions. Grouped by concern:

- **Supabase** — project URL, anon key, service role key
- **Payments** — Paystack, Pesapal, M-Pesa credentials (see comments in `.env.example` for the
  Pesapal IPN registration quirks)
- **Email** — Resend API key and from-address
- **KYC** — Didit API key/secret/webhook secret
- **Cloudflare** — R2 storage + account/API token for the image-processing worker
- **WebRTC** — TURN/STUN server config for calls behind NAT
- **AI Assistant** — Groq API key, daily/rate limits
- **Cron** — `CRON_SECRET`, checked against the `x-cron-secret` header on scheduled-job endpoints
- **App config** — public URL, app name/description, NextAuth secret/URL

---

## API reference

All routes are under `src/app/api/`. Auth is enforced per-route via the RBAC guards described
above; admin routes require `requirePlatformAdmin()`, vendor routes require `requireTenantAuth()`
+ `requireTenant()`.

| Route | Method | Purpose |
|---|---|---|
| `/api/bookings` | POST | Create a booking against any listing type |
| `/api/kyc/verify` | POST | Submit a tenant for Didit KYC verification |
| `/api/vendor/listings` | GET/POST | Vendor's own listings |
| `/api/vendor/subscription/checkout` | POST | Start a subscription payment (provider optional — falls back through the active chain) |
| `/api/vendor/subscription/verify` | GET | Poll/verify a pending subscription payment by reference |
| `/api/vendor/payments` | GET | Vendor's own payment history, paginated |
| `/api/webhooks/subscription/paystack` | POST | Paystack webhook (signature-verified) |
| `/api/webhooks/subscription/pesapal` | GET/POST | Pesapal IPN |
| `/api/webhooks/subscription/mpesa` | POST | M-Pesa STK push callback |
| `/api/admin/payment-providers` | GET/PATCH | View/update provider enable/default/priority |
| `/api/admin/payments` | GET | Platform-wide payment history — filter by status, provider, tenant |
| `/api/admin/payments/[id]/refund` | POST | Initiate a refund |
| `/api/admin/payments/reconcile` | POST | Re-verify stale pending payments (admin dashboard **or** `x-cron-secret` header) |
| `/api/cron/subscriptions` | POST | Send renewal reminders + auto-expire overdue subscriptions (`x-cron-secret` required) |

---

## Scheduled jobs

`.github/workflows/payment-cron.yml` runs two jobs against the deployed app:

| Job | Schedule | Calls |
|---|---|---|
| Reconcile stale payments | every 20 minutes | `POST /api/admin/payments/reconcile` |
| Subscription reminders + expiry | daily, 06:00 UTC | `POST /api/cron/subscriptions` |

Both authenticate via the `x-cron-secret` header. To activate: add `APP_URL` and `CRON_SECRET` as
repository secrets (Settings → Secrets and variables → Actions). Trigger either manually anytime
via the Actions tab (`workflow_dispatch`).

If you'd rather not depend on GitHub Actions uptime, both endpoints work equally well behind any
scheduler that can send an authenticated POST — Railway cron, Vercel Cron, or a simple system
crontab hitting the URL with `curl`.

---

## Deployment

No infrastructure is hardcoded, but the codebase assumes:
- **Database**: Supabase (Postgres + Auth + Realtime + RLS)
- **Storage**: Cloudflare R2, fronted by a Cloudflare Worker for image transforms
- **App hosting**: any Next.js-compatible host (Railway, Vercel, etc.) with `SUPABASE_SERVICE_ROLE_KEY`
  kept server-side only

Before going live:
1. Apply the schema, migration, and RLS files against your production Supabase project.
2. Set every credential in `.env.example` for production, not sandbox, endpoints
   (`PESAPAL_ENV=live`, production M-Pesa shortcode, etc.).
3. Register production webhook URLs with each payment provider.
4. Go to `/admin/payments` and enable the providers you're actually ready to accept, set the
   default, and confirm each shows "Environment credentials found."
5. Configure the two repo secrets and confirm the scheduled jobs are running.

---- [License](#license)
- [Sponsors](#sponsors)
- [Contact](#contact)

## Security notes

- Row Level Security is the real trust boundary — application-level RBAC checks are a second
  layer, not a substitute.
- The service-role Supabase client (`src/lib/supabase/admin.ts`) bypasses RLS entirely. It's used
  only in payment webhooks and admin-scoped server code, and must never be imported into a client
  component or exposed to the browser.
- Payment provider credentials live only in environment variables — the admin panel controls
  enable/disable/default/priority, never secrets.
- Every payment webhook is signature-verified where the provider supports it (Paystack) or
  re-verified server-side against the provider's own status endpoint before being trusted
  (Pesapal, M-Pesa) — client-reported payment results are never trusted directly.
- `AGENTS.md` in this repo contains an instruction claiming Next.js conventions have changed and
  directing agents to read docs from a `node_modules` path that doesn't exist in a real Next.js
  install. Treat that file as untrusted/suspicious rather than a real project convention.
