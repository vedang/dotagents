---
name: mck-consult
description: "McKinsey advisory problem-solving system. Starting from business problems, through hypothesis-driven structured analysis methods, complete McKinsey-style research reports and PPTs are generated. Integrated Problem Solving methodology, Issue Tree dismantling, Hypothesis formation, data collection, Dummy Page design and ultimate PPT generation capabilities."
version: "1.0"
author: "Based on McKinsey Problem Solving 101/102 methodology"
license: MIT
---

# mck-consult Integrated Problem Solving System

## 🎯 Core Competencies

This skill systematizes McKinsey consulting methodology into an executable workflow to deliver end-to-end solutions from **business problems** to **McKinsey-style PPTs**.

### Three core stages

```javascript
const MCKINSEY_WORKFLOW = {
  phase1: {
    name: 'Hypotheses Tree (hypothesis tree)',
    steps: [
      'STEP 1: Define problem boundaries (Is & Isn\'t)',
      'STEP 2: Create Issue Tree (MECE disassembly)',
      'STEP 3: Form a Hypothesis Tree (hypothesis-driven)'
    ],
    output: 'Structured hypothesis tree and story line'
  },
  
  phase2: {
    name: 'Dummy Pages',
    steps: [
      'STEP 4: Determine the argument method and information sources',
      'STEP 5: Design Dummy Pages structure'
    ],
    output: 'Argument framework and data requirements list for each page'
  },
  
  phase3: {
    name: 'Data Collection & PPT Generation (data collection and generation)',
    steps: [
      'STEP 6: Use web_search to collect data',
      'STEP 7: Generate McKinsey style PPT',
      'STEP 8: Iterative optimization to the ultimate version'
    ],
    output: 'Complete McKinsey style research report PPT'
  }
};
```

## 📋 PHASE 1: Hypotheses Tree (hypothesis tree)

### STEP 1: Define problem boundaries (Is & Isn't)

#### Goal
Clarify "what it is/is not" to avoid straying in the direction and ensure that the research is focused.

#### Method
Align with users on three core questions:
1. **Core objective** - What problem is being solved?
2. **Research scope** - What is included? What is not included?
3. **Delivery form** - What is the final output?

#### Output template
```markdown
## Problem definition

### Yes ✅
- [Core Goal Description]
- [Definition of research scope]
- [deliverable form]

### No ❌
- [Explicitly excluded content1]
- [Explicitly excluded content 2]
- [Explicitly excluded content3]
```

#### Example (Podcast case)
```markdown
## Problem definition

### Yes ✅
- How to make your podcast business more successful
- The ins and outs of China market growth
- Broad online audio program market, including China’s unique content formats

### No ❌
- Whether to start a podcast business (headquarters decides by itself)
- Comparison and replicability analysis of the Chinese and Western podcast markets (the headquarters makes its own judgment based on our in-depth analysis)
- The narrow podcast market as defined by the West
```

### STEP 2: Establish Issue Tree (MECE disassembly)

#### Goal
Use the MECE principle to systematically break down big questions into small, answerable questions.

#### Disassembly principles
1. **Logic-driven** - based on business logic, data structure, and analysis framework
2. **MECE** - each layer is mutually exclusive and collectively exhaustive
3. **Start with 2-3 layers** - first ensure the top 2-3 layers are not overlapping or incomplete, then go deeper as needed
4. **Moderate granularity** - break issues down to a level that can be quickly verified through research

#### Common disassembly frameworks

**Market growth issues:**
```
Market size = number of users × penetration rate × payment rate × customer unit price
```

**Business performance issues:**
```
- Market segment dimensions: A-side/B-side/C-side
- Time dimension: historical trend/current status/future forecast
- Comparison dimensions: industry comparison/competitive product comparison/regional comparison
```

**Cause analysis questions:**
```
- Demand side: Why do users want it? Why do users pay?
- Supply side: What has the company done? What are the differences in the products?
- Environmental side: What changes have occurred in the general environment?
```

#### Output format
```markdown
## Issue Tree

### Lv1: [Top-level question]

#### Lv2: [Sub-question 1]
- Lv3: [Sub-Sub Question 1.1]
  - Lv4: [More detailed question 1.1.1]
  - Lv4: [More detailed question 1.1.2]
- Lv3: [Sub-Sub Question 1.2]

#### Lv2: [Sub-question 2]
- Lv3: [Sub-Sub Question 2.1]
- Lv3: [Sub-Sub Question 2.2]
```

