# 🏗️ BioFlo Enterprise Architecture Vision

## 🎯 **Business Vision**

### Core Product
- **BioFlo AI Agent**: Elite biohacking personal assistant
- **Pricing**: £14.99/month
- **Target**: 100k+ users globally
- **Future**: F1 teams with white-label versions + wearable data integration

### Key Requirements
1. ✅ **Enterprise-grade** - Production-ready, scalable
2. ✅ **Building blocks** - Reusable components for future AI agents
3. ✅ **Global scale** - 100k+ concurrent users
4. ✅ **Multi-tenancy** - White-label support (F1 teams)
5. ✅ **Wearable integration** - Oura, WHOOP data sync
6. ✅ **Doctor console** - Human-in-the-loop (HITL) monitoring
7. ✅ **Event monitoring** - Real-time alerts (elevated heart rate, etc.)
8. ✅ **AI Providers** - Claude 4.5 (primary) + OpenAI 5

---

## 🏛️ **Architecture Principles**

### 1. **Building Blocks Approach**
Every component should be:
- **Modular** - Standalone, reusable
- **Configurable** - Environment-driven behavior
- **Extensible** - Easy to add new features
- **Testable** - Unit testable, mockable

### 2. **Scalability First**
- **Stateless** - No server-side sessions
- **Horizontally scalable** - Multiple instances
- **Database sharding** - User-based partitioning
- **Caching** - Redis for rate limiting, sessions
- **CDN** - Static assets, API responses

### 3. **Multi-Tenancy Ready**
- **Tenant isolation** - Row-Level Security (RLS) in Postgres
- **White-label support** - Configurable branding
- **Team management** - F1 team hierarchies
- **Data segregation** - Complete tenant data separation

### 4. **Observability**
- **Tracing** - Langfuse for AI call tracing
- **Logging** - Structured logging (JSON)
- **Monitoring** - Metrics, alerts
- **Auditing** - Compliance logging

---

## 📐 **Current Architecture vs. Target**

### ✅ **What We Have (MVP)**
```
Client → Clerk Auth → Stripe → Feature Gate → Model Router → Tools → Response
```

### 🎯 **Target Architecture (Enterprise)**
```
Client → Clerk Auth → Stripe → Request Validator → Feature Gate → 
Model Router (Claude 4.5) → Tool Registry → Safety Filter → 
Prompt Builder → Tools → Response Formatter → Langfuse Traces → Postgres (RLS)

+ Wearable Data (Oura/WHOOP) → Event Rules Engine → Doctor Console (HITL)
+ White-label Portal → Tenant Management → Team Data
```

---

## 🧱 **Building Blocks Design**

### **Block 1: Core Infrastructure** ✅ (Implemented)
- [x] Authentication (Clerk)
- [x] Payments (Stripe)
- [x] Request Validation
- [x] Feature Gates
- [x] Model Router (Claude 4.5 primary)
- [x] Tool Registry
- [x] Safety Filter
- [x] Response Formatter

**Reusability**: Can be used for ANY AI agent by swapping:
- System prompt
- Tool set
- Feature gates

### **Block 2: AI Providers** ✅ (Implemented)
- [x] Model Router (multi-provider)
- [x] Claude 4.5 integration
- [x] OpenAI integration (fallback)
- [x] Error handling
- [x] Retry logic

**Reusability**: Works for any AI agent needing multi-provider support

### **Block 3: Tool System** ✅ (Partially Implemented)
- [x] Tool Registry
- [x] Tool Detection
- [x] Meal Planner
- [ ] Macro Calculator
- [ ] PDF Export
- [ ] Calendar
- [ ] RAG Retrieval

**Reusability**: Tool registry can host any tool set

### **Block 4: Database Layer** ❌ (Missing)
- [ ] Postgres setup
- [ ] Row-Level Security (RLS)
- [ ] Multi-tenant schema
- [ ] User data storage
- [ ] Wearable data storage
- [ ] Event logs

**Required for**: Multi-tenancy, wearable data, scaling

### **Block 5: Observability** ⚠️ (Partial)
- [x] Basic logging
- [ ] Langfuse traces
- [ ] Structured metrics
- [ ] Alerting system
- [ ] Dashboard

**Required for**: Production monitoring, debugging, compliance

### **Block 6: Wearable Integration** ❌ (Missing)
- [ ] Oura API integration
- [ ] WHOOP API integration
- [ ] Data sync service
- [ ] Event rules engine
- [ ] Real-time monitoring

**Required for**: F1 team features

