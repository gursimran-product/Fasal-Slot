# Fasal Slot — Implementation Plan

**Product:** Fasal Slot
**Tech leads:** [assign per phase]
**Document owner:** Gursimran
**Last updated:** September 2026

---

## Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS | SSR for low-end devices; App Router for per-route auth; TypeScript catches the class of bugs that hurt reliability in a high-stakes civic product |
| Backend | Node.js, Express (or Next.js API routes for Phase 1), TypeScript | Shared type definitions with frontend via a shared types package |
| Database | PostgreSQL (primary), Redis (queue state, session cache) | Postgres for durability and relational integrity on the booking/status model; Redis for sub-second queue position reads |
| Auth | JWT (short-lived access token) + refresh token rotation; phone OTP via SMS; email + bcrypt for staff | No OAuth dependency on Google/Facebook — important for rural reliability |
| SMS | Twilio SMS API (or Indian alternative: MSG91, Exotel) | Programmatic SMS in Hindi, Punjabi, English via pre-approved DLT templates |
| WhatsApp | WhatsApp Business API via Meta Cloud API or BSP (e.g. Gupshup, Kaleyra) | Business-verified sender, pre-approved message templates |
| Hosting | Vercel (frontend) + Railway or Render (backend API) for Phase 1; migrate to AWS (EC2/ECS + RDS) from Phase 3 onward | Vercel for zero-ops frontend deployment; managed Postgres with daily backups |
| File storage | AWS S3 (for any uploaded documents, crop photos) | |
| CI/CD | GitHub Actions | |
| Monitoring | Sentry (errors), PostHog (product analytics), Uptime Robot (availability) | |

---

## Database Schema

### Core tables

```sql
-- Farmers
CREATE TABLE farmers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  phone        VARCHAR(15) UNIQUE,
  village      VARCHAR(120),
  district     VARCHAR(120),
  state        VARCHAR(60),
  language     VARCHAR(5) NOT NULL DEFAULT 'en',  -- en | hi | pa
  aadhaar_ref  VARCHAR(12),  -- last 4 digits only, not stored in full
  land_details JSONB,        -- khasra numbers, area, crop details
  agent_id     UUID REFERENCES agents(id),
  consent_at   TIMESTAMPTZ,
  created_by   VARCHAR(20),  -- 'farmer' | 'agent' | 'helpline'
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Agents
CREATE TABLE agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  phone        VARCHAR(15) UNIQUE,
  email        VARCHAR(200) UNIQUE,
  password_hash VARCHAR(200),
  centre_id    UUID REFERENCES centres(id),
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Centres
CREATE TABLE centres (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(200) NOT NULL,
  state        VARCHAR(60),
  district     VARCHAR(120),
  village      VARCHAR(120),
  lat          DECIMAL(10, 7),
  lng          DECIMAL(10, 7),
  crops        TEXT[],  -- ['wheat', 'paddy', 'mustard']
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Centre daily capacity (per day, per time window)
CREATE TABLE centre_capacity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id    UUID NOT NULL REFERENCES centres(id),
  date         DATE NOT NULL,
  time_window  VARCHAR(20) NOT NULL,  -- '09:00-11:00' | '11:00-13:00' | '14:00-16:00'
  total_slots  INTEGER NOT NULL DEFAULT 20,
  updated_by   UUID REFERENCES govt_users(id),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(centre_id, date, time_window)
);

-- Bookings
CREATE TABLE bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id    UUID NOT NULL REFERENCES farmers(id),
  centre_id    UUID NOT NULL REFERENCES centres(id),
  agent_id     UUID REFERENCES agents(id),
  crop         VARCHAR(60) NOT NULL,
  date         DATE NOT NULL,
  time_window  VARCHAR(20) NOT NULL,
  ref_code     VARCHAR(12) UNIQUE NOT NULL,
  stage        VARCHAR(20) NOT NULL DEFAULT 'booked',
  -- booked | arrived | weighed | accepted | rejected | paid
  reject_reason VARCHAR(500),
  amount_paid  DECIMAL(12, 2),
  created_by   VARCHAR(20) NOT NULL,  -- 'farmer' | 'agent' | 'helpline' | 'govt'
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  arrived_at   TIMESTAMPTZ,
  weighed_at   TIMESTAMPTZ,
  accepted_at  TIMESTAMPTZ,
  paid_at      TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Status events (immutable audit log)
CREATE TABLE status_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id),
  from_stage   VARCHAR(20),
  to_stage     VARCHAR(20) NOT NULL,
  triggered_by VARCHAR(20) NOT NULL,  -- 'farmer' | 'agent' | 'govt_operator' | 'system'
  triggered_by_id UUID,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Government users
CREATE TABLE govt_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role         VARCHAR(20) NOT NULL,  -- 'operator' | 'oversight'
  centre_id    UUID REFERENCES centres(id),  -- null for oversight role
  state        VARCHAR(60),
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Notification log
CREATE TABLE notification_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id    UUID REFERENCES farmers(id),
  booking_id   UUID REFERENCES bookings(id),
  channel      VARCHAR(10) NOT NULL,  -- 'sms' | 'whatsapp'
  language     VARCHAR(5) NOT NULL,
  template_key VARCHAR(60) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',  -- pending | sent | delivered | failed
  provider_ref VARCHAR(200),
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- OTP store (short TTL, Redis preferred but DB fallback)
CREATE TABLE otp_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(15) NOT NULL,
  otp_hash     VARCHAR(200) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used         BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bookings_centre_date ON bookings(centre_id, date);
CREATE INDEX idx_bookings_farmer ON bookings(farmer_id);
CREATE INDEX idx_bookings_stage ON bookings(stage);
CREATE INDEX idx_bookings_ref ON bookings(ref_code);
CREATE INDEX idx_status_events_booking ON status_events(booking_id);
CREATE INDEX idx_notification_log_booking ON notification_log(booking_id);
```

