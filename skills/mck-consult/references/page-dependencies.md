# Dummy Page dependency and precondition specifications

## 🎯 Core Question

When continuing across conversations, some pages rely on the results of previous steps:

**Problem Scenario**:
```
User uploads Dummy.md in new conversation:
"Please generate page 2 executive summary"

But page 2 requires:
❌ Complete Issue Tree (results of STEP 2-3)
❌ Core findings from all chapters (results from other pages)
❌ Final conclusion (results on the last page)

→ Cannot be generated independently!
```

## 💡 Solution: Page dependency annotation system

### Dependency type definition

```javascript
const DEPENDENCY_TYPES = {
  // Type 1: Independent page - can be generated independently at any time
  INDEPENDENT: {
    symbol: "✅ INDEPENDENT",
    description: "No dependencies, can be generated directly",
    examples: ["Cover", "General data analysis page"]
  },
  
  // Type 2: Forward dependency - requires certain previous pages to be completed first
  FORWARD_DEPENDENT: {
    symbol: "⏩ depends on the previous page",
    description: "Requires data/conclusions on pages X-Y",
    examples: ["Trend comparison page (requires basic data page)", "In-depth analysis page"]
  },
  
  // Type 3: Backward dependency - requires subsequent pages to be completed first
  BACKWARD_DEPENDENT: {
    symbol: "⏪ depends on the following page",
    description: "You need to complete pages X-Y before you can summarize",
    examples: ["Table of Contents/Executive Summary", "Chapter Summary Page"]
  },
  
  // Type 4: External documentation required - requires specific documentation from the user
  REQUIRES_DOC: {
    symbol: "📄 Documentation required",
    description: "Requires user to provide [document type]",
    examples: ["Executive summary (requires Issue Tree)", "Summary page (requires full analysis)"]
  },
  
  // Type 5: Bidirectional dependency - depends on both the front and the back
  BIDIRECTIONAL: {
    symbol: "⏸️Last generated",
    description: "Need to complete both front and rear pages",
    examples: ["catalog", "global summary"]
  }
};
```

## 📋 Dummy Page annotation format

### Standard template

```markdown
## Page X: [McKinsey argument title]

**Dependency**: [Dependency Type]
**Prerequisite**: [Specific requirements]
**Checklist**: [Conditions that must be confirmed before Claude is generated]
**Countermeasures when missing**: [What to do if the conditions are not met]

**Layout**: [layout type]
**Chart**: [Chart Type]
**Data Requirements**: [Data Points]
...
```

### Specific examples of each type

#### Type 1: Independent page

```markdown
## Page 5: China’s new energy vehicle market continues to expand, reaching 1.2 trillion yuan in 2023

**Dependencies**: ✅ Independent
**Prerequisites**: None
**CHECKLIST**:
  - [ ] No need to check, can be generated directly

**Layout**: title + single chart shape
**Chart**: Bar chart (2019-2023 market size)
**Data Requirements**:
  - Market size data from 2019 to 2023
**Information source**:
  - web_search: "China's new energy vehicle market size 2023"
  - Reference source: https://example.com/report
**Excel Sheet**: "Page 5 Market Size"
```

#### Type 2: Forward dependency

```markdown
## Page 8: Tesla’s market share drops from 25% to 18%, local brands rise

**Dependencies**: ⏩ Depends on previous page
**Prerequisite**: Requires "Market Size Data" on page 5
**Dependency Page**: Page 5
**CHECKLIST**:
  - [ ] Confirm that page 5 has been generated
  - [ ] Confirm that there is 2022-2023 market size data in Excel on page 5
  - [ ] Get total market size from page 5 as denominator

**Countermeasures when missing**:
  - If page 5 is not completed → inform the user: "Page 8 depends on the data on page 5, it is recommended to complete page 5 first"
  - If the user insists on generating → temporarily generate the market size data on page 5 first, and then generate page 8

**Layout**: title + left and right columns
**Chart**: Pie chart on the left (market share), bar chart on the right (sales volume of each brand)
**Data Requirements**:
  - Market share of each brand (2022 vs 2023)
  - Reliance data: Total market size on page 5
**Information source**:
  - web_search: "Tesla China Market Share 2023"
  - Internal dependency: Excel "Market Size" data on page 5
**Excel Sheet**: "Page 8 Market share changes"
```

