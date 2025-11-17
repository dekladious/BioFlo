# 🏗️ BioFlo Architecture Alignment Analysis

## Architecture Overview

Based on the provided architecture diagram, here's how our current implementation aligns and what needs to be adjusted.

---

## ✅ **IMPLEMENTED COMPONENTS**

### 1. **Client Layer**
- ✅ **Sign-in (Clerk)** - Implemented in `app/sign-in`
- ✅ **Sign-in (Stripe Checkout)** - Implemented in `app/subscribe`

### 2. **Core BioFlo Agent SAAS**

#### Authentication & Payments
- ✅ **Clerk (Cheowi)** - Implemented via `@clerk/nextjs`
- ✅ **Stripe (Siipe)** - Implemented via `stripe` package
- ✅ **Webhooks** - Implemented in `app/api/stripe/webhook`

#### Request Processing Pipeline
- ✅ **Request Validator** - Implemented in `app/api/chat/route.ts` (lines 24-112)
  - Content-Type validation
  - Request size limits
  - Message format validation
  - Message length validation

- ✅ **Feature Gate (Subscription Check)** - Implemented in `app/api/chat/route.ts` (lines 77-82)
  - Checks `isPro` status
  - Returns 402 if not subscribed

- ✅ **Model Router** - Implemented in `lib/ai/modelRouter.ts`
  - Supports OpenAI GPT‑5 (primary) with Anthropic Claude 4.5 fallback

- ✅ **Tool Registry** - Implemented in `lib/ai/tools/index.ts`
  - Tool registration system
  - Tool detection from user text

- ✅ **Safety Filter** - Implemented in `app/api/chat/route.ts` (lines 118-129)
  - Crisis keyword detection
  - Server-side blocking

- ✅ **Prompt Builder** - Implemented in `lib/ai/policy.ts`
  - `BIOFLO_SYSTEM_PROMPT` defines the system prompt

- ✅ **Response Formatter** - Implemented in `app/api/chat/route.ts`
  - Formats meal plans
  - Formats AI responses

#### Tools
- ✅ **Meal Planner** - Implemented in `lib/ai/tools/mealPlanner.ts`
- ❌ **Macro Calculator** - Not implemented
- ❌ **PDF Export** - Not implemented
- ❌ **RAG Retrieval** - Not implemented
- ❌ **Calendar** - Not implemented

---

## ❌ **MISSING COMPONENTS**

### 1. **AI Provider Flow**
**Current Implementation:**
- Model Router defaults to OpenAI GPT‑5 with Anthropic fallback

**Architecture Spec Update:**
- GPT‑5 acts as the main reasoning model (per latest decision)
- Anthropic Claude 4.5 provides resilience when GPT‑5 is busy or rate-limited

**Action:** Confirm both API keys are configured in `.env.local`

### 2. **Backend Services (AD & Services)**

#### Database
- ❌ **Postgres with RLS** - Not implemented
  - Currently using Clerk for user storage
  - No dedicated Postgres database
  - No Row-Level Security (RLS)

#### Observability
- ❌ **Langfuse Traces** - Not implemented
  - No tracing system
  - No observability for AI calls

#### Logging & Alerts
- ⚠️ **Logging/Alerts** - Partially implemented
  - Basic logging via `lib/logger.ts`
  - No structured alerting system
  - No integration with monitoring services

- ❌ **Crisis Guard** - Basic implementation only
  - Currently just keyword detection
  - No separate crisis guard service
  - No alerting mechanism

#### User Data
- ⚠️ **Users Database** - Using Clerk
  - Clerk stores user data
  - No separate user database
  - No custom user data storage

### 3. **Advanced Features**

- ❌ **Embeddings** - Not implemented
  - No embedding generation
  - No vector database
  - No RAG capabilities

- ❌ **Doctor Console** - Not implemented
  - No monitoring interface
  - No trace viewing
  - No human-in-the-loop capabilities

### 4. **Future: Team/Tenant Mode**
- ❌ **White-label Portal** - Not implemented
- ❌ **Data Integrations** (Oura, WHOOP) - Not implemented
- ❌ **Event Rules Engine** - Not implemented
- ❌ **Doctor Console (HITL)** - Not implemented

---

## 🔧 **REQUIRED CHANGES**