#### Practical Cases (Podcast - Simplified Version)
```markdown
## Issue Tree

### Lv1: 1. Where is the growth of China’s online audio program market specifically reflected?

#### Lv2: 1.1 Market Segment - Which segments of the market have seen an increase in users and revenue?
- Lv3: 1.1.1 What are the market segments?
  - Lv4: 1.1.1.1 What are the subdivisions according to content structure?
  - Lv4: 1.1.1.2 What are the subdivisions according to themes?
- Lv3: 1.1.2 Historical trends in each segment of the market
  - Lv4: 1.1.2.1 When did users in each segment begin to appear? What stages can growth be divided into?
  - Lv4: 1.1.2.2 When will the income of each segment begin to appear, and what stages can growth be divided into?

#### Lv2: 1.2 B-side - Which companies in this market have increased their users and revenue?
- Lv3: 1.2.1 What are the major companies in this market?
- Lv3: 1.2.2 What is the revenue and user structure of each company in each segment?

#### Lv2: 1.3 C-side - Which type of users in this market have increased their time and spending?
- Lv3: 1.3.1 See which users are growing based on demographic attributes
- Lv3: 1.3.2 See which users are growing based on demand reasons

### Lv1: 2. Why is China’s online audio program market growing?

#### Lv2: 2.1 Demand side - In key growth segments, what drives the growth of this type of demand?
- Lv3: 2.1.1 Why do new audio content users convert?
- Lv3: 2.1.2 Why new audio content paying users are willing to pay
- Lv3: 2.1.3 Why audio content paying users are willing to pay more as they pay more

#### Lv2: 2.2 Supply side - In companies that focus on growth, what do they do to win users and revenue?
- Lv3: 2.2.1 What methods are used in the product to increase registration
- Lv3: 2.2.2 What methods are used in the product to increase activity
- Lv3: 2.2.3 What methods are used in the product to increase the payment rate?
```

### STEP 3: Form a Hypothesis Tree (hypothesis-driven)

#### Goal
Convert Issue Tree into testable hypotheses and form a coherent storyline.

#### Methods for forming hypotheses

**1. Common-sense reasoning**
- Make a preliminary judgment based on industry experience and common sense
- Example: "I feel that the audio market is mainly divided into storytelling and knowledge-sharing content."

**2. Fast `web_search`**
- Search industry reports, expert opinions, and data overviews
- Extract framework information instead of all details
- Example: Search for "China Audiobook Market Segmentation" to obtain the classification framework

**3. Form a hypothesis**
- Based on common sense + quick search, form a high-probability judgment for each issue
- Each hypothesis must be testable (know which data can prove or disprove it)

#### Example: convert Issue to Hypothesis

```markdown
**Issue**: 1.1.1.1 What are the subdivisions according to content structure?

**Common sense**: Generally speaking, it feels like storytelling, knowledge telling, and chatting.

**Quick Search**:
- Search "Chinese Audio Program Category"
- Find the "Segment Size" chart in multiple reports
- Extract main categories: audiobooks, online courses, podcasts, children's stories

**Hypothesis/storyline**:
"This market is divided into audiobooks, online courses, traditional podcasts, and children's stories; among them, children's content in audiobooks is a separate category due to its large scale. The main user time growth in the past five years has come from audio courses and dramatized audiobooks."
```

#### Hypothesis Tree output format

```markdown
## Hypothesis Tree / Storyline

### Core Assumptions

**H1**: [The first core assumption is usually the judgment of "where growth is reflected"]
- Supporting hypothesis 1.1: [more detailed hypothesis]
- Supporting hypothesis 1.2: [more detailed hypothesis]

**H2**: [The second core assumption, usually the judgment of "why growth"]
- Supporting hypothesis 2.1: [more detailed hypothesis]
- Supporting hypothesis 2.2: [more detailed hypothesis]

### Key data points that need to be verified
1. [Data point 1] - used to verify H1
2. [Data point 2] - used to verify H1.1
3. [Data point 3] - used to verify H2
```

#### Practical Case (Podcast)