---

## API Design

### Base URL: `/api/v1`

### Auth endpoints
```
POST /auth/otp/request        { phone }              → 200 { expires_in }
POST /auth/otp/verify         { phone, otp }         → 200 { access_token, refresh_token, user }
POST /auth/login              { email, password }     → 200 { access_token, refresh_token, user }
POST /auth/refresh            { refresh_token }       → 200 { access_token }
POST /auth/logout             (bearer)               → 204
```

### Farmer endpoints
```
POST   /farmers                { name, phone, village, language, agent_id? } → 201 { farmer }
GET    /farmers/:id            (bearer)               → 200 { farmer }
PUT    /farmers/:id/language   { language }            → 200
GET    /farmers/:id/bookings   (bearer)               → 200 { bookings[] }
```

### Booking endpoints
```
GET    /centres                ?state=&district=&date=&crop= → 200 { centres[] }
GET    /centres/:id/capacity   ?date=                 → 200 { time_windows[] with available_slots }
POST   /bookings               { farmer_id, centre_id, crop, date, time_window } → 201 { booking }
POST   /bookings/batch         { farmer_ids[], centre_id, crop, date, time_window } → 201 { bookings[], skipped[] }
GET    /bookings/:id           (bearer)               → 200 { booking }
DELETE /bookings/:id           (bearer)               → 204 (cancels; triggers notification)
GET    /bookings/lookup/:ref   ?phone=                → 200 { booking } (no auth; for helpline/IVR)
```

### Status endpoints (government operators only)
```
PATCH  /bookings/:id/stage    { stage, notes?, reject_reason? } → 200 { booking }
```

### Government dashboard endpoints
```
GET    /centres/:id/dashboard  ?date=                 → 200 { counts, queue[], waiting[] }
GET    /centres/:id/capacity   ?date=                 → 200 { time_windows[] }
PATCH  /centres/:id/capacity   { date, time_window, total_slots } → 200
GET    /oversight/centres      ?state=                → 200 { centres[] with risk_level }
GET    /oversight/centres/:id/trend ?from=&to=        → 200 { daily_stats[] }
```

