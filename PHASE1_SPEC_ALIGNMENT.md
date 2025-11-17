# BioFlo Phase 1 Master Spec - Alignment & Implementation Plan

**Status:** Spec received and being aligned with current codebase  
**Date:** 2025-01-15  
**Source:** Phase 1 Master Spec (single source of truth)

---

## ✅ **ALREADY IMPLEMENTED**

### Core Foundation
- ✅ Clerk auth integration
- ✅ Stripe subscriptions (£24.99/month) + webhook handler
- ✅ Basic Postgres schema (`users`, `chat_messages`, `health_metrics`, `wearable_devices`, `tool_usage`)
- ✅ Next.js API routes structure
- ✅ Rate limiting (in-memory, needs Redis for production)
- ✅ Basic logging infrastructure

### AI Layer
- ✅ Model router (GPT-5 primary, Claude 4.5 fallback)
- ✅ Streaming responses (NDJSON)
- ✅ Basic crisis keyword detection (minimal - needs upgrade per spec)
- ✅ Tool system (meal planner, sleep optimizer, supplement recommender, etc.)
- ✅ System prompts (`BIOFLO_SYSTEM_PROMPT`)

### Web App
- ✅ Landing/pricing pages
- ✅ Chat interface (streaming)
- ✅ Auth flows (sign-in/sign-up)
- ✅ Subscription checkout
- ✅ Basic dashboard structure (`/analytics`)

### Database
- ✅ Core tables exist
- ✅ pgvector extension ready (schema has `documents` table placeholder)

---

## ❌ **MISSING / NEEDS IMPLEMENTATION**

### 1. AI Gateway & Safety (HIGH PRIORITY)
- ❌ **AI Gateway module** (`lib/ai/gateway.ts`)
  - Functions: `generateCoachReply()`, `generateTodayPlan()`, `generateWeeklyDebrief()`, `generateOnboardingAssessment()`
  - Model selection logic (GPT-5 vs Claude 4.5 per task)
- ❌ **Safety Classifier** (pre-AI classification)
  - Categories: GENERAL_WELLNESS, MENTAL_HEALTH_NON_CRISIS, MENTAL_HEALTH_CRISIS, MEDICAL_SYMPTOMS_NON_URGENT, MEDICAL_EMERGENCY_SIGNS
  - Current: Only basic keyword detection exists
- ❌ **Output Safeguards** (post-generation safety check)
- ❌ **Enhanced system prompts** with medical disclaimers

### 2. Database Schema Updates
- ❌ `profiles` table (needs `goals`, `main_struggles` JSONB fields)
- ❌ `check_ins` table (mood, energy, sleep_quality, notes)
- ❌ `documents` table (RAG) - schema exists but needs pgvector index
- ❌ `protocols` + `protocol_runs` + `protocol_logs` tables
- ❌ `wearable_raw_sleep`, `wearable_raw_activity`, `wearable_raw_hr` tables
- ❌ `wearable_features_daily` table (key aggregation table)
- ❌ `oura_tokens`, `whoop_tokens`, `garmin_tokens` tables
- ❌ `daily_plans` + `weekly_debriefs` tables (caching)
- ❌ `nudges` table

### 3. Backend API Endpoints
- ❌ `GET /api/me` (profile + subscription status)
- ❌ `POST /api/onboarding` (with AI assessment trigger)
- ❌ `POST /api/check-ins` + `GET /api/check-ins?range=7d`
- ❌ `GET /api/today-plan` (with caching)
- ❌ `GET /api/weekly-debrief` (with caching)
- ❌ `GET /api/protocols` (list)
- ❌ `POST /api/protocols/start`
- ❌ `GET /api/protocols/current`
- ❌ `POST /api/protocols/progress`
- ❌ `GET /api/oura/connect` + `/api/oura/callback`
- ❌ `GET /api/cron/oura-sync?userId=...`
- ❌ `POST /api/wearables/apple/daily`
- ❌ `POST /api/wearables/google/daily`

### 4. RAG (Retrieval-Augmented Generation)
- ❌ pgvector index on `documents.embedding`
- ❌ `match_documents()` SQL function
- ❌ Embedding generation (OpenAI `text-embedding-3-small`)
- ❌ Ingestion script (`scripts/ingest-documents.js` - exists but needs completion)
- ❌ RAG retrieval wired into chat API

### 5. Web App Features
- ❌ **Onboarding flow** (with AI assessment)
- ❌ **Dashboard enhancements:**
  - Today Plan card
  - Last 7 days graphs (mood, energy, sleep)
  - Weekly Debrief snippet
  - Protocol progress panel
  - Quick "Check in now" button
