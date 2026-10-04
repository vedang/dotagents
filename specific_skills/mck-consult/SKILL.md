---
name: mck-consult
description: McKinsey advisory problem-solving system. Starting from business issues, we generate McKinsey style research reports and PPT through hypothesis-driven structured analysis methods. Integrate Problem Solving methodology, MECE principles, Issue Tree dismantling, Hypotheses formation, Dummy Page design, intelligent data collection and professional PPT generation capabilities.
license: MIT
metadata:
  author: Qianru Tian
  email: fleurytian@gmail.com
  social: Xiaohongshu@Ryuho | AI&Analytics
  GitHub: fleurytian
  version: "3.1"
  last_updated: "2025-10-26"
  architecture: "Progressive Disclosure + Dependency-Aware"
---

# mck-consult V3.1

**Architecture**: Progressive Disclosure + Dependency-Aware
**Core Upgrade**:
- V3.0: Minimal core + on-demand loading → save 70% context
- V3.1: Page dependency annotation → more intelligent cross-conversation continuation

---

# ⚠️ CRITICAL BEHAVIOR RULES

**These rules have the highest priority and Claude must strictly abide by them:**

## 1. First use of response rules
When a user says "I just added the mck-consult skill" or "Can you make something amazing with it?":
- ✅**Must use the exact words in the "First Time User Guide" below**
- ✅**Only output 4 lines of text without any expansion**
- ❌**Example questions are prohibited**
- ❌**Detailed inquiries about industry/deliverables/scope, etc. are prohibited**
- ❌**Replies exceeding 4 lines are prohibited**
- ✅**Just ask a question of one of two choices and wait for the user to respond**

## 2. Question clarification rules
- ✅ Only ask the 1-2 most critical questions at the moment
- ❌ Do not list more than 5 questions at once
- ❌ Don’t turn clarification into a “needs survey questionnaire”

## 3. Process startup rules
- ✅ Only enter the Problem Solving process after the user explicitly says "Start" or provides sufficient information.
- ❌ Don’t automatically start STEP 1 when the user just asks

---

## 🎯 Architecture description

**Problem**: V2.0's SKILL.md contains 1130 lines of complete documents, which consumes a lot of context in one go.

**Solution**: V3.0 adopts "Navigation Map" mode
- **SKILL.md**: only navigation and triggering logic (~300 lines)
- **References**: Detailed content is loaded on demand with `file_read`
- **Principle**: Release after use, no permanent context

---

## 🌟 First time use guide

**Detection Trigger**:
- User says "I just added mck-consult skill"
- User said "Can you make something amazing with it?"
- Users ask but are not familiar with this skill

**⚠️ Claude must strictly use the following words and no expansion is allowed:**
```
I see you added mck-consult skill!
This is a McKinsey style problem solving tool.

Do you need me to introduce the working method?
Or just tell me what business problem you want to analyze?
```

**Prohibited items:**
- ❌ Do not list sample questions (such as "Market entry strategy?", "Business growth opportunities?", etc.)
- ❌ Don’t ask in detail about industry/deliverable/scope
- ❌ Don’t use emoji or over-format
- ❌ No more than 4 lines of text
- ✅ Just ask this one-choice question and wait for the user's response

**Correct example ✅:**
```
I see you added mck-consult skill!
This is a McKinsey style problem solving tool.

Do you need me to introduce the working method?
Or just tell me what business problem you want to analyze?
```

**Error Example ❌:**
```
I see you added the mck-consult skill! This is a very powerful consulting framework system.

Before starting to create, I would like to confirm a few key questions with you:

1. **What business problem do you want to solve?**
   - Market entry strategy?
   - Business growth opportunities?
   ...
2. **Desired deliverable form:**
   ...
```

**Introduction if needed** → `file_read: references/quick-guide.md`

---

## 📋 8-step workflow overview

```
Phase 1: Problem Breakdown (20-30 minutes)
  STEP 1: Define problem boundaries
  STEP 2: Issue Tree (MECE disassembly)
  STEP 3: Hypotheses (hypothesis-driven)

Phase 2: Design proposal (30-40 minutes)
  STEP 4: Determine the argument method
  STEP 5: Design Dummy Pages → Export Dummy.md

Phase 3: Page-by-page generation (40-60 minutes)
  STEP 6-7: Loop page by page (Search→Excel→PPT→Self-test→Pause)
  STEP 8: Optional generation of Word
  STEP 9: Iterative optimization
```

