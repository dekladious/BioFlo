# Matthew Walker Sleep Coach Integration

## Overview

Successfully integrated Matthew Walker's "Science of Better Sleep" MasterClass content into BioFlo's AI coach system. The Sleep Coach provides evidence-based sleep guidance grounded in Matthew Walker's research.

## Files Created

### Content Structure
- `knowledge/sleep/matthew-walker/raw/` - Directory for Matthew Walker content files
- `knowledge/sleep/matthew-walker/raw/README.md` - Documentation for the content folder

### Scripts
- `scripts/ingest_sleep_matthew_walker.js` - Ingestion pipeline for Matthew Walker content

### Code Modules
- `lib/ai/prompts/sleepCoach.ts` - Sleep Coach system prompt
- Updated `lib/ai/rag.ts` - Added sleep-specific RAG functions
- Updated `app/api/chat/route.ts` - Integrated sleep mode detection and context retrieval
- Updated `lib/ai/prompts.ts` - Added sleep mode support to prompt builder

## How It Works

### 1. Content Ingestion

Place Matthew Walker files in `knowledge/sleep/matthew-walker/raw/`:
- Part 1-15 .txt files (MasterClass transcripts)
- MW_complete_2025_GB.pdf (compiled guide)

Run ingestion:
```bash
npm run ingest:sleep
```

The script will:
- Read all .txt and .pdf files
- Split into semantic chunks (~1600 characters)
- Generate embeddings using `text-embedding-3-small`
- Insert into `documents` table with metadata:
  - `topic: "sleep"`
  - `author: "Matthew Walker"`
  - `source: "mw_masterclass"`
  - `file: <filename>`
  - `order: <chunk_number>`

### 2. Sleep Mode Detection

Sleep mode is activated when:
- Frontend sends `domain: "sleep"` in the request body, OR
- User message contains sleep-related keywords (detected by `isSleepQuery()`)

Keywords include: sleep, insomnia, chronotype, caffeine, coffee, nap, jet lag, circadian, melatonin, sleep apnea, bedtime, wake time, etc.

### 3. RAG Retrieval

When sleep mode is active:
- `getSleepContext()` retrieves top 8 sleep documents (Matthew Walker content only)
- Filters by `topic = "sleep"` AND `source = "mw_masterclass"`
- Formats context with source attribution
- Context is injected into the Sleep Coach system prompt

### 4. Sleep Coach Prompt

The Sleep Coach uses a specialized system prompt that:
- Grounds advice in Matthew Walker's science
- Emphasizes behavioral, low-risk interventions
- Maintains strict medical boundaries
- Handles crisis/emergency situations appropriately
- Never quotes MasterClass verbatim (paraphrases in BioFlo's voice)

### 5. Integration with Existing System

- Sleep mode takes priority over longevity knowledge when detected
- Safety triage still runs first (crisis/emergency handling)
- Sleep context is formatted and injected into the prompt
- AI Gateway routes to appropriate handler based on triage

## Safety & Boundaries

The Sleep Coach maintains strict safety boundaries:

### ✅ What It Does
- Provides educational information about sleep science
- Suggests low-risk behavioral changes (wake time, light exposure, caffeine timing)
- References Matthew Walker's research (paraphrased, not quoted)
- Encourages professional care for serious issues

### ❌ What It Never Does
- Diagnose sleep disorders
- Recommend starting/stopping medications
- Provide medical treatment plans
- Replace professional sleep medicine evaluation

### 🚨 Crisis Handling

Immediately redirects to emergency/professional care for:
- Suicidal thoughts or self-harm
- Severe sleep deprivation with dangerous symptoms
- Suspected sleep apnea with daytime sleepiness
- Serious medical conditions (pregnancy, heart disease, epilepsy, etc.)

## Usage

### Ingest Content
```bash
npm run ingest:sleep
```

### Test Sleep Mode

In the chat interface, try queries like:
- "Why does caffeine so late mess up my sleep?"
- "When should I stop drinking coffee?"
- "What is deep sleep and why is it important?"
- "How do chronotypes work?"
- "I can't fall asleep, what should I do?"

The coach should:
- Use Matthew Walker's science to ground answers
- Provide practical, behavioral recommendations
- Include appropriate safety disclaimers
- Never quote MasterClass verbatim

### Programmatic Sleep Mode

Frontend can explicitly activate sleep mode:
```javascript
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [...],
    domain: 'sleep'  // Explicitly activate sleep mode
  })
});
```

## Dependencies

Added to `package.json`:
- `pdf-parse: ^1.1.1` - For parsing PDF files during ingestion

## File Structure

```
knowledge/
  sleep/
    matthew-walker/
      raw/
        README.md
        Part 1 - ...txt
        Part 2 - ...txt
        ...
        Part 15 - ...txt
        MW_complete_2025_GB.pdf

scripts/
  ingest_sleep_matthew_walker.js

lib/
  ai/
    prompts/
      sleepCoach.ts
    rag.ts (updated)
    prompts.ts (updated)

app/
  api/
    chat/
      route.ts (updated)
```

## Notes

- **Copyright**: Matthew Walker content files are excluded from git (see `.gitignore`)
- **Idempotent**: Ingestion script can be run multiple times safely (deletes old chunks first)
- **Graceful Degradation**: If sleep context retrieval fails, chat continues with general knowledge
- **Priority**: Sleep mode takes precedence over longevity knowledge when detected
- **Safety First**: All existing safety guardrails remain in place

## Next Steps

1. **Add Content Files**: Place Matthew Walker files in `knowledge/sleep/matthew-walker/raw/`
2. **Run Ingestion**: `npm run ingest:sleep`
3. **Test**: Try sleep-related queries in the chat interface
4. **Monitor**: Check logs to verify sleep context is being retrieved and used
5. **Iterate**: Refine sleep detection keywords or context formatting as needed