### **Block 7: Doctor Console** ❌ (Missing)
- [ ] Admin interface
- [ ] User monitoring
- [ ] Alert dashboard
- [ ] Human-in-the-loop (HITL)
- [ ] Intervention system

**Required for**: F1 team doctor oversight

### **Block 8: Multi-Tenancy** ❌ (Missing)
- [ ] Tenant management
- [ ] White-label portal
- [ ] Team hierarchies
- [ ] Branding system
- [ ] Data isolation

**Required for**: F1 team licensing

---

## 🚀 **Scaling to 100k+ Users**

### **Current Limitations**
1. **In-memory rate limiting** - Won't work with multiple instances
2. **No database** - User data only in Clerk
3. **No caching** - Every request hits AI APIs
4. **No load balancing** - Single instance
5. **No CDN** - Static assets served directly

### **Required Changes**

#### **1. Database Migration**
```typescript
// Move from Clerk-only to Postgres + Clerk
- User profiles in Postgres (with RLS)
- Subscription status in Postgres
- Chat history in Postgres
- Tool usage analytics in Postgres
```

#### **2. Redis for State Management**
```typescript
// Replace in-memory rate limiting
- Redis for rate limiting (shared across instances)
- Redis for session management
- Redis for caching AI responses
- Redis for distributed locks
```

#### **3. Horizontal Scaling**
```typescript
// Support multiple Next.js instances
- Stateless API routes
- Shared database (Postgres)
- Shared cache (Redis)
- Load balancer (Vercel/Cloudflare)
```

#### **4. API Optimization**
```typescript
// Reduce AI API calls
- Cache common responses
- Batch similar requests
- Use streaming for long responses
- Implement request deduplication
```

---

## 🔄 **Multi-Tenancy Architecture**

### **Tenant Model**
```typescript
interface Tenant {
  id: string;
  name: string; // "BioFlo Global" | "F1 Team Red Bull" | etc.
  type: "global" | "team" | "white-label";
  branding: {
    logo: string;
    colors: string[];
    domain?: string;
  };
  features: {
    wearables: boolean;
    doctorConsole: boolean;
    customTools: string[];
  };
  settings: {
    aiProvider: "anthropic" | "openai";
    model: string;
    maxUsers: number;
  };
}
```

### **Data Isolation (RLS)**
```sql
-- Postgres Row-Level Security
CREATE POLICY tenant_isolation ON users
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation ON chat_messages
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### **White-Label Portal**
```typescript
// F1 Team Example
- Custom domain: redbull.bioflo.ai
- Custom branding (logo, colors)
- Team-specific tools
- Doctor console access
- Wearable data integration
```

---

## 📊 **Wearable Integration Design**

### **Data Flow**
```
Oura/WHOOP API → Data Sync Service → Postgres (wearable_data) → 
Event Rules Engine → Alerts → Doctor Console → User Notification
```

### **Event Rules Engine**
```typescript
interface EventRule {
  name: string;
  condition: {
    metric: "heart_rate" | "hrv" | "sleep" | "activity";
    operator: ">" | "<" | "==" | "between";
    value: number | [number, number];
    duration: number; // minutes
  };
  action: {
    type: "alert" | "notification" | "doctor_ping";
    severity: "low" | "medium" | "high" | "critical";
  };
}