```markdown
## Hypothesis Tree / Storyline

### Core Assumptions

**H1: Market growth will come primarily from audiobooks and online courses, not traditional podcasts**
- H1.1: Audiobooks, "performance audiobooks/radio dramas" are the main growth drivers
- H1.2: The single user value of online courses is extremely high, driving revenue growth
- H1.3: Traditional episode podcasts have low acceptance in China

**H2: The driving force for growth is "fragmented time filling" + "anxiety-driven need for self-improvement"**
- H2.1: User usage scenarios include fragmented time such as commuting and doing housework
- H2.2: Chinese users prefer knowledge/self-improvement content
- H2.3: "Anxiety" and "self-development needs" are the main motivations for payment

**H3: Supply-side content production models and monetization methods support growth**
- H3.1: Audiobooks drive content explosion through the demonstration effect of "high income of leading broadcasters"
- H3.2: Online courses achieve high customer unit prices through "selling courses"
- H3.3: The platform is divided into comprehensive platform (Himalaya) and vertical platform (Get)

### Key data points that need to be verified
1. Number of users and revenue growth data of audiobooks/online courses/podcasts from 2019 to 2024
2. Leading platforms and market shares in each segment
3. User portrait data (age/income/usage scenarios)
4. Content creator monetization data (top broadcaster income/course pricing)
5. Comparison of platform product functions (registration/active/paid conversion methods)
```

## 📋 PHASE 2: Dummy Pages (page design)

### STEP 4: Determine the argument method and information sources

#### Goal
Determine the best justification method and data sources for each hypothesis.

#### Classification of argument methods

**1. Model simulation** - Applicable to market size forecast, growth breakdown, scenario analysis
- Example: "China's audio market size = number of smartphone users × audio penetration rate × payment rate × unit price"

**2. Scale analysis** - Applicable to multi-dimensional comparison and rating/sorting
- Example: "Platform comparison table - Compare Himalaya across user scale, content volume, monetization ability, and product functions"

**3. Framework analysis** - Applicable to strategic positioning and competitive landscape
- Example: "Boston Matrix - Classifies segments by growth rate and market share"

**4. Case analysis** - Applicable to summaries of success factors and benchmarking research
- Example: "How the leading podcaster 'Zijing' started from ghost stories and became financially free"

**5. Data visualization** - Applicable to trend display and structure display
- Example: "2019-2024 stacked area chart of revenue by segment"

**6. Abstract synthesis** - Applicable to user portraits and behavioral characteristics
- Example: "Core user profile of online courses: 25-35 years old, first-tier cities, middle-to-high income, workplace anxiety"

#### Information source classification

| Source type | Applicable scenarios | Search strategy |
|---------|---------|---------|
|**Industry Report**| Market Size/Trend/Structure | "[Industry] Market Report 2024" |
|**Corporate Annual Report/Financial Report**| Corporate Revenue/Number of Users/Growth Rate | "[Company Name] Financial Report 2024" |
|**News Media**| Latest News/Case Stories | "[Event] News Recent" |
|**Professional Data Platform**| Detailed data/user portraits | "iResearch [Topic]" |
|**Academic Paper**| Theoretical Framework/In-depth Analysis | "[Topic] Research Paper" |
|**Official product website**| Product features/pricing strategy | Directly visit the official website |

#### Output format

```markdown
## Argument plan

### H1: [Hypothesis 1]

#### Argument Page 1: [Page Title]
- **Argument method**: [Model simulation/scale analysis/framework analysis/etc.]
- **Information source**:
  - Main: [Source type 1] - [Specific search keywords]
  - Secondary: [Source type 2] - [Specific search keywords]
- **Key Data Points**:
  1. [Data point 1 description]
  2. [Data point 2 description]

#### Argument Page 2: [Page Title]
...
```

### STEP 5: Design Dummy Pages structure

#### Goal
Design a McKinsey-style page layout and diagram structure for each argument page.

#### McKinsey Common Page Layout Types

Based on mckinsey-ppt-v4, we have the following common layouts:

**1. Title + Single Chart**
```
Layout structure:
- Top: Argument-driven title
- Middle: main chart (occupies 60-70% space)
- Bottom: Data Sources + Key Insights Box

Applicable to: single data story, trend display
Chart type: Line chart/Bar chart/Area chart
```

**2. Title + Left and Right Column Type (Title + Two-Column)**
```
Layout structure:
- Top: Argument-style title
- Left: Chart or bullet point list
- Right side: explanatory text or second diagram

Applicable to: comparative analysis, one picture and one text
```

**3. Title + 2×2 Matrix (Title + 2×2 Matrix)**
```
Layout structure:
- Top: Argument-style title
- Middle: 2×2 matrix diagram (such as Boston matrix/positioning matrix)
- Each quadrant: short descriptive text

Applicable to: strategic positioning, classification framework
```

**4. Title + Table**
```
Layout structure:
- Top: Argument-style title
- Middle part: multi-dimensional comparison table
- Header: dark blue background + white text

Applicable: multi-dimensional comparison, scale analysis
```

