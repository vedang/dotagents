# mck-consult Skill Quick Reference Guide

## 🎯 What can this skill do?

Transform any business problem into:
1. **Structured analysis framework** (Issue Tree + Hypotheses)
2. **Complete research report** (McKinsey-style PPT, 15-25 pages)

Full integration of **Problem Solving methodology** + **mckinsey-ppt-v4 PPT generation capability**

---

## 🚀 Three-step usage process

### Step 1: Enter the business question

Describe your problem directly, for example:

```
"Our company is considering entering the Chinese charging pile market.
Help me analyze the market growth and key players, and what opportunities we have. "
```

or:

```
"Analyze why China's short video market has grown so fast in recent years,
Mainly which segments are growing and what are the driving factors. "
```

### Step 2: Collaboratively build the framework

Claude will guide you through:

**1.1 Define problem boundaries (Is & Isn't)**
- Clarify research objectives
- Delineate the research scope
- Determine the delivery form

**1.2 Establish an Issue Tree (2-3 layers of MECE disassembly)**
- Automatically generate a structured question tree
- Review and adjust it with you

**1.3 Form Hypotheses (Hypothesis Driven)**
- Run quick searches to form preliminary hypotheses
- Build a coherent storyline

**1.4 Design Dummy Pages**
- Design McKinsey-style pages for each hypothesis
- Determine page layout, chart type, and data requirements

### Step 3: Generate McKinsey style PPT

Claude will:
1. **Collect data** - Execute `web_search` 15-30 times
2. **Generate the first PPT version** - Call mckinsey-ppt-v4
3. **Iteratively optimize** - Fix issues based on your feedback (2-3 rounds)

Final output: **polished McKinsey-style research report PPT** ✨

---

## 📋 McKinsey core design specifications

### Color scheme
- **Dark Blue** (#002960): Main title/header
- **Mid Blue** (#0065BD): Main chart color
- **Light Blue** (#C9F0FF): Insight box background
- **Yellow** (#FFDB00): emphasis/warning

### Mandatory Rules ⚠️
1. **Dark blue background must be paired with white text** (contrast!)
2. **Use right-angled rectangles for large text boxes** (>3 inches wide)
3. **Borderless by default** (minimalism)
4. **Argument-style title** (each page title is a complete argument)
5. **High information density** (but text density <60 characters/square inch)

---

## 🎨 McKinsey common page layout

| Layout type | Applicable scenarios | Examples |
|---------|---------|------|
|**Title + Single Chart**| Single Data Story | Market Growth Trend Line Chart |
|**Title + left and right columns**| Comparative analysis | Chart on the left + text explanation on the right |
|**Title + 2×2 Matrix**| Strategic Positioning | Boston Matrix/Opportunity Matrix |
|**Title + Table**| Multi-dimensional comparison | Competitive product comparison table/platform analysis table |
|**Title + Waterfall Chart**| Growth Breakdown | Breakdown of Revenue Growth Drivers |
|**Title + Timeline**| Historical evolution | Market development stage division |
|**Insight Summary Page**| Chapter Summary | 3-5 Core Insights |

---

## 💡 Typical application scenarios

### Scenario 1: Market entry analysis
```
Input: "Should we enter the XX market?"
Output:
- Market size and growth analysis (5 pages)
- Competitive landscape and player analysis (6 pages)
- Opportunity identification and entry recommendations (4 pages)
```

### Scenario 2: Analysis of growth reasons
```
Input: "Why is XX industry/product growing so fast?"
Output:
- Where growth is reflected (market segments/user groups/regions) (6 pages)
- Why growth (demand side + supply side + environment side) (8 pages)
- Key insights and implications (3 pages)
```

### Scenario 3: Competitive product analysis
```
Input: "Analyze the differences between us and competing products A/B/C"
Output:
- Market positioning comparison (2 pages)
- Product function comparison (3 pages)
- Business model comparison (3 pages)
- Advantages and disadvantages analysis and suggestions (3 pages)
```

---

## 🔄 Iterative optimization process

### Round 1: First version generation (10 minutes)
- Complete PPT
- Content integrity takes priority

### Round 2: Problem Identification (5 minutes for users)
- View page by page
- Labeling issues:
  - Element occlusion
  - text overflow
  - Color contrast
  - Chart labels

### Round 3: Targeted Repair (8 minutes)
- Claude precise restoration
- Batch processing of similar problems

### Round 4: Content Split (6 minutes, if needed)
- High density pages split into 2-3 pages

### Round 5: Detail polishing (5 minutes)
- Fine-tune spacing/alignment
- Unified format
- Final inspection

**Total time required: about 30-40 minutes to output the final PPT version** 🎯

---

## ✅ Quality Assurance Checklist

### Content quality
- [ ] Issue Tree complies with MECE principles
- [ ] Assumptions have logical support and data verification
- [ ] Storyline is coherent and smooth
- [ ] Data comes from multiple reliable sources
- [ ] Sufficient evidence and clear arguments

### PPT quality
- [ ] All dark blue background text is white ⭐
- [ ] The header text of the table is white ⭐
- [ ] Use right-angled rectangles for large text boxes ⭐
- [ ] elements without occlusion/overlapping
- [ ] text without overflow
- [ ] Chart labels are displayed in full
- [ ] No unnecessary borders
- [ ] Single page density is reasonable

---

## 📊 Output example

### Typical output structure (page 18)

```
Page 1: Cover
  - Research topics
  - Research duration and scope

Page 2: Table of Contents/Executive Summary
  - Chapter structure based on Hypotheses
  - Preview of core conclusions

Page 3-8: Chapter 1 (Growth Reflection)
  - Market size and growth trends
  - Market segment structure analysis
  - Main player layout

Pages 9-15: Chapter 2 (Causes of Growth)
  - Demand side drivers
  - Supply-side success model
  - In-depth case analysis

Pages 16-17: Chapter 3 (Insights and Suggestions)
  - Summary of core insights
  - Suggestions for action

Page 18: Appendix
  - Data source description
  - Description of research methods
```

---

## 🎓 Source of methodology

This skill is based on:

1. **McKinsey Problem Solving 101/102** - Define problem boundaries (Is & Isn't)
   - Issue Tree Teardown (MECE)
   - Hypothesis-driven

2. **McKinsey PPT V4** - Iterative optimization workflow
   - Mandatory rules with white text on dark blue background
   - Standard rectangular shapes + borderless design

3. **Pyramid Principle** - Structured expression
   - Argument-style title
   - Top-down argument

---

## 🚦 Ready to start?

### Step 1: Prepare your questions
Think clearly about the business problem you want to solve. The more specific the better.

### Step 2: Start the conversation
Say it directly to Claude:

```
"Please use mck-consult skill,
Help me analyze [your problem]"
```

### Step 3: Follow the guidance
Claude will guide you through the entire process, all you need to do is:
- Answer clarifying questions
- Review framework and assumptions
- Feedback on PPT issues

### Step 4: Download the perfect PPT
After 2-3 iterations, download your McKinsey style research report! 🎉

---

## 📞 Sample startup phrase

```
"Please use mck-consult skill to analyze:
Growth and main driving factors of China's new energy vehicle market"
```

```
"Use mck-consult skill to help me research:
Why is short video e-commerce so popular in China and how do the major players do it?
```

```
"Please use mck-consult skill:
Analyze opportunities for our company to enter the Chinese AI education market"
```

---

**Get started now! Describe your business problem and let the mck-consult skill help you complete a professional-grade research report!** 🚀