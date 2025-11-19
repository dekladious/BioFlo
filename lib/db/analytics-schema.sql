-- Analytics Database Schema
-- 
-- Pseudonymous analytics tables for BioFlo
-- No PII stored in analytics tables - only hashed user IDs

-- AI Users table: maps real user IDs to pseudonymous AI user IDs
CREATE TABLE IF NOT EXISTS public.ai_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- nullable if anonymous/guest (references users.id if exists)
  ai_user_id TEXT NOT NULL UNIQUE, -- hashed id used in analytics
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_users_ai_user_id ON public.ai_users(ai_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_users_user_id ON public.ai_users(user_id);

-- Analytics Events table: main event log
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  ai_user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_ts TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  topic TEXT,
  risk TEXT,
  complexity TEXT,
  model_used TEXT,
  used_judge BOOLEAN,
  judge_verdict TEXT,
  needs_rag BOOLEAN,
  can_answer_from_context BOOLEAN,
  messages_in_session INT,
  answer_length INT,
  rag_docs_count INT,
  rag_sources JSONB,
  success BOOLEAN,
  error_code TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type_ts ON public.analytics_events(event_type, event_ts);
CREATE INDEX IF NOT EXISTS idx_analytics_events_ai_user_id_ts ON public.analytics_events(ai_user_id, event_ts);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);

-- System Health Checks table: infrastructure monitoring
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id BIGSERIAL PRIMARY KEY,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL, -- "ok" | "degraded" | "down"
  message TEXT,
  latency_ms INT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_health_checks_check_name_ts ON public.system_health_checks(check_name, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_status ON public.system_health_checks(status, checked_at DESC);

-- API Errors table: error tracking
CREATE TABLE IF NOT EXISTS public.api_errors (
  id BIGSERIAL PRIMARY KEY,
  ai_user_id TEXT,
  endpoint TEXT,
  error_message TEXT,
  error_stack TEXT,
  status_code INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_errors_endpoint_ts ON public.api_errors(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_errors_ai_user_id ON public.api_errors(ai_user_id, created_at DESC);