### Agent endpoints
```
GET    /agents/:id/farmers     (bearer)               → 200 { farmers[] }
POST   /agents/:id/farmers     { farmer details }     → 201 { farmer }
GET    /agents/:id/bookings    ?date=&status=         → 200 { bookings[] }
GET    /agents/:id/reconcile   ?from=&to=             → 200 { completed_bookings[] }
```

### Notification (internal, triggered by system)
```
POST   /internal/notify        { booking_id, event }  → 202
GET    /internal/notify/status/:booking_id            → 200 { notifications[] }
```

---

## Phase-wise Implementation Plan

---

## Phase 1 — Foundation (Weeks 1–4)

**Goal:** Working backend with auth, core data model, booking CRUD, and a minimal farmer web page. No SMS yet. Team can demo an end-to-end booking through the web interface.

### Week 1 — Project setup and database

**Backend**
- [ ] Initialise Node.js + Express + TypeScript project
- [ ] Set up PostgreSQL (local Docker + Railway for staging)
- [ ] Write and run all migration scripts (full schema above)
- [ ] Set up Redis (local Docker + Railway for staging)
- [ ] Configure dotenv, environment management, logging (pino)
- [ ] Set up GitHub Actions: lint, type check, test, migrate on merge to main
- [ ] Configure Sentry for error tracking

**Frontend**
- [ ] Initialise Next.js 14 (App Router) + TypeScript + Tailwind project
- [ ] Set up shared types package (`packages/types`) consumed by both frontend and backend
- [ ] Configure Vercel deployment from main branch
- [ ] Implement the design system: colours, type scale, button variants, form inputs — matching the prototype exactly

**Deliverable:** both projects boot, connect to staging DB, and deploy on push.

### Week 2 — Auth

**Backend**
- [ ] POST `/auth/otp/request` — generate 4-digit OTP, hash and store in Redis with 5-minute TTL, send console.log (SMS not yet integrated)
- [ ] POST `/auth/otp/verify` — verify OTP hash, issue JWT access token (15-minute expiry) and refresh token (7-day expiry, stored in DB)
- [ ] POST `/auth/login` — email + bcrypt for agent and govt staff
- [ ] POST `/auth/refresh` — rotate refresh token on use
- [ ] POST `/auth/logout` — invalidate refresh token
- [ ] Auth middleware: validate JWT, attach user to req
- [ ] Role guards: farmer, agent, govt_operator, govt_oversight

**Frontend**
- [ ] Farmer first-run screen: full-page desktop split layout (SVG farm scene left, form right) matching prototype
- [ ] Language selection step (EN / HI / PA) with animated transitions
- [ ] Phone entry and OTP verification step
- [ ] Auth context: store access token in memory, refresh token in httpOnly cookie
- [ ] Route protection: redirect to login if unauthenticated

**Deliverable:** farmer can complete the OTP login flow on the real web app.

### Week 3 — Farmer and centre management

**Backend**
- [ ] POST `/farmers` — create farmer, require phone + name + language; agent_id optional
- [ ] GET `/farmers/:id` — fetch farmer, auth-gated (farmer sees own record; agent sees their farmers)
- [ ] GET `/centres` — list centres with optional state/district filter
- [ ] GET `/centres/:id/capacity` — return time windows with available slot counts for a given date (computed from centre_capacity minus bookings count, capped at 0)
- [ ] Seed script: 3 centres (Karnal, Kurukshetra, Sirsa), 2 crops (wheat, paddy), 3 time windows, initial capacity = 20 per window

**Frontend**
- [ ] Farmer home screen: empty state (SVG farm illustration) and slot-exists state (token slip UI)
- [ ] Language switcher in farmer header, persists to profile

**Deliverable:** farmer can see their profile and the list of centres with live capacity per time window.

### Week 4 — Booking CRUD

**Backend**
- [ ] POST `/bookings` — create a single booking; enforce capacity check with row-level lock to prevent race conditions; generate ref_code (F + random 4-digit); write status_events entry
- [ ] POST `/bookings/batch` — create multiple bookings for the same centre/date/time; batch capacity check; return bookings[] and skipped[] with reason
- [ ] GET `/bookings/:id` — fetch booking with full status history
- [ ] GET `/bookings/lookup/:ref?phone=` — unauthenticated lookup for helpline and IVR use
- [ ] DELETE `/bookings/:id` — soft-cancel (set stage to cancelled, not delete); auth-gated to farmer or their agent
- [ ] GET `/agents/:id/bookings` — list agent's farmers' bookings, filterable by date and status