// Example: Elevated heart rate
{
  name: "Elevated HR Alert",
  condition: {
    metric: "heart_rate",
    operator: ">",
    value: 100,
    duration: 30 // 30 minutes
  },
  action: {
    type: "doctor_ping",
    severity: "high"
  }
}
```

### **Wearable Data Schema**
```typescript
interface WearableData {
  userId: string;
  tenantId: string;
  source: "oura" | "whoop";
  timestamp: Date;
  metrics: {
    heartRate?: number;
    hrv?: number;
    sleep?: {
      duration: number;
      quality: number;
    };
    activity?: {
      steps: number;
      calories: number;
    };
  };
}
```

---

## 👨‍⚕️ **Doctor Console Design**

### **Features**
1. **User Monitoring**
   - Real-time vital signs dashboard
   - Historical data visualization
   - Alert management

2. **Intervention System**
   - Manual override capabilities
   - Message user directly
   - Pause AI recommendations
   - Flag for review

3. **Analytics**
   - Team health metrics
   - Trend analysis
   - AI recommendation review

### **HITL (Human-In-The-Loop) Flow**
```
AI Recommendation → Safety Filter → Doctor Review Queue → 
Doctor Approval/Rejection → User Notification
```

---

## 📦 **Implementation Roadmap**

### **Phase 1: Foundation (Weeks 1-2)** ✅ Mostly Complete
- [x] Core infrastructure
- [x] AI provider integration
- [x] Basic tool system
- [ ] Postgres setup
- [ ] Redis integration
- [ ] Langfuse traces

### **Phase 2: Scale (Weeks 3-4)**
- [ ] Database migration
- [ ] Redis for rate limiting
- [ ] Caching layer
- [ ] Horizontal scaling setup
- [ ] Load testing

### **Phase 3: Multi-Tenancy (Weeks 5-6)**
- [ ] Tenant management system
- [ ] RLS implementation
- [ ] White-label portal
- [ ] Team hierarchies
- [ ] Branding system

### **Phase 4: Wearables (Weeks 7-8)**
- [ ] Oura API integration
- [ ] WHOOP API integration
- [ ] Data sync service
- [ ] Event rules engine
- [ ] Real-time monitoring

### **Phase 5: Doctor Console (Weeks 9-10)**
- [ ] Admin interface
- [ ] Monitoring dashboard
- [ ] Alert system
- [ ] HITL workflow
- [ ] Intervention tools

### **Phase 6: Polish (Weeks 11-12)**
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation
- [ ] Testing
- [ ] Deployment

---

## 🛠️ **Technology Stack**

### **Current**
- Next.js 16 (App Router)
- Clerk (Auth)
- Stripe (Payments)
- OpenAI + Anthropic (AI)
- Tailwind CSS (Styling)
- TypeScript

### **Required Additions**
- **Postgres** (Database) - Supabase, Neon, or Railway
- **Redis** (Cache) - Upstash, Redis Cloud
- **Langfuse** (Tracing) - Self-hosted or cloud
- **Oura API** (Wearables)
- **WHOOP API** (Wearables)
- **Monitoring** - Sentry, Datadog, or similar

---

## 🔐 **Security & Compliance**

### **Multi-Tenant Security**
- Row-Level Security (RLS) in Postgres
- Tenant isolation at API level
- Encrypted data at rest
- Encrypted data in transit (TLS)

### **Compliance**
- GDPR compliance (EU users)
- HIPAA considerations (health data)
- Data residency options
- Audit logging

---

## 💰 **Cost Optimization**

### **AI API Costs**
- Cache common responses
- Use cheaper models when appropriate
- Implement request deduplication
- Monitor token usage

### **Infrastructure Costs**
- Optimize database queries
- Use CDN for static assets
- Implement auto-scaling
- Monitor resource usage

---

## 📈 **Success Metrics**

### **Technical**
- API response time < 2s (p95)
- Uptime > 99.9%
- Error rate < 0.1%
- Support 100k+ concurrent users

### **Business**
- 100k+ paying users
- < 5% churn rate
- F1 team partnerships
- White-label licensing revenue

---

## 🎯 **Next Steps**

1. **Immediate** (This Week)
   - [x] Switch to Claude 4.5 as primary
   - [ ] Set up Postgres database
   - [ ] Integrate Redis for rate limiting
   - [ ] Add Langfuse tracing

2. **Short Term** (Next 2 Weeks)
   - [ ] Database schema design
   - [ ] Multi-tenant architecture design
   - [ ] Wearable API research
   - [ ] Doctor console wireframes

3. **Medium Term** (Next Month)
   - [ ] Multi-tenancy implementation
   - [ ] Wearable integration
   - [ ] Doctor console MVP
   - [ ] Load testing

---

## 📝 **Building Blocks Reusability**

### **How to Create a New AI Agent**

1. **Copy Core Infrastructure** ✅
   - Authentication (Clerk)
   - Payments (Stripe)
   - Request validation
   - Model router

2. **Customize**
   - System prompt (change `BIOFLO_SYSTEM_PROMPT`)
   - Tool set (add/remove tools)
   - Feature gates (custom subscription tiers)

3. **Extend**
   - Add domain-specific tools
   - Custom response formatting
   - Specialized safety filters

**Example: Legal AI Agent**
```typescript
// 1. Copy core infrastructure
// 2. Change system prompt
const LEGAL_SYSTEM_PROMPT = "You are a legal AI assistant...";

// 3. Add legal tools
- Document analyzer
- Case law search
- Contract generator
- Compliance checker

// 4. Custom feature gates
- Basic: 10 documents/month
- Pro: Unlimited documents
- Enterprise: Custom pricing
```

---

This architecture supports your vision of:
✅ Enterprise-grade, scalable system
✅ Building blocks for future AI agents
✅ 100k+ user capacity
✅ Multi-tenancy (F1 teams)
✅ Wearable integration
✅ Doctor console (HITL)
✅ Global deployment