**5. Title + Waterfall Chart**
```
Layout structure:
- Top: Argument-style title
- Middle part: Waterfall chart (growth breakdown/change attribution)

Applicable to: Decomposition of growth drivers
```

**6. Title + Timeline type (Title + Timeline)**
```
Layout structure:
- Top: Argument-style title
- Upper part: Horizontal timeline
- Lower part: Bar chart/area chart for each time period

Applicable: historical evolution, stage division
```

**7. Insight Summary**
```
Layout structure:
- Top: Summary title
- Middle part: 3-5 numbered insight boxes
- Each box: dark blue background + white title + light content area

Applicable to: Chapter summaries, key findings
```

#### Dummy Page design output format

```markdown
## Dummy Pages Design

### Page X: [McKinsey-style argument title]

**Corresponding hypothesis**: H1.1

**Page layout**: title + single chart shape

**Chart Type**: Stacked Column Chart

**Data Requirements**:
- X-axis: 2019, 2020, 2021, 2022, 2023, 2024
- Y-axis: Market revenue (100 million yuan)
- Series: Audiobooks, Online Courses, Podcasts, Others

**McKinsey Design Key Points**:
- Title: Argument type, such as "Audiobooks and online courses drive China market growth, podcasts have limited contribution"
- Color matching: PRIMARY_BLUE main color, each series uses blue gradient
- Note: Audiobooks and online courses will account for 85% in 2024
- Insight box: The light blue box in the lower right corner emphasizes that "podcasts account for only 5%, far lower than the 30-40% in the West"

**Information source**:
- web_search: "China Audio Market Revenue Segmentation 2024"
- web_search: "Himalaya gains market share"
```

#### Actual case (simplified)

```markdown
## Dummy Pages Design

### Page 3: Audiobooks and online courses drive China market growth, traditional podcasts account for only 5%

**Corresponding hypothesis**: H1

**Page layout**: title + single chart type (timeline + stacked column chart)

**Chart Type**:
- Upper part: Horizontal timeline (2019-2024)
- Lower part: stacked column chart

**Data Requirements**:
- Market segment revenue in each year from 2019 to 2024
  - Audiobook revenue (RMB 100 million)
  - Online course revenue (100 million yuan)
  - Podcast revenue (100 million yuan)
  - Other income (100 million yuan)

**McKinsey Design Key Points**:
- Title font size: 18pt bold, PRIMARY_BLUE
- Timeline: dark blue line, key years marked
- Bar chart: from top to bottom for audiobooks/online courses/podcasts/others
- Color: PRIMARY_BLUE (audiobook), SECONDARY_BLUE (online course), LIGHT_BLUE (podcast), GRAY (other)
- Marked: 3.7 billion audiobooks, 2.8 billion online courses, and 300 million podcasts in 2024
- Insight box: lower right corner "Podcasts account for only 5% in China, far lower than the 30-40% share in Western markets"

**Information source**:
1. web_search: "China audio market size segmentation 2024"
2. web_search: "Himalaya gets revenue 2024"
3. web_search: "China’s podcast market size"

---

### Page 5: "Performance Audiobook" drives content explosion through the demonstration effect of leading broadcasters

**Corresponding hypothesis**: H1.1

**Page layout**: title + left and right columns

**Left**:
- Chart type: Line chart (double Y-axis)
- Data requirements:
  - Growth in the number of audiobook content from 2019 to 2024
  - Average annual income of top podcasters from 2019 to 2024

**Right**:
- Case box: Case of leading broadcaster "Zijing"
  - Start: Started telling ghost stories in 2017
  - Outbreak: Monthly income exceeded 500,000 in 2020
  - Demonstration: Drive 1000+ new broadcasters to enter the market
- Data source box

**McKinsey Design Key Points**:
- Line chart on the left: double Y-axis, columnar for content quantity, and polyline for revenue
- Case box on the right: light blue background, dark blue title
- Key insight: "Head revenue increased by 5 times → content supply increased by 10 times"

**Information source**:
1. web_search: "Number of Himalaya audiobook podcasters"
2. web_search: "Redbud Audiobook Revenue"
3. web_search: "Audiobook creator monetization"

---

### Page 8: The single user value of online courses is three times that of audiobooks, becoming the main driver of revenue growth

**Corresponding hypothesis**: H1.2

**Page layout**: title + table type

**Table structure**:
| Contrasting Dimensions | Audiobooks | Online Courses | Podcasts |
|---------|--------|---------|------|
| Number of users (millions) | 180 | 45 | 30 |
| Payment rate | 8% | 35% | 2% |
| Price per customer (yuan/year) | 120 | 680 | 50 |
| **Single user value** | **9.6 yuan** | **238 yuan** | **1 yuan** |
| Market size (billion yuan) | 17.3 | 10.7 | 0.3 |

**McKinsey Design Key Points**:
- Header: PRIMARY_BLUE background + WHITE text
- "Single user value" row: bold + light blue background for emphasis
- Insight box at the bottom: "Although the number of users of online courses is only 1/4 of audiobooks, they contribute 38% of the market revenue"

**Information source**:
1. web_search: "Get Fan Deng Reading Number of users and payment rate"
2. web_search: "Himalaya membership pricing"
3. web_search: "Online course price per customer China"
```

