# Testing Guide - BioFlo Tools

## Quick Start

1. **Start the dev server** (if not already running):
   ```bash
   pnpm dev
   ```

2. **Open your browser**:
   ```
   http://localhost:3000
   ```

3. **Sign in** (or create an account)

4. **Go to Chat**:
   - Click "Chat" in the navigation
   - Or go to: http://localhost:3000/chat

## Testing Each Tool

### 1. Meal Planner 🍽️

**Test prompts:**
- "Plan a 2,500 kcal pescatarian day (no nuts)"
- "Create a keto meal plan for 1,800 calories"
- "I need a vegan meal plan for 2,200 calories"
- "Plan meals for a 2,000 calorie day, no dairy"

**What to expect:**
- Daily meal plan with breakfast, lunch, dinner
- Macro breakdown (protein, carbs, fat)
- Fasting window recommendations (if applicable)
- Electrolyte recommendations

---

### 2. Supplement Recommender 💊

**Test prompts:**
- "Recommend supplements for sleep and longevity"
- "I want a supplement stack for muscle gain, budget is moderate"
- "What supplements should I take for anxiety and stress?"
- "Create a beginner supplement stack for performance"

**What to expect:**
- Personalized supplement recommendations
- Dosage and timing
- Purpose and benefits
- Estimated cost
- Interaction warnings

---

### 3. Sleep Optimizer 😴

**Test prompts:**
- "Optimize my sleep schedule - I go to bed at 11pm and wake at 6am"
- "Help me improve my sleep quality"
- "I have trouble falling asleep, create a sleep protocol"
- "Design a sleep optimization plan for better recovery"

**What to expect:**
- Optimal sleep schedule
- Circadian rhythm alignment
- Light exposure recommendations
- Sleep hygiene tips
- Optional supplements

---

### 4. Protocol Builder 📋

**Test prompts:**
- "Create a 4-week longevity protocol"
- "Design a performance optimization protocol for an athlete"
- "Build a biohacking protocol for weight loss"
- "I want a 6-week protocol for muscle gain"

**What to expect:**
- Multi-phase protocol (4-6 weeks)
- Daily routines
- Metrics to track
- Supplements included
- Progression plan

---

### 5. Women's Health 👩

**Test prompts:**
- "Create a protocol for hormonal balance"
- "I have PCOS, help me optimize my health"
- "Design a cycle-based nutrition plan"
- "Help with menopause symptoms"

**What to expect:**
- Cycle-based protocols (if applicable)
- Phase-specific nutrition
- Exercise recommendations
- Supplements for hormonal health

---

### 6. Fasting Protocol Planner 🕐

**Test prompts:**
- "Create a fasting protocol for weight loss"
- "I want to start intermittent fasting, beginner level"
- "Design an OMAD protocol"
- "Help me with a 16:8 fasting plan"

**What to expect:**
- Fasting protocol (16:8, 18:6, OMAD, etc.)
- Eating/fasting windows
- 4-week progression plan
- Electrolyte recommendations
- Breaking fast advice

---

### 7. Cold/Hot Therapy Planner 🧊🔥

**Test prompts:**
- "Create a cold plunge protocol"
- "I want to start cold exposure therapy"
- "Design a sauna protocol"
- "Help me with contrast therapy"

**What to expect:**
- Cold plunge protocol (Huberman-style)
- Sauna protocol
- Contrast therapy sequences
- 4-week progression
- Safety guidelines

---

### 8. Stress Management Protocol 🧘

**Test prompts:**
- "Help me manage stress and anxiety"
- "Create a stress reduction protocol"
- "I need breathing exercises for panic attacks"
- "Design a meditation and HRV protocol"

**What to expect:**
- Breathing exercises (Physiological Sigh, Box Breathing, 4-7-8)
- Meditation protocols
- HRV optimization
- Adaptogen recommendations
- Daily routine suggestions

---

### 9. Macro Calculator 📊

**Test prompts:**
- "Calculate my macros for weight loss, I'm 75kg"
- "I need macros for muscle gain, 80kg, active"
- "Calculate calories and macros for maintenance, 70kg"
- "What are my macros for keto diet, 65kg"

**What to expect:**
- BMR and TDEE calculations
- Target calories
- Protein, carbs, fat breakdown
- Meal distribution
- Tips for success

---

### 10. Recovery Optimizer 💪

**Test prompts:**
- "Optimize my recovery after strength training"
- "I did a HIIT workout, help me recover"
- "Create a recovery protocol for endurance training"
- "I'm sore after my workout, what should I do?"

**What to expect:**
- Post-workout recovery protocols
- Sleep optimization
- Recovery supplements
- Active recovery activities
- Nutrition timing

---

## Testing Tips

### 1. Natural Language Works Best
The tools detect keywords automatically. Just ask naturally:
- ✅ "I need a meal plan for 2,000 calories"
- ✅ "Help me with sleep"
- ✅ "Calculate my macros"

### 2. Be Specific for Better Results
- ✅ "Meal plan for 2,500 calories, pescatarian, no nuts"
- ✅ "Sleep protocol, I go to bed at 11pm, wake at 6am"
- ✅ "Macros for weight loss, 75kg, moderate activity"

### 3. Check the Response Format
All tool responses are formatted with:
- Headers and sections
- Bullet points
- Tables (for macros)
- Tips and recommendations

### 4. Try Multiple Tools in One Chat
You can ask follow-up questions:
- "Create a meal plan" → "Now optimize my sleep for this plan"
- "Calculate my macros" → "Create a meal plan based on these macros"

---

## What to Look For

✅ **Tool Detection**: The AI should automatically detect which tool to use
✅ **Formatted Output**: Responses should be nicely formatted with markdown
✅ **Personalization**: Results should match your inputs (calories, goals, etc.)
✅ **Completeness**: All relevant sections should be included

---

## Troubleshooting

**Tool not triggering?**
- Try rephrasing with keywords (e.g., "meal plan", "supplement", "sleep")
- Be more specific about what you want

**Response not formatted?**
- Check browser console for errors
- Make sure markdown rendering is working

**No response?**
- Check that you're signed in
- Verify you have Pro subscription (for chat)
- Check server logs for errors

---

## Example Test Session

1. **Start**: "Create a 2,000 calorie meal plan, pescatarian"
   → Should trigger Meal Planner

2. **Follow-up**: "Now calculate my macros for weight loss, I'm 70kg"
   → Should trigger Macro Calculator

3. **Follow-up**: "Optimize my sleep schedule, I go to bed at 11pm"
   → Should trigger Sleep Optimizer

4. **Follow-up**: "I'm stressed, help me manage it"
   → Should trigger Stress Management Protocol

All in one chat session! 🎉

---

## Quick Test Checklist

- [ ] Meal Planner - Creates meal plan with macros
- [ ] Supplement Recommender - Recommends supplements
- [ ] Sleep Optimizer - Provides sleep schedule
- [ ] Protocol Builder - Creates multi-week protocol
- [ ] Women's Health - Cycle-based protocols
- [ ] Fasting Planner - Fasting protocol with schedule
- [ ] Cold/Hot Therapy - Cold plunge/sauna protocols
- [ ] Stress Management - Breathing exercises
- [ ] Macro Calculator - Calculates BMR/TDEE/macros
- [ ] Recovery Optimizer - Post-workout recovery

---

Happy testing! 🚀