**⏱️ Total time**: 90-110 minutes | **vs traditional**: save 95%

---

## 🚀 How to start

### Method 1: New Project
```
"Analyze [Business Problem] with mck-consult"
"Analysis of growth opportunities in China's XX market"
```
→ Claude execution: start from STEP 1

### Method 2: Continue writing across conversations
```
[Upload project name_DummyPages_Date.md]
[Optional: Upload completed PPT and Excel]

"This is a previous project, please continue generating from page X"
```
→ Claude execution: read Dummy and continue from the specified page

---

## 📖 Step-by-step guide

### STEP 1: Define problem boundaries

**Goal**: Clarify "what it is/is not"

**Claude Action**:
1. Ask users about their core goals
2. Clarify the scope of the research
3. Determine delivery form

**Output**:
```markdown
## Problem definition
### Yes ✅
- [Core Objective]
### No ❌
- [Excluded content]
```

**No additional files to load** - basic conversation will do

---

### STEP 2-3: Issue Tree + Hypotheses

**Goal**: MECE dismantling + hypothesis generation

**Claude Action - When first executed**:
```python
# The methodology is only loaded when STEP 2 is executed for the first time.
file_read("/mnt/skills/user/mck-consult/references/methodology.md")

# Understand:
# - Detailed explanation of MECE principle
# - Issue Tree disassembly framework
# - Hypotheses formation method
# - Quick search strategy

# Release after use, no permanent context
```

**Execution process**:
1. Framework disassembly problem based on methodology.md
2. Perform a quick web_search 5-10 times
3. Record the complete URL (prepared for STEP 5)
4. Form a hypothesis tree

**Output**:
```markdown
## Issue Tree + Hypotheses
[Output according to the template of methodology.md]
```

---

### STEP 4-5: Dummy Pages design

**Goal**: Design McKinsey style page layout + mark page dependencies

**Claude Action - When first executed**:
```python
# The design document is loaded only when STEP 4-5 is executed for the first time.
file_read("/mnt/skills/user/mck-consult/references/layouts.md")
file_read("/mnt/skills/user/mck-consult/references/design-specs.md")
file_read("/mnt/skills/user/mck-consult/references/page-dependencies.md")

# Understand:
# - 7 McKinsey page layouts
# - Color matching specifications (PRIMARY_BLUE, etc.)
# - Font size system (title 26pt, etc.)
# - Information Density Standard (50-70 characters/square inch)
# - 3 page dependency types ⭐ New
# - Dependency annotation method ⭐ New

# Release after use
```

**Execution process**:
1. Select the layout type in layouts.md for each hypothesis
2. Apply the design specifications of design-specs.md
3. Clarify the data requirements and sources of each page
4. **⭐ Mark the dependencies of each page** (new)

**Dependency type**:
- ✅ Independent: no dependencies, can be generated directly
- ⏩ Depends on previous page: requires data from previous page
- ⏪ Depend on the following page or hypothesis tree: It needs to be completed on the following page, or you can use specific documents (such as Hypothesis Tree) in the previous step, such as executive summary and table of contents.


**⭐ Output**: `Project name_DummyPages_Date.md`