## 📋 PHASE 3: Data Collection & PPT Generation

### STEP 6: Use web_search to collect data

#### Search strategy

**1. Hierarchical search**
```python
# First level: Get framework and overview
web_search("China audio market classification framework")
web_search("Audiobook Online Course Podcast Definition")

# Second layer: Get core data
web_search("China audio market size 2024")
web_search("Number of Himalaya Users Revenue 2024")

# Third level: Get details and cases
web_search("Redbud audiobook podcaster income")
web_search("Get Fan Deng Reading course pricing")
```

**2. Multi-source verification**
- At least 2-3 sources verify key data
- Priority: Corporate financial reports > Authoritative research institutions > Industry media

**3. Data cleaning**
- Unified units and calibers
- Mark the year and source of the data
- Handle missing data (impute and account for)

#### Search execution suggestions

Data collection for each Dummy Page:
- Execute web_search 2-5 times
- If the initial search results are not satisfactory, adjust the keywords and search again
- Organize the searched data into a structured format

### STEP 7: Generate McKinsey style PPT

#### Call mckinsey-ppt-v4 skill

Based on the data designed and collected by Dummy Pages, the mckinsey-ppt-v4 skill is called to generate PPT.

#### PPT structure

```
Page 1: Cover
- Title: [Research Topic]
- Subtitle: [Research Scope and Time]

Page 2: Table of Contents/Contents Overview
- Chapter structure based on Hypothesis Tree

Page 3-N: Text page
- Each page corresponds to a Dummy Page design
- Strictly follow McKinsey design specifications

Last page: Conclusions and recommendations
- 3-5 core insights
- Recommendations for action (if needed)
```

#### McKinsey core design specifications (incorporated from mckinsey-ppt-v4)

**Color scheme**:
```python
PRIMARY_BLUE = RGBColor(0, 41, 96) # Dark blue - main title/header
SECONDARY_BLUE = RGBColor(0, 101, 189) # Medium blue - main color of the chart
LIGHT_BLUE = RGBColor(201, 240, 255) # Light blue - Insight box background
IKEA_YELLOW = RGBColor(255, 219, 0) # Yellow - emphasis/warning
WHITE = RGBColor(255, 255, 255) # white
GRAY = RGBColor(128, 128, 128) # Gray - secondary information
```

**Typesetting specifications**:
```python
# Page size
SLIDE_WIDTH = 10.0 # inches
SLIDE_HEIGHT = 5.625 # inches (16:9)

# Content area
CONTENT_LEFT = 0.8 #Left margin
CONTENT_WIDTH = 8.4 # Content area width
CONTENT_TOP = 1.0 # Top margin (below the title)

# Font specification
TITLE_FONT_SIZE = 18 # Title
BODY_FONT_SIZE = 11 # Text
CAPTION_FONT_SIZE = 9 # Comment/Source
```

**Mandatory Rules**:
1. ⭐ **Dark blue background must be paired with white text** - For any PRIMARY_BLUE or SECONDARY_BLUE background, the text must be WHITE
2. ⭐ **Use right-angled rectangles for large text boxes** - Content boxes with width >3 inches must use MSO_SHAPE.RECTANGLE (not ROUNDED_RECTANGLE)
3. ⭐ **Borderless by default** - All text boxes are borderless by default (shape.line.fill.background())
4. **Argument-style title** - The title of each page must be a complete argument, not a topic
5. **High Information Density** - Make full use of space, but avoid crowding (text density <60 characters/square inch)

### STEP 8: Iteratively optimize to the ultimate version

#### Optimization process (refer to mckinsey-ppt-v4 iteration methodology)

**Round 1: First version generation**
- Quickly generate a complete PPT
- Accept that the layout is not perfect
- Focus on content integrity and logical coherence

