# Longevity Knowledge Base Integration - Summary

## Overview

Successfully integrated the BioFlo Longevity Knowledge Base into the existing RAG system. The integration allows the AI coach to access and use longevity-focused educational content when answering user questions.

## Files Created

### Content Files
- `content/longevity/longevity_fundamentals_attia_style.md` - Core longevity framework
- `content/longevity/cardio_and_vo2max_for_longer_life.md` - Cardio fitness and VO2max
- `content/longevity/four_horsemen_overview.md` - Major chronic disease risks
- `content/longevity/strength_and_stability_for_the_marginal_decade.md` - Functional strength training
- `content/longevity/metabolic_health_and_muscle_attia_style.md` - Metabolic health and muscle
- `content/longevity/nutrition_principles_for_longevity.md` - Nutrition principles
- `content/longevity/sleep_principles_bioflo.md` - Sleep and recovery framework
- `content/longevity/emotional_health_and_inner_voice.md` - Mental resilience framework

### Scripts
- `scripts/ingestLongevityDocs.js` - Ingestion pipeline for longevity documents
- `scripts/testLongevityRAG.js` - Test script for verifying RAG retrieval

## Code Changes

### 1. RAG Module (`lib/ai/rag.ts`)
- Added `detectLongevityTopicHint()` - Detects topic hints from user messages
- Added `getRelevantLongevityDocs()` - Retrieves longevity documents with topic boosting
- Added `formatLongevityKnowledgeSnippets()` - Formats knowledge snippets for AI context

### 2. Chat API (`app/api/chat/route.ts`)
- Integrated longevity knowledge retrieval alongside existing RAG
- Longevity knowledge takes priority over general RAG context
- Graceful error handling if retrieval fails

### 3. Prompt Templates (`lib/ai/prompts.ts`)
- Updated to handle longevity knowledge snippets
- Added instructions for using longevity knowledge safely
- Maintains medical boundaries and safety guardrails

### 4. Package Scripts (`package.json`)
- Added `ingest:longevity` script for running ingestion

## How It Works

1. **User sends a message** to the chat endpoint
2. **Topic detection** analyzes the message for longevity-related keywords
3. **Document retrieval** searches the longevity knowledge base using embeddings
4. **Topic boosting** prioritizes documents matching the detected topic
5. **Formatting** converts retrieved documents into structured knowledge snippets
6. **AI context** includes knowledge snippets in the prompt
7. **AI response** uses the knowledge to provide informed, educational answers

## Topic Mapping

The system maps user queries to topics:
- `longevity_fundamentals` - Core concepts, healthspan, biomarkers
- `cardio_vo2max` - Cardio fitness, Zone 2, VO2max training
- `four_horsemen` - Chronic disease risks (heart, metabolic, cancer, neurodegenerative)
- `strength_stability` - Functional strength, balance, marginal decade
- `metabolic_muscle` - Insulin resistance, metabolic health, muscle mass
- `nutrition_longevity` - Nutrition principles, protein, energy balance
- `sleep_longevity` - Sleep quality, circadian rhythm, recovery
- `emotional_health` - Mental resilience, inner voice, stress management

## Safety & Boundaries

The integration maintains all existing safety guardrails:
- **No medical diagnosis** - All content is educational only
- **No medication advice** - Never suggests starting/stopping medications
- **Crisis handling** - Safety triage takes precedence over knowledge retrieval
- **Doctor referral** - Always recommends consulting healthcare providers for medical decisions

## Usage

### Ingest Longevity Documents
```bash
npm run ingest:longevity
```

This will:
1. Read all `.md` files from `content/longevity/`
2. Split into semantic chunks (~800 tokens)
3. Generate embeddings using `text-embedding-3-small`
4. Insert into `documents` table with proper metadata
5. Delete and replace existing longevity docs (idempotent)

### Test RAG Retrieval
```bash
node scripts/testLongevityRAG.js
```

This tests various queries and shows:
- Topic hint detection
- Document retrieval
- Similarity scores
- Formatted snippets

## Example Queries That Will Trigger Longevity Knowledge

- "How do I improve VO2 max?"
- "What are the four horsemen?"
- "Explain zone 2 training"
- "How does muscle mass relate to metabolic health?"
- "What is the marginal decade?"
- "Tell me about insulin resistance"
- "Sleep principles for longevity"
- "Nutrition for healthspan"

## Next Steps

1. **Run ingestion**: `npm run ingest:longevity`
2. **Test retrieval**: `node scripts/testLongevityRAG.js`
3. **Test in chat**: Try queries like "What is VO2max?" or "Explain the four horsemen"
4. **Monitor logs**: Check that longevity knowledge is being retrieved and used
5. **Iterate**: Add more content or refine topic detection as needed

## Notes

- The ingestion script is idempotent - safe to run multiple times
- Documents are stored with `source: "bioflo_longevity"` in metadata
- All longevity docs have `risk_level: "low"` (educational content)
- The system prioritizes longevity knowledge over general RAG when both are available
- Safety triage always takes precedence - crisis/emergency messages bypass knowledge retrieval

