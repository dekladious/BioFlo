# BioFlo Master Prompt System Upgrade

## Overview

Integrated the comprehensive BioFlo master system prompt with topic modules, RAG context blocks, adaptation instructions, and example conversations into the codebase.

## Files Created

### 1. `lib/ai/prompts/master.ts`
- Contains the **BioFlo Master System Prompt** with:
  - Identity & Voice guidelines
  - Scope & Limits
  - Safety & Red Flags
  - Biohacking Philosophy
  - Expert & RAG Context usage
  - Decision-Making Style
  - How to Answer structure
  - Style Details

### 2. `lib/ai/prompts/topicModules.ts`
- Contains **5 topic-specific modules**:
  - **Sleep Module**: Sleep hygiene, circadian rhythm, caffeine/alcohol timing, insomnia patterns, shift work
  - **Longevity & Training Module**: VO2max, Zone 2, strength, stability, healthspan framework
  - **Nutrition & Metabolic Module**: Protein, macros, meal timing, fat loss, metabolic health
  - **Anxiety & Mental Fitness Module**: Stress management, breathing, routines, professional boundaries
  - **Wearables & Data Module**: HRV, RHR, sleep data interpretation, trend analysis
- Includes `getTopicModule()` function to automatically detect and apply relevant modules based on user queries

### 3. `lib/ai/prompts/adaptation.ts`
- Contains **User Adaptation Instructions**:
  - Schedule constraints (work hours, night shifts, kids, travel)
  - Training level and injury history
  - Stress load and mental health considerations
  - Financial constraints and equipment access
  - "Good/better/best" options
  - Experiment labeling and tracking guidance
- Contains **RAG Context Block Template** with instructions on how to use expert knowledge snippets

### 4. `docs/bioflo-prompt-spec.md`
- Complete specification document containing:
  - Master system prompt
  - All topic modules
  - RAG context instructions
  - User adaptation guidelines
  - Reference to 30 golden example conversations

## Files Modified

### `lib/ai/prompts.ts`
- Updated `buildMainCoachPrompt()` function to:
  - Use `BIOFLO_MASTER_SYSTEM_PROMPT` instead of the old `BIOFLO_SYSTEM_PROMPT` for main chat
  - Automatically detect and inject relevant topic modules based on user query
  - Include user adaptation instructions
  - Format RAG context blocks with proper instructions
  - Maintain backward compatibility with sleep coach mode

## Integration Points

The new prompt system is automatically integrated into:
- **Main chat route** (`app/api/chat/route.ts`): Uses `buildMainCoachPrompt()` which now includes:
  - Master system prompt
  - Relevant topic module (if detected)
  - User adaptation instructions
  - RAG context with proper formatting

## How It Works

1. **User sends a message** → Chat API receives it
2. **Topic detection** → `getTopicModule()` analyzes the query for keywords
3. **Prompt building** → `buildMainCoachPrompt()` constructs:
   - Base: Master system prompt (or Sleep Coach if sleep mode)
   - + Topic module (if detected and not in sleep mode)
   - + User adaptation instructions
   - + RAG context block (if available)
4. **AI response** → Model receives comprehensive, context-aware prompt

## Backward Compatibility

- The old `BIOFLO_SYSTEM_PROMPT` in `lib/ai/policy.ts` is still available for:
  - Onboarding assessments
  - Today plan generation
  - Weekly debriefs
  - Other specialized prompts
- Sleep Coach mode (`SLEEP_COACH_SYSTEM_PROMPT`) remains unchanged and takes precedence when sleep mode is detected

## Example Usage

When a user asks: *"I want to improve my VO2max for longevity"*

The system will:
1. Detect "VO2max" and "longevity" keywords
2. Inject the **Longevity & Training Module**
3. Include relevant RAG context from longevity knowledge base
4. Apply user adaptation instructions
5. Generate a response using the master prompt framework

## Next Steps

The 30 golden example conversations are documented in `docs/bioflo-prompt-spec.md` and can be:
- Used as few-shot examples in future prompt refinements
- Referenced when building new prompt templates
- Used for testing and validation

## Testing

To test the new prompt system:
1. Ask questions in different domains (sleep, longevity, nutrition, mental fitness, wearables)
2. Verify that topic modules are being detected and applied
3. Check that RAG context is properly formatted
4. Ensure responses follow the BioFlo voice and safety guidelines

## Notes

- The master prompt is significantly more comprehensive than the previous version
- Topic modules provide domain-specific guidance without duplicating the master prompt
- RAG context instructions ensure expert knowledge is integrated properly
- User adaptation ensures recommendations are realistic and personalized

