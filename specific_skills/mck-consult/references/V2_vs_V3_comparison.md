# mck-consult V2 → V3 Architecture Upgrade Instructions

## 🎯 Core Question

**Context consumption problem in V2.0**:
- SKILL.md contains 1130 lines of complete documentation (~30KB)
- Claude loads everything into the context at once
- After generating 10-15 pages of PPT, the context is close to saturation
- Large projects (20-25 pages) require frequent dialogue switching

## 💡 V3.0 solution: Progressive Disclosure (progressive disclosure)

### Core Concept
```
Minimal cores + on-demand loading = context saving
```

### Architecture comparison

| Dimensions | V2.0 | V3.0 |
|------|------|------|
| **SKILL.md size**| 1130 lines (~30KB) | ~300 lines (~8KB) |
|**Loading method**| Load all at once | Progressive loading on demand |
|**Context Consumption**| High (100%) | Low (~30%) |
|**Stably generated number of pages**| 10-15 pages | 20-25 pages |
|**references processing**| preload all | file_read only when used |

## 📊 Detailed comparison

### V2.0 workflow
```
start
  ↓
Load the complete SKILL.md (line 1130)
  ↓
[Context has been consumed by 30%]
  ↓
Execute STEP 1-5
  ↓
[Context 50% consumed]
  ↓
STEP 6-7: Generate pages 1-10
  ↓
[Context 90% consumed]
  ↓
Quality issues begin on page 11
  ↓
Need to switch to a new conversation
```

### V3.0 workflow
```
start
  ↓
Load streamlined SKILL.md (~300 lines)
  ↓
[Context consumption 10%]
  ↓
STEP 1: Direct execution
  ↓
STEP 2-3: Temporarily load methodology.md → Release after use
  ↓
[Context consumption 20%]
  ↓
STEP 4-5: Temporarily load layouts.md + design-specs.md → release after use
  ↓
[Context consumption 30%]
  ↓
STEP 6-7: Temporarily load excel-data-spec.md
           Process page by page (only 5 search results of the current page are retained each time)
  ↓
Page 1: Search→Generate→Clear
Page 2: Search→Generate→Clear
...
Page 20: Search→Generate→Clear
  ↓
[Context consumption 60%]
  ↓
Can stably complete 20-25 pages
```

## 🔑 Key Design Principles

### 1. Minimum core principle

**V2.0**:
```markdown
SKILL.md contains:
- Full methodology description
- Detailed execution steps
- All design specifications
- Excel specification
- Troubleshooting
- Case reference
= 1130 lines of full text
```

**V3.0**:
```markdown
SKILL.md only contains:
- Trigger logic
- Workflow overview
- Execution framework
- Reference index
- When to load which file
= ~300 lines of core navigation
```

### 2. On-demand loading principle (Lazy Loading)

**V2.0**:
```python
# At startup
load_everything() # Load everything at once
```

**V3.0**:
```python
# At startup
load_core_only() # Only load the SKILL.md core

# When executing
if step == "2-3":
    file_read("methodology.md")
    use_it()
    release_from_context() # Release after use

if step == "4-5":
    file_read("layouts.md")
    file_read("design-specs.md")
    use_them()
    release_from_context()

if step == "6-7":
    file_read("excel-data-spec.md")
    for each_page:
        search_data() # Up to 5 times
        generate_page()
        clear_search_results() # Clear each page
```

### 3. Page-by-page processing principle

**Possible issues with V2.0**:
```python
# If you accidentally process multiple pages at once
search_all_pages() # 15 pages × 5 searches = 75 search results
# Context explosion!
```

**V3.0 forced page by page**:
```python
for page in pages:
    # Each page loops independently
    search_current_page() # Up to 5 results
    generate_current_page()
    clear_context() # Clear the current page data
    # Context reset when continuing to next page
```

## 📁 File structure changes

### V2.0 structure
```
mck-consult/
├── SKILL.md (1130 lines, everything included)
└── references/
    ├── methodology.md (for backup reference)
    ├── layouts.md
    └── ... (Claude will not read it actively)
```