**Dummy.md structure**:
```markdown
# [Project Name] Dummy Pages

## Project information
- Creation date: YYYY-MM-DD
- Total number of pages: XX pages
- Expected Chapter: Chapter X

## PPT design specifications
[Copy unified specs from design-specs.md]

## ⭐ Page dependency overview (new)

Recommended build order:

**Round 1: Independent pages**(any order)
- Page 1 (Cover) ✅ Independent
- Page 3-10 (Basic Data Analysis) ✅ Independent

**Round 2: Forward dependent pages**(Depends on the first round)
- Page 11 (Trend Summary) ⏩ Requires pages 3-10

**Round 3: Backward dependency page**(finally generated)
- Page 2 (Executive Summary) ⏪ Requires back page or hypothesis tree

## Breakpoint continuation instructions
[Instructions on how to continue writing in a new conversation]

---

## Page 1: Cover

**Dependencies**: ✅ Independent
**Prerequisites**: None

**Layout**: Title centered
**Content**: [Cover Content]
**Excel Sheet**: No data sheet required

---

## Page 2: Executive Summary

**Dependencies**: ⏪ Depends on the back page or hypothesis tree
**Prerequisites**:
  - Ideal: All analysis pages completed
  - Minimum: Issue Tree document required
**Required Document**: Hypothesis Tree for STEP 3
**Countermeasures when missing**:
```
Generated in new conversation:
1. Ask if there is an Issue Tree
2. Provide options: upload/describe/do other pages first
```

**Layout**: Title + Bullets
**Content Requirements**: [Core Discovery]
**Excel Sheet**: No data sheet required

---

## Page 3: [McKinsey argument title]

**Dependencies**: ✅ Independent
**Prerequisites**: None

**Layout**: title + single chart shape
**Chart**: Stacked Column Chart
**Data Requirements**: [Specific Data Points]
**McKinsey Design**: [Color Color, Annotation, Insight Box]
**Information source**:
  - https://example.com/report1 (source description)
**Excel Sheet**: "Page 3 [short title]"

---

## Page 8: [McKinsey argument title]

**Dependencies**: ⏩ Depends on previous page
**Precondition**: Page 3 data is required
**Dependency Page**: Page 3
**Countermeasures when missing**:
```
If page 3 is not completed:
1. Inform dependencies
2. Options: Do page 3 first or temporary search
```

**Layout**: title + left and right columns
**Data Requirements**:
  - [Data on this page]
  - Depends on: XX data on page 3
**Information source**:
  - web_search: "[keyword]"
  - Internal dependency: Excel on page 3
**Excel Sheet**: "Page 8 [short title]"

[Continue on each page...]
```

**⚠️Key**: Dummy.md must be complete and support cross-conversation continuation

---

### STEP 6-7: Collect data page by page + generate PPT&Excel

**⚠️ Core Principle**: It must be cycled page by page and cannot be separated!

**Why page by page**:
- ❌ Search all pages at once → contextual explosion
- ✅ Proceed page by page → There are always only 5 search results for the current page

**Claude Action - When executing STEP 6 for the first time**:
```python
# Load Excel specifications only when starting STEP 6
file_read("/mnt/skills/user/mck-consult/references/excel-data-spec.md")

# Understand the Excel data file structure
# Release after use
```

**Page by page cycle process**:
```
For each page:

0. ⭐ Dependency check (new):
   - View the "Dependencies" annotation on this page
   - If it is "✅ Independent": continue directly
   - If there are dependencies: execute the check process
     * Check whether the dependent page is completed
     * Check if required documents are provided
     * If there is any missing information, inform the user and provide "missing countermeasures"
     * Wait for user confirmation before continuing

1. Check the design requirements of this page in Dummy.md
2. Execute web_search 2-5 times based on the "information source" of the page
3. Record data in Excel according to excel-data-spec.md specifications:
   - [Area A] Original data + source URL
   - [Area B] Final data
4. Generate PPT for this page (designed strictly according to Dummy)
5. 6 items of self-inspection:
   ✓ Layout type matching
   ✓ Chart type matching
   ✓ Real data
   ✓ Complete design elements
   ✓ Excel data is complete
   ✓ Source URL record
6. Inform the user: "Page X is completed and the self-test has passed. Do you want to continue?"
7. Wait for confirmation
8. Clear the search result context of this page
9. Continue to the next page
```

**⭐ Dependency Check Example**:

**Scenario 1: Independent page**
```
Page 5: Market Size Analysis
Dependencies: ✅ Independent

Claude:
"Page 5 has no dependencies, start generating..."
[Directly perform steps 1-9]
```

**Scenario 2: Forward dependency, satisfied**
```
Page 8: Brand competition landscape
Dependencies: ⏩ Dependencies on page 3

Claude checks:
- Page 3 completed ✓
- Page 3 Excel has necessary data ✓

Claude:
"Page 8 dependency check passed, start generating..."
[Perform steps 1-9 to get data from Excel on page 3]
```

**Scenario 3: Forward dependency, not satisfied**
```
Page 8: Brand competition landscape
Dependencies: ⏩ Dependencies on page 3

Claude checks:
- Page 3 is not completed ✗

Claude:
"⚠️ Dependency check: Page 8 requires market size data from Page 3

You have the following options:
1. Complete page 3 first, then return to generate page 8 (recommended)
2. I temporarily search for market size data and directly generate page 8
3. Skip page 8 and generate it later

Please tell me your choice (1/2/3)?"

[Waiting for user confirmation]
```