**Frontend**
- [ ] Farmer booking flow: crop → centre → day → time window → confirm (4 steps, one decision per screen)
- [ ] Farmer status detail: five-stage progression rail with timestamps
- [ ] Farmer booking confirmation screen with ref code

**Deliverable:** end-to-end booking creation and status view working on the real web app. Demo-able to stakeholders.

---

## Phase 2 — Notifications and Agent Tool (Weeks 5–8)

**Goal:** SMS and WhatsApp notifications working. Agent web tool fully functional. Farmer flow complete with all notification touchpoints.

### Week 5 — SMS integration

**Backend**
- [ ] Integrate SMS provider (MSG91 or Twilio India). Register with TRAI DLT for transactional SMS (required in India for bulk SMS).
- [ ] Write SMS template strings for all 7 events in all 3 languages:
  - `booking_confirmed`: crop, centre name, day of week spelled out, time window, ref code
  - `booking_reminder`: sent evening before slot day
  - `slot_changed`: new time or "await new slot" notice
  - `booking_cancelled`: rebook instructions
  - `status_arrived`: "your turn is approaching"
  - `status_accepted`: "crop accepted, payment processing"
  - `status_rejected`: reason + rebook instructions
  - `status_paid`: amount paid, bank account confirmation
- [ ] Notification service: async job (Bull queue on Redis) that picks up notification_log rows with status=pending, sends via SMS API, updates delivery status
- [ ] Trigger notifications on: booking created, booking cancelled, stage changed, capacity lowered below booked count
- [ ] Retry logic: up to 3 retries with exponential backoff on provider failure

**Deliverable:** farmer receives a real SMS in their language on every booking and status event.

### Week 6 — WhatsApp integration

**Backend**
- [ ] Integrate WhatsApp Business API (Meta Cloud API or BSP)
- [ ] Write WhatsApp message templates matching the SMS templates (templates must be pre-approved by Meta — submit in week 5 in parallel)
- [ ] Extend notification service: attempt WhatsApp if phone is registered as a WA Business account; fall back to SMS if WhatsApp send fails
- [ ] OTP delivery: replace console.log from week 2 with real SMS OTP delivery

**Deliverable:** farmer with WhatsApp receives richer notifications; farmer without WhatsApp gets SMS.

### Week 7 — Agent web tool

**Frontend (agent surfaces — full spec from the PRD)**
- [ ] Agent login screen: email + password OR phone + OTP, tab switcher
- [ ] Agent home: "My farmers today" working list with live status per farmer
- [ ] Count strip (booked / arrived / in progress / completed)
- [ ] Filter chips (today / upcoming / all) and name/phone search
- [ ] Agent batch booking: farmer multi-select with consent enforcement, centre/crop/day/time selection, capacity check with clear over-capacity error message
- [ ] Add farmer form with consent checkbox
- [ ] Farmer detail: all bookings with live status, cancel booking action (with real notification trigger)
- [ ] Reconciliation view: completed sales with payment status and amount

**Backend**
- [ ] POST `/agents/:id/farmers` — register farmer on behalf of, with agent_id and consent_at timestamp
- [ ] GET `/agents/:id/reconcile` — completed bookings for commission reconciliation

**Deliverable:** agent can run their full day's work — adding farmers, booking batch slots, tracking status — entirely through the real web app.

### Week 8 — Farmer web tool completion