#### Type 3: Backward dependency

```markdown
## Page 2: Table of Contents/Executive Summary

**Dependencies**: ⏪ Dependencies on the following page
**Prerequisite**: All text pages (pages 3-20) need to be completed
**Dependency Page**: Page 3-20
**CHECKLIST**:
  - [ ] Pages 3-20 are all completed
  - [ ] The core argument of each page has been extracted
  - [ ] Key findings for each chapter summarized

**Countermeasures when missing**:
  - Option 1 (recommended): "The executive summary cannot be generated until all analyzes are completed. It is recommended that this page be generated last."
  - Option 2: "If you need a placeholder first, please provide the Issue Tree document and I will generate an executive summary framework based on the hypothesis."
  - Option 3: "I can generate the directory structure first and leave the executive summary blank to be filled in later."

**Layout**: Title + Bullets
**Content requirements**:
  - Core Discovery 1 (from pages X-Y)
  - Core Discovery 2 (from page Z)
  - Key recommendations (from last page)
**Information source**:
  - Internal dependencies: titles and key data of all text pages
**Excel Sheet**: No data sheet required
```

#### Type 4: External documentation required

```markdown
## Page 2: Executive Summary

**Dependencies**: 📄 Documentation required
**Prerequisite**: Requires "Issue Tree + Hypotheses" document
**Required Documents**:
  - Hypothesis Tree output of STEP 3
  - Or project background documentation provided by the user
**CHECKLIST**:
  - [ ] Check if there is an Issue Tree in the current conversation
  - [ ] If not, ask the user if they have the document
  - [ ] Confirm core assumptions and validate results

**Countermeasures when missing**:
  - Case 1: Same conversation, STEP 1-3 completed before
    → Extract Issue Tree information from conversation history
  
  - Case 2: Cross-conversation, user did not upload the Issue Tree
    → "The executive summary needs to be based on the project's Issue Tree and core assumptions.
       You have the following options:
       1. Upload the Hypothesis Tree document generated by STEP 3 before
       2. Briefly describe the core research questions and hypotheses
       3. First generate pages 3-20, and finally deduct the executive summary based on the analysis results."
  
  - Case 3: User provides Issue Tree
    → Generate executive summary framework based on Issue Tree

**Layout**: Title + Bullets
**Content requirements**:
  - Core research questions (from Issue Tree)
  - Main findings (from Hypotheses verification)
  - Key recommendations (based on validation results)
**Information source**:
  - Required: Issue Tree + Hypotheses documentation
  - Optional: Completed analysis page
**Excel Sheet**: No data sheet required
```

#### Type 5: Two-way dependency

```markdown
## Page 2: Table of Contents

**Dependencies**: ⏸️ Last generated
**Prerequisites**:
  - All text page titles need to be determined (pages 3-25)
  - Need clear division of chapters
**Dependent Pages**: Pages 3-25 (all text pages)
**CHECKLIST**:
  - [ ] All text pages have been generated
  - [ ] The title of each page is determined
  - [ ] Chapter structure is clear

**Countermeasures when missing**:
  - Standard process: "The table of contents should be generated after all pages are completed, please complete pages 3-25 first"
  
  - Quick space occupation: if the user urgently needs the complete PPT
    → "I can generate a directory structure framework based on Dummy files,
       However, the page numbers may need to be adjusted later. Continue?"
  
  - Generated based on Dummy:
    → Read all page titles in Dummy.md
    → Organized by chapters
    → Mark "[Page number to be confirmed]"

**Layout**: Directory type
**Content requirements**:
  - Title of each page
  - Corresponding page number
  - Chapter grouping
**Information source**:
  - Internal dependencies: titles of all generated pages
  - Or based on: page design list in Dummy.md
**Excel Sheet**: No data sheet required
```

## 🔍 Claude’s pre-generation inspection process

### Automatic inspection process