### Priority 1: Critical Architecture Alignment

#### 1.1 Switch Primary AI Provider to Anthropic Claude 4.5
**File:** `lib/ai/modelRouter.ts`, `app/api/chat/route.ts`

**Current:**
```typescript
// Defaults to OpenAI
provider = "openai"
```

**Required:**
```typescript
// Default to Anthropic Claude 4.5 (PRIMARY)
provider = "anthropic"
```

#### 1.2 Separate OpenAI Usage
- Keep OpenAI for subscription validation or specific use cases
- Use Anthropic Claude 4.5 for all main chat interactions

### Priority 2: Missing Tools

#### 2.1 Implement Missing Tools
- **Macro Calculator** - Calculate macros from food items
- **PDF Export** - Export meal plans as PDF
- **RAG Retrieval** - Retrieval-Augmented Generation for knowledge base
- **Calendar** - Schedule meal plans and reminders

### Priority 3: Backend Infrastructure

#### 3.1 Database Setup
- Set up Postgres database
- Implement Row-Level Security (RLS)
- Migrate user data if needed

#### 3.2 Observability
- Integrate Langfuse for tracing
- Set up structured logging
- Implement alerting system

#### 3.3 Enhanced Crisis Guard
- Separate crisis guard service
- Alert system for crisis detection
- Integration with logging/alerts

---

## 📋 **IMPLEMENTATION PLAN**

### Phase 1: Architecture Alignment (This Week)
1. ✅ Switch default AI provider to Anthropic Claude 4.5
2. ✅ Update model router to prioritize Anthropic
3. ✅ Ensure OpenAI is used appropriately (if needed)

### Phase 2: Missing Tools (Next 2 Weeks)
1. Implement Macro Calculator
2. Implement PDF Export
3. Implement Calendar integration
4. Plan RAG Retrieval (requires embeddings)

### Phase 3: Backend Infrastructure (Next Month)
1. Set up Postgres with RLS
2. Integrate Langfuse for tracing
3. Enhance logging and alerting
4. Implement crisis guard service

### Phase 4: Advanced Features (Future)
1. Implement embeddings system
2. Set up vector database for RAG
3. Build Doctor Console
4. Plan Team/Tenant Mode features

---

## 🎯 **IMMEDIATE ACTIONS**

1. **Change Default AI Provider** ⚠️ **CRITICAL**
   - Update `app/api/chat/route.ts` to use Anthropic by default
   - Update `lib/ai/modelRouter.ts` default provider

2. **Verify AI Provider Configuration**
   - Ensure `ANTHROPIC_API_KEY` is set
   - Test Anthropic Claude 4.5 integration

3. **Document Current State**
   - Update architecture documentation
   - Note what's implemented vs. planned

---

## 📊 **CURRENT STATE SUMMARY**

| Component | Status | Priority |
|-----------|--------|----------|
| Clerk Authentication | ✅ Complete | - |
| Stripe Payments | ✅ Complete | - |
| Request Validator | ✅ Complete | - |
| Feature Gate | ✅ Complete | - |
| Model Router | ⚠️ Wrong Default | **P1** |
| Tool Registry | ✅ Complete | - |
| Safety Filter | ✅ Basic | P3 |
| Prompt Builder | ✅ Complete | - |
| Response Formatter | ✅ Complete | - |
| Meal Planner Tool | ✅ Complete | - |
| Macro Calculator | ❌ Missing | P2 |
| PDF Export | ❌ Missing | P2 |
| RAG Retrieval | ❌ Missing | P3 |
| Calendar | ❌ Missing | P2 |
| Postgres + RLS | ❌ Missing | P3 |
| Langfuse Traces | ❌ Missing | P3 |
| Embeddings | ❌ Missing | P3 |
| Doctor Console | ❌ Missing | P4 |

**Legend:**
- ✅ Complete
- ⚠️ Partial/Needs Update
- ❌ Missing
- P1 = Critical (This Week)
- P2 = High (Next 2 Weeks)
- P3 = Medium (Next Month)
- P4 = Future

---

## 🚀 **NEXT STEPS**

1. **Fix AI Provider Default** (Immediate)
2. **Plan Tool Implementation** (This Week)
3. **Design Backend Infrastructure** (Next Week)
4. **Prioritize Features** (Ongoing)