- ❌ **Check-ins UI** (form + history view)
- ❌ **Protocols UI** (list, start, progress tracking)
- ❌ **Account page** (profile, subscription management)

### 6. Wearable Integrations (Backend)
- ❌ Oura OAuth flow
- ❌ WHOOP OAuth flow
- ❌ Garmin OAuth flow
- ❌ Sync cron jobs (fetch data → populate raw tables → aggregate to `wearable_features_daily`)
- ❌ Apple Health / Google Fit ingest endpoints

### 7. Smart Automation
- ❌ **Smart Rules** (server-side cron):
  - Sleep debt detection → nudge
  - Overreaching detection (HRV down, HR up) → nudge
  - Inactivity detection → nudge
- ❌ **Modes system** (NORMAL, TRAVEL, RECOVERY, DEEP_WORK)
- ❌ **Nudges delivery** (in-app + push notifications)

### 8. Care Mode (MVP)
- ❌ Care Mode toggle in profile
- ❌ Contact nomination (1-2 emails/phones)
- ❌ Deviation detection rules
- ❌ Check-in prompt mechanism
- ❌ Alert to contacts (email/SMS)

### 9. Mobile App (Flutter)
- ❌ Entire Flutter app (iOS + Android)
- ❌ Auth with Clerk
- ❌ Home screen (Today Plan, metrics)
- ❌ Chat & check-ins
- ❌ Wearable connection screens
- ❌ Apple Health integration (iOS)
- ❌ Google Fit integration (Android)
- ❌ Push notifications (FCM/APNs)

### 10. Enterprise Requirements
- ❌ Comprehensive test suite (unit, integration, E2E)
- ❌ GDPR-style data deletion helper
- ❌ Enhanced monitoring/alerts
- ❌ Redis for rate limiting (production)

---

## 🔄 **NEEDS REFACTORING**

### Current → Spec Alignment
1. **Chat API** (`app/api/chat/route.ts`)
   - Currently: Direct model calls, basic crisis detection
   - Should: Use AI Gateway, proper safety classifier, RAG integration

2. **Database Schema** (`lib/db/schema.sql`)
   - Currently: Basic tables exist
   - Should: Add all Phase 1 tables per spec

3. **Safety System**
   - Currently: Simple keyword regex
   - Should: Multi-category classifier + output safeguards

4. **Pricing**
   - Currently: £24.99/month Pro only
   - Should: Basic (free), Pro (£24.99), Enterprise (£249) with yearly toggle

---

## 📋 **RECOMMENDED IMPLEMENTATION ORDER**

### Phase 1A: Foundation (Week 1-2)
1. ✅ Database schema updates (all tables)
2. ✅ AI Gateway module (`lib/ai/gateway.ts`)
3. ✅ Safety classifier + output safeguards
4. ✅ Enhanced system prompts

### Phase 1B: Core Features (Week 3-4)
5. ✅ Onboarding flow + AI assessment
6. ✅ Check-ins API + UI
7. ✅ Today Plan API + UI (with caching)
8. ✅ Weekly Debrief API + UI (with caching)

### Phase 1C: RAG & Protocols (Week 5-6)
9. ✅ pgvector setup + `match_documents()` function
10. ✅ Document ingestion script
11. ✅ RAG wired into chat
12. ✅ Protocols system (tables + API + UI)

### Phase 1D: Wearables Backend (Week 7-8)
13. ✅ Token tables + OAuth flows (Oura, WHOOP, Garmin)
14. ✅ Sync cron jobs
15. ✅ Apple/Google ingest endpoints
16. ✅ `wearable_features_daily` aggregation pipeline

### Phase 1E: Smart Automation (Week 9)
17. ✅ Smart rules (sleep debt, overreaching, inactivity)
18. ✅ Nudges system
19. ✅ Modes system

### Phase 1F: Mobile App (Week 10-12)
20. ✅ Flutter app setup
21. ✅ Auth + Home + Chat + Check-ins
22. ✅ Wearable connections
23. ✅ Apple Health / Google Fit integration
24. ✅ Push notifications

### Phase 1G: Care Mode & Polish (Week 13-14)
25. ✅ Care Mode skeleton
26. ✅ UI refinements
27. ✅ Tests
28. ✅ Production hardening

---

## 🎯 **IMMEDIATE NEXT STEPS**

**What should we prioritize first?**

1. **AI Gateway + Safety** (foundational, affects everything)
2. **Database schema** (needed for all features)
3. **Onboarding flow** (user experience)
4. **RAG system** (improves chat quality)
5. **Something else?**

---

## 📝 **NOTES**

- All code changes will align with this spec
- Safety & medical disclaimers are non-negotiable
- Mobile app is Phase 1 requirement (not Phase 2)
- Care Mode is MVP but included in Phase 1