```python
def check_dependencies_before_generate(page_number, dummy_md, completed_pages):
    """
    Automatically perform dependency checks before generating any pages
    """
    page_spec = parse_page_from_dummy(dummy_md, page_number)
    dependency_type = page_spec['dependency']
    
    # Step 1: Check dependency type
    if dependency_type == "✅ Independent":
        return {"can_generate": True}
    
    elif dependency_type == "⏩ Dependency previous page":
        required_pages = page_spec['Dependent pages']
        missing = [p for p in required_pages if p not in completed_pages]
        
        if missing:
            return {
                "can_generate": False,
                "reason": f"You need to complete page {missing} first",
                "strategy": page_spec['Countermeasures when missing']
            }
        else:
            return {"can_generate": True}
    
    elif dependency_type == "⏪ Dependency back page":
        required_pages = page_spec['Dependent pages']
        missing = [p for p in required_pages if p not in completed_pages]
        
        if missing:
            return {
                "can_generate": False,
                "reason": f"It is recommended to generate this page after page {required_pages} is completed",
                "strategy": page_spec['Countermeasures when missing']
            }
    
    elif dependency_type == "📄 Documentation required":
        required_doc = page_spec['Required Document']
        
        if not check_document_availability(required_doc):
            return {
                "can_generate": False,
                "reason": f"Required{required_doc}",
                "strategy": page_spec['Countermeasures when missing']
            }
    
    elif dependency_type == "⏸️Last generated":
        all_pages = range(3, total_pages + 1) # except cover and table of contents
        missing = [p for p in all_pages if p not in completed_pages]
        
        if missing:
            return {
                "can_generate": False,
                "reason": "It is recommended to generate all analysis pages after they are completed",
                "strategy": page_spec['Countermeasures when missing']
            }
```

### Claude's response skills

**Case 1: Can be generated directly**
```
Page X: [Title]
✅ Dependency check passed, start generating...
[Execute generation process]
```

**Case 2: Missing dependencies, provide options**
```
Page X: [Title]
⚠️ Dependency check: This page depends on the data on page Y

You have the following options:
1. Complete page Y first, then return to generate page X (recommended)
2. I temporarily generate the necessary data for page Y first, then generate page X
3. Skip page X and generate it later

Please tell me your choice (1/2/3)?
```

**Case 3: External documentation required**
```
Page 2: Executive Summary
📄 Requires Issue Tree document

This page must be based on the project's core assumptions and research framework. Please choose:
1. Do you have the Hypothesis Tree document generated by STEP 3? (Upload it)
2. Do you want me to generate other analysis pages first, then infer the executive summary from the results?
3. Briefly describe the core research question and I will generate the framework from it

Please choose or tell me your situation.
```

**Case 4: Generate last**
```
Page 2: Table of Contents
⏸️ Generate last

The table of contents requires all page titles to be determined before it can be accurately generated.

Suggested process:
1. Complete the analysis content on pages 3-25 first.
2. Confirm all headings and chapter structure.
3. Generate the table of contents last (based on the actual completed pages).

If you need to see the overall structure first, I can also generate a temporary table-of-contents framework based on the Dummy file.

Continue generating the table of contents, or do other pages first?
```

## 📝 Complete Dummy.md template (including dependency annotation)