### V3.0 structure
```
mck-consult/
├── SKILL.md (300 lines, navigation map)
│ ├── Trigger logic
│ ├── Workflow framework
│ ├── When to load which reference
│ └── Contextual optimization strategy
└── references/
    ├── methodology.md ← file_read in STEP 2-3
    ├── layouts.md ← file_read in STEP 4-5
    ├── design-specs.md ← file_read in STEP 4-5
    ├── excel-data-spec.md ← file_read in STEP 6
    ├── delivery-summary.md ← STEP 8 file_read when needed
    ├── troubleshooting.md ← STEP 9 problem file_read
    ├── quick-guide.md ← file_read when asked by user
    └── workflow.md ← file_read when requested by user
```

## 🎯 Context saving effect

### Calculation example (generate 20 pages of PPT)

**V2.0 context consumption**:
```
SKILL.md full text: ~10,000 tokens
STEP 1-5 execution: ~5,000 tokens
STEP 6-7 first 10 pages: ~30,000 tokens
────────────────────────
Total: ~45,000 tokens (close to limit)
Next 10 pages: Quality drops or dialogue needs to be switched
```

**V3.0 context consumption**:
```
SKILL.md core: ~3,000 tokens
STEP 2-3 (temporarily load methodology.md): ~1,500 tokens → Release
STEP 4-5 (temporarily load layouts + design): ~2,000 tokens → release
STEP 6 (temporarily load excel-spec): ~1,000 tokens
STEP 6-7 Page by page (5 searches per page):
  Page 1: ~1,500 tokens → Clear
  Page 2: ~1,500 tokens → Clear
  ...
  Page 20: ~1,500 tokens → Clear
────────────────────────
Peak consumption: ~8,000 tokens
Total sustainable: 20-25 stress-free pages
```

**Savings**: ~70%+ context consumption

## 🔄 Migration Guide

### For existing users

**V2.0 Dummy files are still compatible!** The changes in V3.0 are only at the SKILL.md level, and the Dummy.md format remains completely unchanged, so:

- ✅ **Existing Dummy files can be used directly in V3.0**
- ✅ **Completed projects can be continued with V3.0**
- ✅ **No need to redesign Dummy**

### For developers

If you want to develop other skills based on this architecture:

**Core principles**:
1. SKILL.md = Navigation map, not encyclopedia
2. Detailed content is placed in references/, and file_read is required.
3. Release after use, no permanent context
4. Large loops must be processed in batches

**Implementation template**:
```markdown
# SKILL.md structure

## Core trigger logic
[When to start]

## Workflow overview
[step framework]

## STEP 1
Execution: [brief description]
Loading: None

## STEP 2
Execution: [brief description]
Load: file_read(references/xxx.md)
Release: After use

## Reference index
| File | Purpose | When to load |
```

## 📈 Effect prediction

### User experience improvement

**V2.0 Typical Dialogue**:
```
Dialogue 1: Complete STEP 1-5 + first 10 pages of PPT
Dialogue 2: Continue to PPT pages 11-20 (requires uploading Dummy)
Dialogue 3: Optimization and modification
```

**V3.0 Typical Dialogue**:
```
Dialogue 1: Complete STEP 1-5 + all 20-25 pages of PPT + optimization
```

### Improved stability

**V2.0**:
- Quality may drop after page 10
- Requires frequent monitoring of context
- Large projects must split conversations

**V3.0**:
- Stable output of 20-25 pages
- Predictable context consumption
- Reduce the need to switch conversations by 70%+

## ✅ Summary

### Three core advantages of V3.0

1. **Lighter weight**: SKILL.md compressed from 1130 lines to ~300 lines
2. **Smarter**: Load on demand and release after use
3. **More stable**: Can stably generate 20-25 pages of PPT

### Implementation method

- **Navigation Map**: SKILL.md only tells Claude "where to find what"
- **Progressive disclosure**: file_read the corresponding document only when needed
- **Page-by-page loop**: Force batch processing to avoid context explosion

### Backwards Compatibility

- ✅ Existing Dummy files are fully compatible
- ✅ The workflow is completely consistent
- ✅ No change in user experience
- ✅ Just internal structure optimization

---

**Version**: V3.0 Progressive Disclosure Architecture
**Date**: 2025-10-26
**Author**: Qianru Tian