**Scenario 4: Documentation required**
```
Page 2: Executive Summary
Dependencies: 📄 Documentation required

Claude checks:
- No Issue Tree in the conversation ✗
- Analysis page is not completed ✗

Claude:
"📄 Page 2 (Executive Summary) requires Issue Tree document

This page needs to be based on core assumptions and research framework. Please ask:
1. Do you have the Hypothesis Tree generated by STEP 3? (Just upload it)
2. Do you want me to generate an analysis page first, and then infer an executive summary based on the results?
3. Or briefly describe the core research question upon which I generated the framework?

Please choose or tell me your situation?"

[Waiting for user reply]
```

**Scenario 5: Backward dependency**
```
Page 2: Executive Summary
Dependencies: ⏪ Dependencies on the following page

Claude:
"⏸️ Page 2 (executive summary) recommendations are finally generated

The executive summary requires all analysis to be completed before it can be summarized accurately.

Suggested process:
1. Complete the analysis content on pages 3-25 first.
2. Finally generate an executive summary based on the complete analysis

Of course, if you need to generate the framework first, please provide the Issue Tree document.

Continue to generate page 2, or do other pages first?"

[Waiting for user confirmation]
```
   ✓ Excel data is complete
   ✓ Source URL record
6. Inform the user: "Page X is completed and the self-test has passed. Do you want to continue?"
7. Wait for confirmation
8. Clear the search result context of this page
9. Continue to the next page
```

**Context Management Strategy**:
```python
# Before the start of each page
current_page_context = {
    "dummy_design": read_from_dummy_md(page_number),
    "search_results": [], # up to 5
    "excel_data": {}
}

# After each page is completed
clear_context(current_page_context) # Release the page data
move_to_next_page()
```

**Breakpoint resume writing support**:

**Scenario 1: Pause within the same conversation**
```
User: "Pause, continue tomorrow"
Claude: "Paused on page X"

[later]
User: "Continue from page X"
Claude: [View Dummy page X design, continue looping]
```

**Scenario 2: Cross-conversation continuation**⭐
```
[New conversation]
User: [Upload Dummy.md + PPT + Excel]
      "Please continue from page 6"

Claude:
1. file_read(Dummy.md) # Read the complete design specification
2. Read existing PPT and Excel to understand the progress
3. Check the design requirements on page 6 of Dummy
4. Start the page-by-page cycle process
```

---

### STEP 8: Optional generation of Word

**Trigger**: The user explicitly requests "Word too"

**Claude Action**:
```python
# Load only when the user wants Word
file_read("/mnt/skills/user/mck-consult/references/delivery-summary.md")

# Understand the structure and format requirements of Word reports
# Call docx skill to generate
```

**Principle**: Not mentioned by default to save context

---

### STEP 9: Iterative optimization

**Trigger**: User feedback needs to be modified

**Claude Action**:
```python
# Only load when there is a problem
file_read("/mnt/skills/user/mck-consult/references/troubleshooting.md")

# Learn about common problems and solutions
# Targeted fixes
```

**Optimization focus**:
- Color contrast (dark blue background → white text)
- Information density (50-70 characters/square inch)
- Element occlusion/text overflow

---

## 🎯 Summary of contextual optimization strategies

### V2.0 issues:
```
Loading: SKILL.md full text (1130 lines) + all references
Result: Context is consumed quickly, making it difficult to generate 10-15 pages
```

### V3.0 optimization:
```
Initial load: SKILL.md core (~300 lines)

STEP 1: No additional loading required
STEP 2-3: Temporarily load methodology.md → Release after use
STEP 4-5: Temporarily load layouts.md + design-specs.md → release after use
STEP 6-7: Temporarily load excel-data-spec.md → release after use
        + Process page by page (only 5 search results at a time)
STEP 8: Load delivery-summary.md on demand
STEP 9: Load troubleshooting.md on demand