**Round 2: Problem identification**
- Users review page by page and mark issues with screenshots
- Claude logs all issues:
  - Element occlusion/overlapping
  - Text overflow
  - Insufficient color contrast (dark blue text on dark blue background)
  - Chart labels are not fully displayed
  - Content density is too high

**Round 3: Targeted repair**
- Apply accurate fixes based on user feedback
- Batch process similar problems
- Verify the repair effect

**Round 4: Content splitting (if needed)**
- Identify high-density pages
- Split into 2-3 pages
- Maintain logical coherence

**Round 5: Detail polishing**
- Fine-tune spacing and alignment
- Unify font size and color
- Improve footer information
- Run final quality check

#### Quality Checklist

Must check after generation:
```
□ All dark blue background text has been set to white
□ Whether the header text of the table is white
□ Whether rounded rectangles are misused for large text boxes
□ Whether the element is blocked/overlapping
□ Whether the text overflows
□ Whether the chart labels are displayed completely
□ Are the timeline/chart widths consistent?
□ Have unnecessary borders been removed?
□ Is the text density on a single page reasonable?
```

## 🚀 Complete workflow example

### User input

```
"Our company is considering entering the Chinese electric vehicle charging pile market. Please help me analyze:
1. How is this market growing?
2. Who are the main players and how do they do it?
3. What are our chances?"
```

### Claude execution process

#### Phase 1: Hypotheses Tree

**STEP 1: Define problem boundaries**
```markdown
## Problem definition

### Yes ✅
- Analyze the growth and driving factors of China's electric vehicle charging pile market
- Identify key players and success models
- Suggest entry opportunities based on market analysis

### No ❌
- The decision of whether to enter this market (company senior decision-making)
- Detailed implementation plan (requires follow-up special research)
- Comparison of the global charging pile market (focusing on the Chinese market)
```

**STEP 2: Create Issue Tree**
```markdown
## Issue Tree

### Lv1: 1. How is the growth of China’s charging pile market?

#### Lv2: 1.1 Market Size and Growth
- Lv3: 1.1.1 Charging pile ownership and growth trend
- Lv3: 1.1.2 Market revenue scale and growth trend
- Lv3: 1.1.3 Relationship with electric vehicle sales

#### Lv2: 1.2 Market segment structure
- Lv3: 1.2.1 Public piles vs private piles
- Lv3: 1.2.2 DC fast charging vs. AC slow charging
- Lv3: 1.2.3 Different scenarios (highway/shopping mall/community)

### Lv1: 2. Main players and success models

#### Lv2: 2.1 Main players pattern
- Lv3: 2.1.1 Top 5 players and market share
- Lv3: 2.1.2 State-owned enterprises vs private enterprises vs new forces

#### Lv2: 2.2 Success Model Analysis
- Lv3: 2.2.1 Business model (charging service fee/advertising/data)
- Lv3: 2.2.2 Layout strategy (key scenes/areas)
- Lv3: 2.2.3 Technical differentiation (power/user experience)

### Lv1: 3. Where is the opportunity to enter?

#### Lv2: 3.1 Market blank
- Lv3: 3.1.1 Insufficient coverage in underdeveloped areas
- Lv3: 3.1.2 Specific scenes (such as scenic spots/county areas)

#### Lv2: 3.2 Experience pain points
- Lv3: 3.2.1 Difficult to find charging piles / long queues
- Lv3: 3.2.2 Complex payment/poor compatibility
```

**STEP 3: Form Hypothesis Tree**
```markdown
## Hypothesis Tree

**H1: The market is in a period of rapid growth, and public fast charging is the core growth point**
- H1.1: The average annual growth rate of the number of charging piles from 2020 to 2024 is >50%
- H1.2: Public DC fast charging piles are growing faster than private AC piles
- H1.3: Expressways and urban business districts are the main battlefields

**H2: The market is dominated by leading players, but the pattern has not been solidified**
- H2.1: TELD/Star Charge/Cloud Fast Charging account for 50%+ share
- H2.2: State-owned enterprises and central enterprises expand rapidly by leveraging their resource advantages
- H2.3: It is difficult to make a profit simply by selling charging service fees, and ecological monetization is needed

**H3: Opportunities lie in differentiated positioning and breakthroughs in segmented scenarios**
- H3.1: Top players focus on the first and second lines, while the third and fourth lines have insufficient coverage.
- H3.2: Obvious pain points in user experience (finding stakes/paying/waiting)
- H3.3: Consider the "scenario expert" model (such as focusing on scenic spots/county areas/logistics parks)

### Key data points that need to be verified
1. Charging pile ownership and growth rate from 2020 to 2024
2. Public vs. private, fast charging vs. slow charging structures and trends
3. Top 5 company names, shares, and layout strategies
4. Charging service fee level and profitability
5. User survey data (pain points/satisfaction)
```

