# Excel data file specifications

mck-consult must also deliver Excel data files, recording all quantitative data and sources.

## File naming

```
[Project Name]-Data Summary-YYYYMMDD.xlsx

For example:
China Audio Market Analysis-Data Summary-20251025.xlsx
Charging pile market research-data summary-20251025.xlsx
```

## File structure

### Sheet1: Table of Contents

| PPT page number | Page title | Data type | Sheet name |
|---------|---------|---------|----------|
| Page 3 | Historical trends in market size | Time series | Sheet2 |
| Page 5 | Market segment share | Structural data | Sheet3 |
| Page 7 | User Growth Data | Growth Analysis | Sheet4 |

### Sheet2~N: Data page (according to PPT page number)

**Naming Format**: `Page X [Page Topic]`

For example: `Page 3 Market Size`

**Each Sheet contains**:

#### Area 1: Data table

```
┌──────┬────────┬────────┬──────────────────┐
│ Year │ Indicator 1 │ Indicator 2 │ Data source │
├──────┼─────────┼────────┼────────────────────┤
│ 2019 │ 45.2 │ 23.1 │ [1] iResearch │
│ 2020 │ 82.1 │ 34.5 │ [1] iResearch │
│ 2021 │ 134.5 │ 56.7 │ [2] 36Kr │
│ 2022 │ 189.3 │ 78.2 │ [2] 36Kr │
│ 2023 │ 256.7 │ 112.3 │ [3] Estimate │
└──────┴────────┴────────┴──────────────────┘
```

#### Area 2: Data source details

```
Data source list:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1] iResearch - China Online Audio Market Report 2024
    URL: https://report.iresearch.cn/xxx
    Collection date: 2025-10-25
    Data year: 2019-2022
    Data Quality: High (Official Industry Report)
    
[2] 36Kr - Audiobook market analysis in 2024
    URL: https://36kr.com/xxx
    Collection date: 2025-10-25
    Data year: 2021-2022
    Data quality: Medium (media reports, citing other reports)
    
[3] Estimated based on historical growth rate
    Calculation method: 2023 = 2022 * (1 + CAGR_2019-2022)
    CAGR_2019-2022 = 35.6%
    Data Quality: Low (estimate)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Area 3: Data Description

```
Data description:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unit: 100 million yuan
Caliber: Total revenue of the online audio market (including advertising + membership + tips)
Adjustments:
  - 2021 data adjusted for inflation to 2023 prices
  - Excludes hardware sales revenue
Verify:
  - Cross-validation of 2022 data between iResearch and 36Kr, error <5%
  - Basically consistent with corporate financial reports (Ximalaya/Dragonfly FM)
Confidence: High (2019-2022) / Medium (2023 estimate)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Data quality annotation

### Quality Level

| Level | Definition | Example |
|------|------|------|
| High | Official report/corporate financial report | iResearch, company annual report |
| Medium | Cited by media reports | 36Kr, Huxiu |
| Low | Estimate/Extrapolation | Estimate based on CAGR |

### Data type annotation

| Type | Description | Annotation |
|------|------|------|
| Direct quotation | Original data has not been adjusted | [Direct] |
| Obtained by calculation | Calculated based on original data | [Calculate] |
| Estimate | Extrapolation based on assumptions | [Estimation] |
| Multi-source average | Multiple sources average | [Average] |

## Complete example

### Sheet: Page 3 Audiobook market size

#### Data table

| Year | Market size (100 million yuan) | Year-on-year growth rate | Data source | Quality | Type |
|------|----------------|-----------|----------|------|------|
| 2019 | 45.2 | - | [1] | High | Direct |
| 2020 | 82.1 | 81.6% | [1] | High | Direct |
| 2021 | 134.5 | 63.8% | [2] | Medium | Direct |
| 2022 | 189.3 | 40.7% | [2] | Medium | Direct |
| 2023 | 256.7 | 35.6% | [3] | Low | Estimate |
| 2024E | 347.8 | 35.5% | [3] | Low | Estimate |

#### Data source

