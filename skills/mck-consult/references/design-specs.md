# Detailed explanation of McKinsey design specifications

The complete design specification of McKinsey PPT, based on mckinsey-ppt-v4.

## Color scheme

```python
PRIMARY_BLUE = RGBColor(0, 41, 96) # #002960 Dark blue
SECONDARY_BLUE = RGBColor(0, 101, 189) # #0065BD medium blue
LIGHT_BLUE = RGBColor(201, 240, 255) # #C9F0FF light blue
IKEA_YELLOW = RGBColor(255, 219, 0) # #FFDB00 yellow
WHITE = RGBColor(255, 255, 255) # #FFFFFF white
GRAY = RGBColor(128, 128, 128) # #808080 gray
```

**Principles of use**:
- PRIMARY_BLUE: main title, table header, important annotations
- SECONDARY_BLUE: main color of chart, secondary title
- LIGHT_BLUE: Insight box background, auxiliary area
- IKEA_YELLOW: emphasis, warning, recommendation mark
- WHITE: text on a dark blue background
- GRAY: secondary information, notes, sources

## Typesetting specifications

```python
# Page size
SLIDE_WIDTH = 10.0 inches
SLIDE_HEIGHT = 5.625 inches # 16:9

# Content area
CONTENT_LEFT = 0.8 inches # left margin
CONTENT_WIDTH = 8.4 inches # Content area width
CONTENT_TOP = 1.0 inches # Top margin (under title)

# Font specification
TITLE_FONT_SIZE = 18pt # Page title
BODY_FONT_SIZE = 11pt # Text
CAPTION_FONT_SIZE = 9pt # Comments/Source
MIN_FONT_SIZE = 7pt # Minimum font size
```

## Mandatory rules ⚠️

### Rule 1: Dark blue background must be accompanied by white text

**Scenario**:
- Table header
- Insight box title
- Highlight area
- Serial number label

**Code**:
```python
if bgColor == PRIMARY_BLUE or bgColor == SECONDARY_BLUE:
    textColor=WHITE
```

**CHECKPOINT**:
- Whether the header text is white
- Whether the text in the dark blue insight box is white
- Whether the numbers in the serial number circle are white

### Rule 2: Use right-angled rectangles for large text boxes

**Principle**: McKinsey pursues rigorous professionalism, large text boxes must use right angles

**Applicable**:
- Title box (width >3 inches)
- Text content box
- Data analysis box
- Insight summary box

**Code**:
```python
if width > 3.0:
    shape_type = MSO_SHAPE.RECTANGLE # Right angle
else:
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE # Available rounded corners
```

**Exception**: Small labels (<1.5 inches) available with rounded corners

### Rule 3: Borderless by default

**Principle**: Minimalism, borderless is the norm

**Borderless elements**:
- All text boxes
- Data annotation
- Chart labels
- Footer information

**Code**:
```python
shape.line.fill.background() # Remove the border
```

**Elements with borders** (exceptions):
- Table (separated cells)
- Emphasis box (highlights importance)
- Insight box (clear boundaries)

### Rule 4: Argument-style titles

The title of each page must be a **complete argument**, not a topic.

**Error Example**:
- "Market Analysis"
- "Competitive Landscape"
- "User Data"

**Correct example**:
- "Audiobooks and online courses drive market growth, traditional podcasts account for only 5%"
- "TELD/Star Charge account for half of the market, and the market pattern has not solidified"
- "The single user value of online courses is 3 times that of audio books"

### Rule 5: High information density

**Principle**: Make full use of space, but avoid crowding

**Density Threshold**:
```python
density = textLength / (width * height)
safe: <50 characters/square inch
warning: 50-70 characters/square inch
critical: >70 characters/square inch # Requires page splitting
```

**Solution**:
- Reduce font size (minimum 7pt)
- Increase container height
- Simplified text
- Split into 2-3 pages

## Quality Checklist

Must check after generation:
```
□ Dark blue background with white text
□ The header text is white
□ Use right-angled rectangles for large text boxes
□ No element occlusion/overlapping
□ No text overflow
□ Complete display of chart labels
□ The timeline/chart width is consistent
□ No unnecessary borders
□ Single page density <70 characters/square inch
□ The title is an argument rather than a topic
```

---

## Information Density Standard ⭐ Learn mckinsey-ppt-v4

### McKinsey pursues high information density

**Core Concept**: Every square inch has value, make full use of space

**Density Calculation**:
```python
density = textLength / (width * height)

# Density standard
optimal: 50-70 characters/square inch # McKinsey standard
acceptable: 40-50 characters/square inch
warning: <40 characters/square inch # too empty
critical: >80 characters/square inch # Too crowded and needs to be split
```

