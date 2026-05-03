# Frequently Asked Questions Solved

Common problems and solutions based on mckinsey-ppt-v4 practical experience summary.

## Problem 1: Dark blue text on dark blue background cannot be seen

**Performance**: Header/insight box/serial number label text is not visible

**Cause**: White text is not forced

**Solution**:
```python
# Perform mandatory checks after generation
for shape in slide.shapes:
    if shape.fill.type == 1:
        bg = shape.fill.fore_color.rgb
        if bg == PRIMARY_BLUE or bg == SECONDARY_BLUE:
            for para in shape.text_frame.paragraphs:
                for run in para.runs:
                    run.font.color.rgb = WHITE
```

## Problem 2: Element occlusion/overlapping

**Performance**: The title box overlaps the content box, and the chart is obscured by text

**Cause**: Not enough spacing reserved

**Solution**: Delete all elements and rebuild the layout from scratch
1. Delete all shapes on the page
2. Planning layout (up → down, left → right)
3. Leave some space (at least 0.2 inches)
4. Verify no occlusion

## Problem 3: Text overflow

**Performance**: The text box content is not fully displayed

**Cause**: The text box is too small or the font size is too large

**Solution**:
```python
# Strategy 1: Reduce font size (9pt→8pt)
# Strategy 2: Expand the container (height * 1.3)
# Strategy 3: Concise text
# Strategy 4: Split into 2 pages
```

## Problem 4: The second line of the histogram label is not displayed

**Performance**: The horizontal axis label only displays the first row

**Cause**: The height of the label container is insufficient

**Solution**:
```python
labelBox = createTextBox({
    height: 0.35 # increased to 0.35 inches (original 0.25)
})
# First line: Main label (10pt bold)
# Second line: sub-label (7pt gray)
```

## Problem 5: Time axis and chart width are inconsistent

**Performance**: Looks out of place

**Reason**: The width of each element is set independently

**Solution**:
```python
const CONTENT_WIDTH = 8.4 # Uniform width
timeline.width = CONTENT_WIDTH
chart.width = CONTENT_WIDTH
```

## Problem 6: Content density is too high

**Performance**: 10+ bullet points are squeezed into a single page, crowded

**Reason**: Cognitive load is not considered

**Solution**: Split into 2-3 pages
- Principle: Display complex content in pages
- Benefits: Each page is more focused and reading is more comfortable

## Problem 7: Using rounded rectangle

**Performance**: Large text boxes use rounded corners, which is not professional enough

**Reason**: Not following McKinsey style

**Solution**:
- Large text boxes (>3 inches): MSO_SHAPE.RECTANGLE
- Small labels (<1.5 inches): ROUNDED_RECTANGLE available

## Iterative optimization process

**Round 1**: Generate the first version (seeking speed)
**Round 2**: User annotation questions
**Round 3**: Claude targeted repairs
**Round 4**: Content split (if necessary)
**Round 5**: Polishing details

**Total time spent**: 2-4 rounds, 20-40 minutes