```
[1] iResearch - 2021 China Online Audio Market Research Report
    https://report.iresearch.cn/report/202104/3756.shtml
    Collection: 2025-10-25
    Coverage: 2019-2020
    Quality: High (official industry reports, authoritative data)

[2] 36Kr - China Audiobook Market Analysis 2023
    https://36kr.com/p/2145678912
    Collection: 2025-10-25
    Coverage: 2021-2022
    Quality: Medium (media reports, citing iiMedia Consulting data)
    
[3] Based on 2019-2022 CAGR estimate
    Method: 2023 = 2022 × (1 + 0.356)
          2024 = 2023 × (1 + 0.355)
    CAGR calculation: ((189.3/45.2)^(1/3) - 1) = 61.5%
              Conservative estimate: 35.6% (considering market maturity)
    Quality: Low (estimate, actual deviation may be ±15%)
```

#### Data Description

```
Unit: 100 million yuan
Caliber: Total revenue of China’s online audiobook market
      Includes: membership subscription + single copy purchase + advertising revenue
      Excluded: Audiobook hardware device sales

Data processing:
- All data are unified to current year prices (not adjusted for inflation)
- There is a 5.2% difference between iiMedia data in 2021 and iResearch’s 2020 base number.
  Adjusted according to iResearch caliber

Cross validation:
- Himalaya’s 2022 financial report shows revenue of 6.78 billion
- Dragonfly FM’s revenue in 2022 will be approximately 2.35 billion
- The two companies totaled 9.13 billion, accounting for 48.2% of the market of 18.93 billion.
- Verification passed, data is reasonable

Confidence:
2019-2020: 95% (official report)
2021-2022: 80% (media reports, cross-verified)
2023-2024: 60% (estimate, may vary by ±15%)
```

## Special data processing

### Missing data

```
Processing method:
1. Linear interpolation (short-term missing, 1-2 years)
2. CAGR estimation (long-term missing, more than 3 years)
3. Mark "missing data" (cannot be estimated)

Example:
Missing data for 2020
→ 2020 = (2019 + 2021) / 2 [interpolation]
```

### Inconsistent caliber

```
Processing method:
1. Unify the caliber of the most authoritative source
2. Clearly mark the adjustment method
3. Keep original data as notes

Example:
Source A: Includes hardware sales
Source B: Content revenue only
→ Unified to B caliber, A data minus the hardware part
```

### Multi-source data conflicts

```
Processing method:
1. Prefer official/authoritative sources
2. Take a weighted average of multiple sources (according to credibility)
3. Mark the data range

Example:
Source A: 18.93 billion (weight 60%)
Source B: 20.35 billion (weight 40%)
→ Use A (more authoritative)
→ Marking range: 18.9-20.4 billion
```

## Update and maintenance

### Version Control

```
File name contains date:
China Audio Market-Data Summary-20251025.xlsx #First Edition
China Audio Market-Data Summary-20251126.xlsx # Updated version

Sheet1 adds update record:
┌────────────┬─────────┬─────────────┐
│ Update date │ Update content │ Updater │
├────────────┼──────────┼─────────────┤
│ 2025-10-25 │ Initial version │ Claude │
│ 2025-11-26 │ Update 2024│ Claude │
│ │ Actual data │ │
└────────────┴─────────┴─────────────┘
```

### Data update

When there is new data:
1. Update data in the corresponding Sheet
2. Add new data sources
3. Update data description
4. Mark the update date
5. Save as new version

## Quality Assurance

### Pre-delivery checklist

```
□ Each quantitative data has a source URL
□ The source URL is accessible (not expired)
□ Uniform labeling of data units
□ The estimated data indicates the calculation method
□ Conflict data description processing method
□ Data quality level annotation
□ Confidence assessment
□ Cross-validation records
□ Sheet naming convention
□ Complete catalog
```

## Best Practices

1. **Collect and record at the same time** - STEP 6 Fill in Excel when collecting data
2. **Save the complete URL** - Do not record only the website name; save the complete URL
3. **Leave calculation traces** - Display calculation formulas in Excel
4. **Multi-source cross-validation** - Verify key data with 2-3 sources
5. **Mark confidence** - Let users know the reliability of the data
6. **Easy to Update** - Structured storage to facilitate subsequent data updates