### Methods to improve information density

#### Method 1: Add data annotation

**Before** (density 35):
```
Bar chart showing market size
No specific number label
```

**After** (density 58):
```
Bar chart + specific values marked at the top of each bar
+ Growth rate annotation
+ Special markers for key years
```

#### Method 2: Add Insight Box

**Principle**: Add a small insight box to the blank area

```python
# Detect empty areas
if (emptySpace > 2 square inches):
    addInsightBox({
        position: 'right',
        width: 2.5,
        height: 1.2,
        content: 'Key insights'
    })
```

#### Method 3: Extend the legend

**Before**:
```
Simple legend: ■ Category A ■ Category B
```

**After**:
```
Detailed legend:
■ Category A (4.52 billion yuan, accounting for 32%)
■ Category B (6.78 billion yuan, accounting for 48%)
+ Trend description
```

#### Method 4: Reduce font size to free up space

```python
if (fontSize == 9pt && density < 45):
    fontSize = 8pt # reduce 1pt
    # The space is increased by 12%, allowing more content to be placed
```

#### Method 5: Expand the chart

**Principle**: Charts are not decoration, they should occupy the main space

```python
# Before: Charts account for 40%
chartHeight = 1.8 inches

# After: Charts account for 60-70%
chartHeight = 2.5 inches
# Can display more data series/dimensions
```

### McKinsey page typical layout

#### High density data page (density 65)

```
┌────────────────────────────────────┐
│ Audiobooks drive growth, online courses cost 3 times more per customer │ ← Argument-style title (18pt)
├─────────────────────────────────────┤
│ ┌─────────────────────┐ │
│ 2019 │ 4.52 billion │ 1.23 billion │ │
│ 2020 │ 8.21 billion │ 2.35 billion │ │ ← Timeline + Data Annotation
│ 2021 │ 13.45 billion │ 4.52 billion │ │
│ 2022 │ 18.93 billion │ 7.89 billion │ │
│ 2023 │ 25.67 billion │ 12.34 billion │ │
│ └──────────────────────┘ │
│ │
│ ┌──────────────┬──────────────┐ │
│ │ Proportion of audiobooks │ Proportion of online courses │ │
│ │ 67.5% │ 32.5% │ │ ← Comparative data
│ └──────────────┴───────────────┘ │
│ │
│ ┌───────────────────────────┐ │
│ │ 💡 Insight │ │
│ │ While audiobooks are big, online courses │ │ ← Insight Box
│ │ Single user value is 3 times that of audio books │ │
│ └────────────────────────────┘ │
│ │
│ Source: iResearch 2024 8pt gray │ ← Source
└─────────────────────────────────────┘

Total characters: ~380
Total area: 6.5 square inches
Density: 58 characters/square inch ✓
```

### Common "empty" problems

#### Problem 1: Chart is too small

**Performance**: The chart only takes up 30% of the page, with large areas of blank space

**Fix**:
```python
# Before
chartHeight = 1.5 inches # too small

# After
chartHeight = 2.5 inches # takes up 60-70% of the space
# Can display more series/annotations
```

#### Problem 2: Missing data annotation

**Performance**: Bar chart/line chart has no specific value

**Fix**:
```python
for dataPoint in chart:
    addLabel({
        text: dataPoint.value,
        fontSize: 8,
        position: 'above'
    })
```

#### Problem 3: Unused white space

**Performance**: Large blank space on the right/bottom

**Fix**:
```python
if (rightEmptySpace > 2.0):
    addInsightBox(rightSide)
if (bottomEmptySpace > 1.5):
    addDataTable(bottom)
```

### Density Checklist

Post-build checks:
```
□ Density per page 40-70 characters/square inch
□ Charts occupy 60-70% of the page space
□ Key data points are labeled
□ Blank area <20%
□ Insight box highlights key points
□ Complete legend information
□ No "sense of emptiness"
```

###Special page density standards

```javascript
const DENSITY_BY_PAGE_TYPE = {
  coverPage: {
    density: 'low (10-20)',
    reason: 'The cover pursues simplicity and grandeur'
  },
  
  contentPage: {
    density: 'high (50-70)',
    reason: 'The text page is dense with information'
  },
  
  summaryPage: {
    density: 'medium (35-50)',
    reason: 'Summary page highlights key points'
  },
  
  actionPage: {
    density: 'medium-high (45-60)',
    reason: 'The action page is clear but complete'
  }
};
```