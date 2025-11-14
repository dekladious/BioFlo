# 🧪 BioFlo Testing Checklist

## 🎨 **UI/UX Testing**

### **Homepage**
- [ ] Check gradient hero section loads correctly
- [ ] Verify animated logo/icon displays
- [ ] Test "Get Started" and "View Plans" buttons
- [ ] Verify feature grid displays (6 cards)
- [ ] Test hover effects on feature cards
- [ ] Check responsive design on mobile/tablet

### **Chat Interface**
- [ ] Check glassmorphism effect on chat container
- [ ] Verify empty state with suggestion chips
- [ ] Test clicking suggestion chips (fills input)
- [ ] Test sending a message
- [ ] Verify gradient user message bubbles
- [ ] Check BioFlo avatar displays correctly
- [ ] Test markdown rendering (headings, lists, code blocks)
- [ ] Test copy-to-clipboard button (hover to see)
- [ ] Verify loading animation (bouncing dots)
- [ ] Test auto-scroll when new messages arrive
- [ ] Check character counter (10,000 max)
- [ ] Test auto-resizing textarea
- [ ] Verify Shift+Enter for new line works
- [ ] Test Enter to send message

### **Subscribe Page**
- [ ] Check gradient pricing display
- [ ] Verify feature checklist (8 items)
- [ ] Test "Subscribe Now" button
- [ ] Test "Manage Billing" button
- [ ] Verify loading states on buttons
- [ ] Check error handling display

### **Navigation**
- [ ] Test sticky header
- [ ] Check glass effect on header
- [ ] Verify logo hover effect
- [ ] Test navigation links (Chat, Subscribe)
- [ ] Check Sign in button styling
- [ ] Verify UserButton displays when signed in

---

## 🛠️ **Tool Testing**

### **1. Meal Planner**
Try these queries:
- [ ] "Plan a 2500 kcal pescatarian day"
- [ ] "Meal plan for 2000 calories, keto diet"
- [ ] "2500 kcal meal plan, no nuts, no dairy"

**What to check:**
- [ ] Markdown formatting displays correctly
- [ ] Meal plan structure (Breakfast, Lunch, Dinner, Snacks)
- [ ] Macro breakdown shows
- [ ] Timing recommendations appear
- [ ] Tips section displays

### **2. Supplement Recommender**
Try these queries:
- [ ] "Recommend supplements for sleep"
- [ ] "What supplements should I take for performance?"
- [ ] "Supplement stack for longevity on a budget"
- [ ] "Supplements for stress and recovery"

**What to check:**
- [ ] Supplement list with dosages
- [ ] Timing schedule displays
- [ ] Cost estimates appear
- [ ] Interactions warnings show
- [ ] Precautions section displays

### **3. Sleep Optimizer**
Try these queries:
- [ ] "How to optimize my sleep?"
- [ ] "Sleep protocol for better sleep quality"
- [ ] "I have trouble falling asleep"

**What to check:**
- [ ] Sleep schedule recommendations
- [ ] Protocol steps display correctly
- [ ] Light exposure guidelines
- [ ] Temperature recommendations
- [ ] Sleep environment tips
- [ ] Optional supplements listed

### **4. Protocol Builder**
Try these queries:
- [ ] "Create a longevity protocol"
- [ ] "Build a protocol for performance and recovery"
- [ ] "4 week protocol for weight loss"
- [ ] "Protocol for energy and sleep optimization"

**What to check:**
- [ ] Multi-phase protocol structure
- [ ] Daily routine displays
- [ ] Metrics to track section
- [ ] Supplement recommendations
- [ ] Tips and warnings sections
- [ ] Phase breakdown (Foundation, Optimization, Mastery)

### **5. Women's Health**
Try these queries:
- [ ] "Women's health protocol for hormonal balance"
- [ ] "Cycle optimization protocol"
- [ ] "PCOS support protocol"
- [ ] "Menopause protocol"

**What to check:**
- [ ] Cycle-phase protocols (Menstrual, Follicular, Ovulatory, Luteal)
- [ ] Phase-specific nutrition recommendations
- [ ] Exercise recommendations by phase
- [ ] Supplement recommendations
- [ ] Hormonal optimization strategies

---

## 🔄 **Interaction Testing**

### **Chat Flow**
- [ ] Send multiple messages in sequence
- [ ] Test message persistence (refresh page, messages should remain)
- [ ] Test error handling (disconnect internet, see error message)
- [ ] Verify rate limiting message (if applicable)
- [ ] Check subscription required message (if not Pro)

### **Responsive Design**
- [ ] Test on desktop (1920x1080, 1440x900)
- [ ] Test on tablet (768px width)
- [ ] Test on mobile (375px width)
- [ ] Verify all buttons are touch-friendly
- [ ] Check text readability on all sizes

---

## ⚡ **Performance Testing**

- [ ] Page load speed (< 2 seconds)
- [ ] Smooth scrolling
- [ ] Fast message rendering
- [ ] No layout shifts
- [ ] Smooth animations

---

## 🐛 **Bug Testing**

### **Edge Cases**
- [ ] Very long messages (10,000 characters)
- [ ] Empty message send attempt
- [ ] Rapid message sending
- [ ] Special characters in input
- [ ] Markdown with code blocks
- [ ] URLs in messages
- [ ] Emoji in messages

### **Error Scenarios**
- [ ] Network error handling
- [ ] API timeout
- [ ] Invalid responses
- [ ] Subscription errors

---

## ✅ **Quick Test Commands**

Test each tool with one command:

```bash
# Meal Planner
"Plan a 2000 kcal vegan day"

# Supplements
"Recommend supplements for sleep and stress"

# Sleep
"Optimize my sleep schedule"

# Protocol
"Create a 4 week longevity protocol"

# Women's Health
"Women's health protocol for cycle optimization"
```

---

## 🎯 **What to Look For**

### **Visual**
- ✅ Smooth animations
- ✅ Consistent gradients
- ✅ Glass effects working
- ✅ Proper spacing
- ✅ Clean typography
- ✅ Professional appearance

### **Functionality**
- ✅ All tools trigger correctly
- ✅ Responses format properly
- ✅ Markdown renders correctly
- ✅ Copy button works
- ✅ Auto-scroll works
- ✅ Loading states display

### **UX**
- ✅ Intuitive interface
- ✅ Clear visual hierarchy
- ✅ Easy to use
- ✅ Responsive feedback
- ✅ Error messages clear

---

## 📝 **Issues to Report**

If you find any issues, note:
1. **What you did:** (e.g., "Clicked suggestion chip")
2. **What happened:** (e.g., "Input didn't fill")
3. **What should happen:** (e.g., "Input should fill with suggestion text")
4. **Browser/Device:** (e.g., "Chrome on Windows")
5. **Screenshot:** (if visual issue)

---

**Happy Testing! 🚀**