```markdown
# [Project Name] Dummy Pages

## Project information
- Creation date: YYYY-MM-DD
- Total number of pages: 25 pages
- Estimated chapters: 4 chapters

## Page dependency overview ⭐ New

Recommended build order:**Round 1: Independent pages**(any order)
- Page 1 (Cover) ✅ Independent
- Page 3 (Market Size) ✅ Independent
- Page 4 (User Portraits) ✅ Independent
- Page 5-15 (data analysis page) ✅ Independent**Round 2: Forward dependent pages**(Depends on the first round)
- Page 16 (Trend Summary) ⏩ Requires pages 3-15
- Page 18 (Competitive Analysis) ⏩ Page 5,7 required**Round 3: Backward dependency page**(finally generated)
- Page 2 (Executive Summary) ⏪ Requires pages 3-24
- Page 25 (Conclusion Recommendations) ⏪ Requires pages 3-24**Special Instructions**:
- If you continue writing across conversations, it is recommended to generate them in the above order.
- If some pages are missing, Claude will provide strategies
- You can skip the dependency page and add it later

---

## Page 1: Cover

**Dependencies**: ✅ Independent
**Prerequisites**: None
**CHECKLIST**: No inspection required

**Layout**: Title centered
**Content**:
  - Main title: [Project Name]
  - Subtitle: [Subtitle]
**McKinsey Design**: dark blue background gradient
**Excel Sheet**: No data sheet required

---

## Page 2: Executive Summary

**Dependencies**: 📄 Documentation required + ⏪ Dependencies on back page
**Prerequisites**:
  - Ideal: All analysis pages (pages 3-24) completed
  - Minimum: Issue Tree + Hypotheses documentation required
**Required Documents**:
  - Hypothesis Tree in STEP 3
  - or user-described core research questions
**CHECKLIST**:
  - [ ] Check whether there is Issue Tree information
  - [ ] If there are completed pages, extract core findings
  - [ ] Confirm key assumptions and validate results

**Countermeasures when missing**:
```
If generating this page in a new conversation:
1. Ask the user if he or she has an Issue Tree document
2. If not, three options are provided:
   - Upload Issue Tree
   - Describe the core research question
   - First generate the analysis page, and finally reverse the executive summary
3. Execute corresponding policies based on user selections
```

**Layout**: Title + Bullets
**Content requirements**:
  - Core findings 1-3 (from analysis page)
  - Key recommendations
**Information source**:
  - Required: Issue Tree documentation or user description
  - Optional: Complete the core arguments of the analysis page
**Excel Sheet**: No data sheet required

---

## Page 3: China’s new energy vehicle market size reaches 1.2 trillion yuan, with a 5-year CAGR of 45%

**Dependencies**: ✅ Independent
**Prerequisites**: None
**CHECKLIST**: No inspection required

**Layout**: title + single chart shape
**Chart**: Bar chart + line chart combination
**Data Requirements**:
  - Market size from 2019 to 2023
  - Year-on-year growth rate
**McKinsey Design**:
  - Color: SECONDARY_BLUE main color
  - Marked: 1.2 trillion in 2023
  - Insight box: CAGR 45%, the fastest in the world
**Information source**:
  - web_search: "China's new energy vehicle market size 2023"
  - Reference sources:
    - https://www.199it.com/archives/1234567.html
      (iResearch: 2023 New Energy Vehicle Market Report)
**Excel Sheet**: "Page 3 Market Size"

---

## Page 8: Tesla’s market share drops from 25% to 18%, local brands rise

**Dependencies**: ⏩ Depends on previous page
**Prerequisite**: Requires market size data on page 3
**Dependency Page**: Page 3
**CHECKLIST**:
  - [ ] Page 3 completed
  - [ ] Page 3 Excel has 2022-2023 total market size
  - [ ] Denominator data can be obtained from page 3

**Countermeasures when missing**:
```
If page 3 is not completed:
1. Inform users of dependencies
2. Provide options:
   - Complete page 3 first (recommended)
   - Temporarily search market size data and directly generate page 8