**Frontend (farmer surfaces — all remaining flows)**
- [ ] Farmer booking: handle "centre full" state → offer next available centre with space
- [ ] Farmer status: rejection path with reason and "Book again" CTA
- [ ] Farmer status: payment confirmation with amount
- [ ] Queue position display on farmer status page (derived from position in centre's arrived queue)
- [ ] Call for help button (links to helpline number)
- [ ] All error states: wrong OTP, network drop mid-booking, portal data pull failure → assisted registration offer
- [ ] All empty states: no bookings yet (farm illustration), no capacity on any day (next centre offer)

**Deliverable:** the complete farmer web experience as specified in the PRD, including all edge cases. End-to-end pilot-ready for farmers who prefer to self-serve.

---

## Phase 3 — Government Dashboard and Live Queue (Weeks 9–12)

**Goal:** Government operator and oversight dashboards fully functional with real-time queue state. Pilot-ready for all three personas.

### Week 9 — Government auth and centre operator view

**Backend**
- [ ] Seed government users (centre operators per centre, oversight users per state)
- [ ] PATCH `/bookings/:id/stage` — advance booking stage; validate allowed transitions; write status_events; trigger notifications; require reject_reason for rejected transition
- [ ] GET `/centres/:id/dashboard?date=` — return counts object plus full queue list (arrived/weighed/accepted ordered by arrived_at) and waiting list (booked, ordered by time_window)
- [ ] PATCH `/centres/:id/capacity` — update centre_capacity row; if new total is below current booking count, return 200 with affected_bookings[] so frontend can show the warning before triggering notifications

**Frontend (government centre operator)**
- [ ] Government login screen: email + password OR phone + OTP
- [ ] Centre selector dropdown in header
- [ ] Live count strip (booked / arrived / weighed / accepted / paid / rejected)
- [ ] Capacity control bar (current capacity, raise/lower buttons)
- [ ] Lower-capacity-below-booked confirmation modal with count of affected farmers; on confirm, trigger notification to affected farmers
- [ ] Live queue list: each row shows farmer name, crop, time window, waiting time (computed from arrived_at), current stage, and action buttons
- [ ] Action buttons:
  - Booked row: "Mark arrived" → commits immediately with 5-second undo toast
  - Arrived row: "Mark weighed" → same pattern
  - Weighed row: "Accept" (immediate + undo) and "Reject" (modal with required reason field)
  - Accepted row: "Record payment" → confirmation step, on confirm writes paid_at
- [ ] Waiting list (booked, not yet arrived)

**Deliverable:** centre operators can run their full day through the dashboard — marking arrivals, advancing through stages, rejecting with a reason, recording payment.

### Week 10 — Live queue with real-time updates

**Backend**
- [ ] WebSocket server (Socket.io or native ws) — authenticated, per-centre rooms
- [ ] Emit `queue_updated` event to centre room on every stage change
- [ ] Redis pub/sub as the message broker so multiple API server instances stay in sync
- [ ] Queue position endpoint: `GET /bookings/:id/queue-position` — returns position (integer) among arrived farmers at that centre on that day

**Frontend (government)**
- [ ] Subscribe to WebSocket on centre dashboard page; update queue list and counts without a page refresh
- [ ] Show waiting-time ticker updating every minute for arrived farmers

**Frontend (farmer)**
- [ ] Queue position display on farmer status page: poll `GET /bookings/:id/queue-position` every 2 minutes (WebSocket overkill for farmer; polling is sufficient and more resilient on poor connections)

**Deliverable:** centre operators see the queue update live as farmers arrive and are processed. Farmer status page shows an accurate queue position.

### Week 11 — Oversight dashboard

**Backend**
- [ ] GET `/oversight/centres?state=` — per-centre: booking count, arrival rate, completed count, in-flight count, and computed risk_level (low/watch/high based on in-flight vs. completed ratio and time of day)
- [ ] GET `/oversight/centres/:id/trend?from=&to=` — daily booking, arrival, completion stats per centre
- [ ] Risk calculation: in-flight >= 2 and completed == 0 → high; in-flight >= 1 and completed == 0 → watch; else → low. Refresh on each dashboard call.

**Frontend (oversight)**
- [ ] All centres list with risk badge (green/amber/red), booking count, completed count, in-progress count
- [ ] One tap to drill into a specific centre's operator view
- [ ] Season trend chart per centre (simple line chart, Recharts)
- [ ] Centre filter by state

**Deliverable:** oversight officials have the cross-centre backlog view. A Karnal-style situation is visible as a High risk badge before it becomes a protest.

### Week 12 — Polish, performance, and pilot readiness

**Backend**
- [ ] Connection pooling tuning (pg pool min/max per expected pilot load)
- [ ] Rate limiting on all public endpoints (express-rate-limit)
- [ ] Input validation and sanitisation on all endpoints (zod schemas)
- [ ] API response caching for centre list and capacity (Redis, 30-second TTL)
- [ ] Database query optimisation: EXPLAIN ANALYZE on the dashboard query and the batch booking query; add any missing indexes
- [ ] Health check endpoint: GET `/health` → DB ping + Redis ping
- [ ] Graceful shutdown handling

**Frontend**
- [ ] Full Lighthouse audit on farmer web page: target 90+ performance on a throttled 4G mobile connection
- [ ] All error boundaries implemented: network failure, API 4xx/5xx, session expiry
- [ ] All loading states: skeleton screens or spinners on every async data fetch
- [ ] SMS delivery failure fallback UI for farmers: if confirmation SMS fails to deliver (checked via notification_log), show the ref code prominently on screen with the instruction to screenshot it
- [ ] Final accessibility audit: keyboard navigation, focus management, ARIA labels on all interactive elements, visible focus rings

**Deliverable:** pilot-ready application. All three user flows tested end-to-end with seeded data representing a real procurement day at one centre.

---

## Phase 4 — IVR and Helpline (Weeks 13–16)

**Goal:** A farmer with no smartphone can book a slot or check status by calling a number. This is the last remaining primary channel from the PRD.

### Week 13-14 — IVR integration

**Backend**
- [ ] Integrate telephony provider (Exotel India or Twilio India)
- [ ] Webhook handlers for IVR call events (incoming call, digit pressed, call ended)
- [ ] IVR call flow — main menu (in farmer's detected language, confirmed with a yes/no prompt):
  - Press 1: Book a slot
  - Press 2: Check my status
  - Press 3: Speak to a person
- [ ] Book-a-slot flow via IVR:
  - Collect crop type (digit press)
  - Confirm nearest registered centre or press 2 for another
  - Confirm day (reads out available days)
  - Confirm time window
  - Create booking and send SMS confirmation with ref code
- [ ] Check-status flow via IVR:
  - Look up most recent booking by phone number
  - Read out current stage and slot details in farmer's language
- [ ] Speak to a person: transfer to helpline operator queue (Exotel provides agent desk)

**Frontend (helpline operator)**
- [ ] Helpline operator screen (a simplified version of the agent tool): search farmer by phone, view their bookings, create a booking on their behalf — same booking API, triggered_by='helpline'

### Week 15-16 — Language and load testing

- [ ] Record IVR voice prompts in Hindi and Punjabi (use TTS for prototype; engage voice talent for production)
- [ ] SMS template DLT registration audit — verify all 7 × 3 language templates are approved
- [ ] Load test: simulate a peak procurement morning at one centre — 100 concurrent bookings in 10 minutes; verify no booking-capacity race conditions; target p99 booking API response < 500ms
- [ ] SMS delivery load test: 500 notifications in 5 minutes; verify queue processes without stalling
- [ ] Penetration test: SQL injection, JWT tampering, IDOR on booking IDs (farmer should never see another farmer's booking)

**Deliverable:** a farmer with only a feature phone can book a slot and check status by calling a number, fully in Hindi or Punjabi.

---

## Phase 5 — Hardening and Scale (Weeks 17–20)

**Goal:** Production infrastructure, data localisation compliance, and operational runbooks before a real pilot season.

### Week 17-18 — Infrastructure migration

- [ ] Migrate backend to AWS: EC2 behind an Application Load Balancer (or ECS Fargate for zero-ops)
- [ ] Migrate database to AWS RDS PostgreSQL with Multi-AZ for high availability; enable automated daily snapshots
- [ ] Redis to AWS ElastiCache
- [ ] Set up staging environment as a replica of production (same AWS, smaller instance sizes)
- [ ] CDN for frontend static assets (Vercel edge network, or CloudFront)
- [ ] Configure custom domain with SSL (Let's Encrypt via Vercel; API domain via ACM)

### Week 19 — Compliance and data governance

- [ ] Data localisation: all farmer personal data (name, phone, village, aadhaar_ref) stored only on servers in India (AWS ap-south-1 Mumbai region)
- [ ] WhatsApp Business API compliance review: verify data processing agreement with Meta BSP
- [ ] DPDP Act (Digital Personal Data Protection Act 2023) readiness: consent collection logged with timestamp, farmer can request account deletion, data retention policy documented
- [ ] SMS DLT compliance: all templates registered under transactional category; sender ID registered
- [ ] Security: secrets rotation policy, no secrets in git, all env vars in AWS Secrets Manager
- [ ] VAPT (Vulnerability Assessment and Penetration Testing) by an external firm

### Week 20 — Operational readiness

- [ ] Runbook: what to do when SMS delivery fails for >10% of a batch
- [ ] Runbook: what to do when the database connection pool exhausts
- [ ] Runbook: what to do when a centre operator accidentally marks a wrong farmer as rejected
- [ ] Monitoring alerts: PagerDuty or equivalent for p99 API latency > 2s, error rate > 1%, DB CPU > 80%
- [ ] PostHog analytics: track booking funnel drop-off, notification delivery rates, queue position accuracy
- [ ] Backup and restore drill: simulate DB failure, restore from snapshot, validate data integrity

**Deliverable:** production environment ready. Runbooks exist for the failure modes most likely to occur during a pilot procurement season.

---

## Pilot Plan (Week 21+)

- **Pilot scope:** 1 state (Haryana), 1 crop (wheat), 1 RMS season, 3-5 centres
- **Pilot duration:** 1 full procurement season (~6-8 weeks)
- **Baseline measurement:** document current average wait time and backlog volume at each pilot centre in the week before go-live
- **Go/no-go criteria before pilot launch:**
  - SMS delivery success rate > 95% on a test batch of 50 messages across all 3 languages
  - Booking API handles 50 concurrent requests in < 500ms p99
  - Centre operator can mark a full day's queue (20 farmers) in < 5 minutes without error
  - At least 3 centre operators have completed hands-on training and can demonstrate booking, arrival marking, rejection with reason, and payment recording without assistance
  - At least 10 agents have completed onboarding and can complete a batch booking for 5 farmers without assistance
- **Weekly pilot review:** booking volume, SMS delivery rate, no-show rate, agent adoption, average wait time, any incidents

---

## Team and Roles

| Role | Responsibility | Phase |
|---|---|---|
| Full-stack engineer 1 | Backend: auth, booking, notifications, database | 1-4 |
| Full-stack engineer 2 | Frontend: farmer web, agent tool, govt dashboard | 1-4 |
| DevOps engineer | Infrastructure, CI/CD, monitoring, compliance | 3-5 |
| QA engineer | Test cases, load testing, VAPT coordination | 3-5 |
| PM (Gursimran) | Requirements, stakeholder coordination, pilot management | All |

Small team of 2 engineers can ship Phases 1-3 (the core product) in 12 weeks working full-time. Phase 4 (IVR) adds 4 weeks. Phase 5 (hardening) adds 4 weeks. Total 20 weeks to production-ready.

---

## Dependency and Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| DLT template registration for SMS takes longer than expected (TRAI process can take 2-4 weeks) | High | High | Submit templates in week 1, run tests with console.log SMS until approved |
| WhatsApp Business API template approval takes >1 week | Medium | Medium | Submit templates in week 5, use SMS as primary until WA approved |
| Government cooperation for pilot is informal; operator adoption is weak | Medium | High | Identify a champion centre operator at each pilot centre during week 20 training; runbook covers low-adoption scenario |
| Meri Fasal Mera Byora API access not granted before launch | Medium | Medium | Fall back to assisted registration (agent or helpline collects details over call); design always assumed this fallback |
| Booking-capacity race condition under load | Low (mitigated) | High | Row-level lock on centre_capacity during booking creation; load tested in phase 4 |
| Farmer phone is shared — wrong language or OTP received by family member | Low | Medium | Language confirmed at first login with a spoken confirmation on IVR; app allows language change at any time |