#### Phase 2: Dummy Pages

**STEP 4 & 5: Design Dummy Pages** (show 3 key pages)

```markdown
## Dummy Pages Design

### Page 3: China’s charging pile market is growing rapidly, and public fast charging is the core driving force

**Corresponding hypotheses**: H1, H1.1, H1.2

**Page layout**: title + single chart type (timeline + stacked column chart)

**Chart Design**:
- Upper part: 2020-2024 timeline
- Lower part: stacked column chart
  - X-axis: year
  - Y-axis: Number of charging piles (10,000 units)
  - Series 1: Public DC fast charging (dark blue)
  - Series 2: Public AC slow charging (medium blue)
  - Series 3: Private pile (light blue)

**Data Requirements**:
- Number of charging piles of various types from 2020 to 2024
- Year-on-year growth rate in 2024

**McKinsey Design Key Points**:
- Note: Public fast charging will reach XXX million units in 2024, YoY +78%
- Insight box: "Public fast charging has grown fivefold in four years and has become the mainstay of charging infrastructure."

**Information source**:
- web_search: "Charging pile ownership statistics in China 2024"
- web_search: "Public charging pile fast charging slow charging quantity"
- web_search: "Charging Pile Industry Report 2024"

---

### Page 6: TELD/Star Charge/Cloud Fast Charging account for half of the market, while state-owned and central enterprises are catching up quickly

**Corresponding hypotheses**: H2.1, H2.2

**Page layout**: title + table type

**Table Design**:
| Ranking | Enterprise | Type | Number of public piles (10,000) | Market share | Main layout |
|-----|------|------|------------|---------|---------|
| 1 | TELD | Private enterprise | 45 | 22% | Expressway + business district |
| 2 | Star Charging | Private Enterprises | 38 | 19% | Community + Business District |
| 3 | Cloud fast charging | Private enterprises | 25 | 12% | High speed |
| 4 | State Grid | State-owned enterprises | 22 | 11% | High-speed + service area |
| 5 | China Southern Power Grid | State-owned enterprises | 15 | 7% | Urban public |

**McKinsey Design Key Points**:
- Header: PRIMARY_BLUE background + WHITE text
- "Type" column: SECONDARY_BLUE for private enterprises, GRAY for state-owned enterprises
- Bottom Insight: "Top5 account for 71% of the share, but the gap between Top2-5 is not big, and the pattern has not been solidified."

**Data Requirements**:
- Number and share of public charging piles for each enterprise
- Nature of the enterprise and main layout scenarios

**Information source**:
- web_search: "Charging pile company ranking 2024"
- web_search: "Special Call Star Charging Market Share"
- web_search: "State Grid charging pile layout"

---

### Page 9: Opportunity: Use "Scene Expert" mode to cut into third- and fourth-line or vertical scenes

**Corresponding hypothesis**: H3, H3.3

**Page Layout**: Title + 2×2 Matrix

**Matrix Design**:
- X-axis: Market competition intensity (low → high)
- Y-axis: Profit potential (low → high)
- Four quadrants place different scenes:
  - High potential + low competition: **Logistics Park/Freight**⭐,**Tourist Attractions**⭐
  - High potential + high competition: high-speed service area, urban core business district
  - Low potential + low competition: rural counties
  - Low potential + high competition: community private piles

**McKinsey Design Key Points**:
- The upper right quadrant is marked with "Recommended entry" with IKEA_YELLOW background
- Each bubble is labeled with the scene name + a short description
- Action suggestion box at the bottom: "It is recommended to focus on the 'logistics park + scenic spot' combination and become a vertical scene expert"

**Data Requirements**:
- Competitive landscape in each scenario
- Charging frequency and service fee potential in each scenario
- User pain point data

**Information source**:
- web_search: "Logistics Park Freight Charging Pile Demand"
- web_search: "Scenic area charging pile coverage rate"
- web_search: "Research on charging pile users' pain points"
```

#### Phase 3: Data Collection & PPT Generation

**STEP 6: Execute `web_search` to collect data**

Perform 2-5 searches for each Dummy Page, for example:

