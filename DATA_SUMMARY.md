# Synthetic Patient Dataset Summary

## Overview
A comprehensive synthetic patient dataset has been generated to power the Precision Clinical OS MVP patient dashboard. The dataset includes all four critical data streams required for clinical data synthesis.

## Data Generated

### Lab Results (100+ entries)
- **Conventional Labs** (Quest & LabCorp):
  - Lipid panel (Cholesterol, LDL, HDL, Triglycerides)
  - Metabolic markers (HbA1c, Fasting Glucose)
  - Thyroid function (TSH, Free T3, Free T4)
  - Vitamins (D, B12, Ferritin)
  - Liver/kidney function (ALT, AST, Creatinine)
  - Data points across 9 time periods over 6 months
  - Includes both reference ranges and optimal ranges
  - **Several out-of-range values flagged** for testing filters

- **Specialty Labs**:
  - DUTCH: Cortisol AM/PM
  - Genova: Omega-3 Index
  - GI-Map: H. Pylori

### Wearable Data (120+ entries)
- **Oura Ring**: Daily sleep, HRV, and steps for past 30 days
- **CGM**: 3 glucose readings per day (90+ data points)
- **Manual Vitals**: Blood pressure and weight measurements (every 3 days)

### EHR Events (7 entries)
- Medication changes (Metformin titration, Vitamin D addition)
- Clinical notes and consultations
- Procedures (DEXA scan)
- Upcoming appointments
- Timeline spans 6 months

### Genetic Markers (3 entries)
- **APOE ε3/ε4**: High significance, cardiovascular implications
- **MTHFR C677T**: Medium significance, folate metabolism
- **CYP2D6**: High significance, pharmacogenomics
- Each includes clinical implications and relationships to labs/medications

## Key Features

1. **Unified Timeline**: All data points are chronologically ordered and can be displayed on a single axis
2. **Out-of-Range Flagging**: Labs automatically flagged when outside reference or optimal ranges
3. **Realistic Patterns**: Data includes trends (weight loss, medication effects) and realistic variations
4. **Time Distribution**: Data spans 6 months with varying frequency (daily wearables, periodic labs)

## API Access

The data is available via:
- **API Route**: `GET /api/patient`
- **Direct Import**: `import { generateSyntheticPatient, generateTimeline } from '@/lib/data/syntheticData'`

## Filtering Utilities

- `filterOutOfRange()`: Shows only out-of-range/out-of-optimal lab values (Signal Through the Noise)
- `filterByType()`: Filter by data type (lab, wearable, ehr)
- `filterByDateRange()`: Filter by time period

## Next Steps

This dataset is ready to power:
1. Unified timeline visualization
2. Out-of-range filtering feature
3. Genetic markers sidebar
4. Role-based access views