3. If you choose option 2, mark the data source in Excel
```

**Layout**: title + left and right columns
**Chart**:
  - Left: Pie chart (brand market share in 2023)
  - Right: Bar chart (sales changes of each brand)
**Data Requirements**:
  - Market share of Tesla/BYD/NIO, etc.
  - 2022 vs 2023 comparison
  - Depends on: Total market size on page 3
**McKinsey Design**:
  - Tesla highlighted in red
  - Local brands use blue color
  - Insight box: The total proportion of local brands exceeds 60%
**Information source**:
  - web_search: "Tesla China Market Share 2023"
  - web_search: "BYD Market Share 2023"
  - Internal dependency: Excel "Market Size" on page 3
**Excel Sheet**: "Page 8 Brand Competition"

---

## Page 16: Summary of this Chapter - The market is growing rapidly but the competitive landscape is not stable

**Dependencies**: ⏩ Depends on previous page
**Prerequisite**: Page 3-15 needs to be completed
**Dependent Pages**: Pages 3-15 (entire Chapter 1)
**CHECKLIST**:
  - [ ] Pages 3-15 all completed
  - [ ] Extract the core arguments of each page
  - [ ] Summarizes the key findings of the chapter

**Countermeasures when missing**:
```
If some pages are not completed:
1. List completed and unfinished pages
2. Generate a partial summary based on the completed page
3. Mark "[to be added after pages X and Y are completed]"
4. It is recommended to regenerate this page after completing all pages.
```

**Layout**: Insight summary page
**Content requirements**:
  - Core finding 1: Market size (page 3)
  - Core Finding 2: Growth Drivers (pages 5-7)
  - Core Finding 3: Competitive Landscape (pages 8-12)
  - Core Finding 4: User Characteristics (pages 13-15)
**McKinsey Design**:
  - 4 insight boxes, arranged in 2×2
  - Each box corresponds to a core discovery
  - Summary of key data at the bottom
**Information source**:
  - Internal dependencies: core arguments and key data on pages 3-15
**Excel Sheet**: No new data required, refer to the previous page

---

## Page 25: Conclusions and Recommendations

**Dependencies**: ⏸️ Last generated
**Prerequisite**: All analysis pages (pages 3-24) completed
**Dependency Page**: Page 3-24
**CHECKLIST**:
  - [ ] Analysis of all chapters completed
  - [ ] Core findings are clear
  - [ ] Hypothesis verification conclusion is clear

**Countermeasures when missing**:
```
This page must be generated last:
1. Remind users: "The conclusion page needs to be based on a complete analysis, and it is recommended to be generated last"
2. If the user insists on generating:
   - Generate a hypothetical conclusion framework based on Issue Tree
   - Mark "[to be verified]"
   - Regenerate after all analysis is completed
```

**Layout**: Title + Bullets
**Content requirements**:
  - 3 core conclusions
  - 3 strategic suggestions
  - Action plan
**McKinsey Design**:
  - Conclusion with dark blue background box
  - It is recommended to use a light blue background frame
  - Action plan form
**Information source**:
  - Internal dependencies: core findings for all analysis pages
  - Comprehensive: Hypothesis verification results of Issue Tree
**Excel Sheet**: No new data, citations and summaries required

---

[Continue to other pages...]
```

## 🎯 Implementation points

### When designing Dummy in STEP 5

Claude must:
1. ✅ Mark dependencies for each page
2. ✅ Clearly list the prerequisites
3. ✅ Provide countermeasures when missing
4. ✅ Add "Page Dependency Overview" at the beginning of Dummy
5. ✅ Give suggested generation order

### When generating the page in STEP 6-7

Claude must:
1. ✅ Automatically check dependencies before generating
2. ✅ Provide clear options if something is missing
3. ✅ Wait for user confirmation before continuing
4. ✅ Record the source page of dependent data
5. ✅ Mark dependencies in Excel

### When continuing across conversations

After the user uploads Dummy.md, Claude must:
1. ✅ First read the "Page Dependency Overview"
2. ✅ Check the type of page the user wants to generate
3. ✅ Automatically perform dependency checks
4. ✅ If you have any questions, ask instead of assuming
5. ✅ Provide flexible coping strategies

## 📚 Summary

### Core Values

1. **Prevent invalid generation**: Avoid generating pages that lack key information
2. **Improve user experience**: Clearly inform dependencies and allow users to make independent choices
3. **Support flexible continuation**: No mandatory order, but suggestions are provided
4. **Quality Assurance**: Ensure that each page has necessary data support

### Three levels of dependency annotation

**Level 1: Basic annotation** (minimum requirement)
```markdown
**Dependencies**: [type symbol]
**Prerequisites**: [Requirements]
```

**Level 2: Complete annotation** (recommended)
```markdown
**Dependencies**: [type symbol]
**Prerequisites**: [Requirements]
**Checklist**: [Specific inspection items]
**Countermeasures when missing**: [Countermeasures]
```

**Level 3: Detailed annotation** (complex projects)
```markdown
**Dependencies**: [type symbol]
**Prerequisites**: [Requirements]
**Dependent page**: [specific page number]
**Required Document**: [Document Type]
**Checklist**: [Specific inspection items]
**Missing Countermeasures**: [Multiple options]
**Depends on data**: [Source description]
```

---

**Version**: V3.1 - Dependency-Aware Architecture
**Date**: 2025-10-26
**Author**: Qianru Tian