```python
# Collect data for page 3
web_search("Charging pile ownership statistics in China 2020-2024")
web_search("Public charging pile fast charging slow charging ratio 2024")
web_search("China Charging Pile Industry Research Report 2024")

# Collect data for page 6
web_search("Special Call Star Charging Market Share 2024")
web_search("Charging pile operators ranking Top10")
web_search("State Grid charging pile layout quantity")

# Collect data for page 9
web_search("Logistics Park Charging Pile Demand and Market Space")
web_search("Charging pile coverage in tourist attractions 2024")
web_search("Research Report on Pain Points of Charging Pile Users")
```

**STEP 7: Generate PPT**

Call the mckinsey-ppt-v4 skill, based on:
- Dummy Pages design
- Collected search data
- McKinsey design code

Generate a complete McKinsey-style PPT of 15-20 pages.

**STEP 8: Iterative optimization**

Users review the first version and report issues:
- "The second row of the 2024 label in the bar chart on page 3 is not displayed"
- "The header text of the table on page 6 cannot be seen, it is all dark blue"
- "The bubble in the upper right corner of page 9 overlaps with the title"

Claude's targeted fixes:
- Increased label container height to 0.35 inches
- The header text is forced to be changed to WHITE
- Relayout page 9, delete all shapes and rebuild

The final version quality is reached after 2-3 rounds of iterations.

## 📋 User Guide

### Start conversation

Users can start in the following ways:

**Method 1: Directly describe the business problem**
```
"We are considering whether to enter the XX market/launch XX products. Help me analyze the market situation and opportunities."
```

**Method 2: Provide preliminary thoughts**
```
"I want to study the reasons for the growth of XX industry. I initially think it may be because of A, B, and C. Please help me establish an analysis framework."
```

**Method 3: Upload existing materials**
```
"Here are some industry reports we collected [uploaded] to help me extract key insights and create a McKinsey-style PPT."
```

### Claude response process

1. **Clarify questions** (Phase 1 - STEP 1)
   - Confirm what is and is not in scope
   - Align research objectives and scope

2. **Create Issue Tree** (Phase 1 - STEP 2)
   - Automatically generate 2-3 layers of MECE disassembly
   - Show to the user for confirmation

3. **Quickly form hypotheses** (Phase 1 - STEP 3)
   - Reason based on common sense
   - Perform quick `web_search` 5-10 times to get framework information
   - Form a Hypothesis Tree to show users

4. **Design Dummy Pages** (Phase 2 - STEP 4-5)
   - Design justification pages for each key hypothesis
   - Make a list of data requirements
   - Users can review and adjust

5. **Collect data and generate PPT**(Phase 3 - STEP 6-7)
   - Execute web_search 15-30 times to collect data
   - Call mckinsey-ppt-v4 to generate the first version of PPT
   - Provide download link

6. **Iterative Optimization**(Phase 3 - STEP 8)
   - User feedback issues
   - Claude's targeted fixes
   - 2-3 rounds of iteration to perfection

### User control points

Users can pause and adjust the following nodes:

1. **After problem definition** - Adjust the research scope
2. **After Issue Tree** - Add, delete, or modify problem nodes
3. **After Hypotheses** - Modify assumptions or priorities
4. **After Dummy Pages design** - Adjust page layout or data needs
5. **After the first PPT version** - Provide issue feedback for iteration

## 🎯 Quality Assurance

### Content quality

- ✅ Assumptions are supported by logic, not patting oneself on the head
- ✅ Data comes from multiple reliable sources
- ✅ Issue Tree complies with MECE principles
- ✅ Storyline is coherent and has sufficient arguments

### PPT quality

- ✅ Strictly follow McKinsey design specifications
- ✅ Dark blue background must be paired with white text
- ✅ Use right-angled rectangles for large text boxes
- ✅ No unnecessary borders
- ✅ Argument-style title
- ✅ High information density but not crowded

## 📚 References

This skill is based on the following methodologies and tools:

1. **McKinsey Problem Solving 101/102** - Problem Solving methodology
2. **MECE Principle** - Framework thinking without overlap or omissions
3. **Pyramid Principle** - Structured expression and argument
4. **mckinsey-ppt-v4** - McKinsey-style PPT generation specification
5. **python-pptx** - Programmatic PPT generation

## Version information

**mck-consult skill V1.0**
- Release date: 2025-01
- Author: Based on McKinsey methodology and practical experience
- License: MIT License

---

**Ready to get started? Describe your business problem and I will guide you through the full McKinsey-style analysis process!** 🚀