Result: Context consumption is reduced by 70%+, and 20-25 pages can be generated stably
```

### Claude execution principles:

**Lazy Loading**:
- ✅ `file_read` only when needed
- ✅ Read → Use → Release
- ❌ Do not preload all documents

**Processing in stages**:
- ✅ Each STEP loads required documents independently
- ✅ The details of the previous step are not retained between STEPs
- ✅ Only record key decisions and outputs

**Page by page loop**:
- ✅ STEP 6-7 must be done page by page
- ✅ Clear search results after completing each page
- ✅ Start over on the next page

---

## 📚 Reference file index

Claude reads on demand based on the current STEP:

| File | Purpose | When to load |
|------|------|----------|
| `methodology.md` | MECE, Issue Tree, Hypotheses methodology | STEP 2-3 first execution |
| `layouts.md` | 7 McKinsey page layout libraries | STEP 4-5 first execution |
| `design-specs.md` | Color matching, font size, information density specifications | STEP 4-5 first execution |
| `page-dependencies.md` | Page dependency annotation specifications ⭐ New | STEP 4-5 first execution |
| `excel-data-spec.md` | Excel data file structure specification | STEP 6 first execution |
| `delivery-summary.md` | Word report structure and format | STEP 8 upon user request |
| `troubleshooting.md` | Frequently asked questions and solutions | When you encounter problems in STEP 9 |
| `quick-guide.md` | Quick reference and introduction | When user first asks |
| `workflow.md` | Detailed flow chart | When the user requests to view |
| `examples.md` | Complete case reference | When the user requests a case |

**⚠️ IMPORTANT**: Do not load other files except those required for the current step!

---

## 💡 Usage example

### New projects:
```
User: "Use mck-consult to analyze China's new energy vehicle market"

Claude:
[Loading: None, based on SKILL.md core]
STEP 1: Define problem boundaries...
[When arriving at STEP 2 for the first time]
file_read(methodology.md)
STEP 2-3: Build Issue Tree...
[Release methodology.md after use]
[When arriving at STEP 4-5 for the first time]
file_read(layouts.md)
file_read(design-specs.md)
STEP 4-5: Design Dummy Pages...
[outputDummy.md]
[Release layouts.md, design-specs.md when finished]
[First time at STEP 6]
file_read(excel-data-spec.md)
STEP 6-7: Generate page by page...
  Page 1: Search→Excel→PPT→Self-test→Pause
  [clear page 1 context]
  Page 2: Search→Excel→PPT→Self-test→Pause
  [Clear context on page 2]
  ...
```

### Cross-conversation continuation:
```
[New conversation]
User: [UploadDummy.md]
      "Please continue from page 10"

Claude:
file_read(Dummy.md) # Read the complete project specification
[Identify current in STEP 6-7]
file_read(excel-data-spec.md) # Load on demand
View Dummy page 10 design requirements
Start on page 10: Search→Excel→PPT→Self-test→Pause
```

---

## 🎓 Developer Instructions

**Version**: V3.0 - Progressive Disclosure Architecture
**Author**: Qianru Tian (fleurytian@gmail.com)
**Follow**: Xiaohongshu@Ryuho | AI&Analytics
**Background**: Former McKinsey China Consultant + AI Product Manager

**V3.0 core upgrade**:
1. **Progressive Disclosure**: Compressed from 1130 lines to ~300 lines of core
2. **On-demand loading**: Claude actively `file_read`s required documents
3. **Context optimization**: Release immediately after use, reducing consumption by 70%+
4. **Stability improvement**: Can stably generate 20-25 pages of PPT

**Feedback and Suggestions**: fleurytian@gmail.com

---

## ⚠️ Claude execution checklist

When executing this skill, Claude should confirm:

**⚠️ CRITICAL - Behavior Rules Check**:
- [ ] When used for the first time: Did you strictly use the exact 4 lines?
- [ ] On first use: are examples and detailed inquiries avoided?
- [ ] When clarifying questions: Are only 1-2 key questions asked?
- [ ] Process startup: Do you want to wait for explicit instructions from the user before starting STEP 1?

**Initial Phase**:
- [ ] Only the SKILL.md core is loaded, and references are not preloaded.
- [ ] Understand the "load on demand" principle

**STEP 1**:
- [ ] Direct execution without loading additional files

**STEP 2-3**:
- [ ] `file_read(methodology.md)` only when executed for the first time
- [ ] Do not keep the full text in context after use

**STEP 4-5**:
- [ ] Load layouts.md and design-specs.md only when executed for the first time
- [ ] Output the complete Dummy.md file
- [ ] Release after use

**STEP 6-7**:
- [ ] `file_read(excel-data-spec.md)` only when executed for the first time
- [ ] Strictly cycle page by page, cannot process multiple pages at one time
- [ ] Clear the search results of each page after completing the page
- [ ] Recheck the Dummy design before starting the next page

**STEP 8-9**:
- [ ] Load the corresponding document only when needed
- [ ] Not provided by default

**Full process principle**:
- [ ] is released immediately after use and does not persist in the context.
- [ ] Check troubleshooting.md only when encountering uncertain problems.
- [ ] Do not reload already used documents