# Precision Clinical OS (PCOS)

**The Concierge Intelligence Engine** - A platform built for physician efficiency, practice management, and relationship depth.

## Overview

Precision Clinical OS is the first platform engineered to solve the physician's workflow problem and serve as the foundation for superior Patient Provider Relationship Management (PPRM). We shift the focus from data aggregation to clinical data synthesis, guaranteeing that every doctor can perform a deep, personalized patient review efficiently.

## MVP Features

### ✅ Core Platform Offering: Clinical Data Synthesis

1. **Unified Longitudinal Data Timeline**
   - Overlays all data points from multiple sources on a single chronological axis
   - Labs (Conventional & Specialty), Wearables, EHR Events, Genetic Markers
   - Normalized Y-axis (0-100% of reference range) for easy comparison
   - Jitter applied to data points to prevent overlap

2. **Out-of-Range Filtering**
   - One-click filter to hide all "normal" data points
   - Shows only priority signals ("Signal Through the Noise")

3. **Proactive Health Alert System**
   - Early warning system based on five pillars of health (Nutrition, Exercise, Sleep, Stress Management, Spiritual Health)
   - Detects trends approaching reference range edges (within 15-30% of limits)
   - Displays estimated days until limit breach if trend continues
   - Visual indicators on graph (dashed rings around alerting metrics)
   - Trend lines on graph showing direction of concerning metrics
   - Compact alert display under metric legend

4. **Time Range Filtering**
   - Quick filters: 1M, 3M, 6M, 1Y, All
   - Dynamic average calculations for wearable metrics based on selected range

5. **Metric-Specific Filtering**
   - Filter by specific wearable/vital metrics (Glucose, HRV, Heart Rate, Sleep, Blood Pressure, Weight)
   - Automatic deselection when parent category is deselected

6. **Persistent Genetic Sidebar**
   - Static display of key genetic markers for contextual recall
   - Clinical implications and relationships to labs/medications

7. **Current Medications Display**
   - Shows active prescriptions with dosing information

8. **Role-Based Access**
   - Physician view: Full access to all data
   - Coach view: Limited data review (no EHR/genetic access)

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the patient dashboard.

### API Endpoints

- `GET /api/patient` - Returns complete synthetic patient data and unified timeline

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   └── PatientDashboard.tsx  # Main dashboard UI
│   ├── api/
│   │   └── patient/
│   │       └── route.ts          # Patient data API
│   └── page.tsx                   # Home page
├── lib/
│   ├── data/
│   │   └── syntheticData.ts       # Synthetic data generator (1 year of data)
│   ├── types/
│   │   └── patient.ts              # TypeScript type definitions (including TrendAlert)
│   └── utils/
│       ├── filters.ts               # Timeline filtering utilities
│       ├── format.ts                # Date formatting utilities
│       ├── serialization.ts         # Data serialization for client
│       └── trendDetection.ts       # Proactive alert system with trend analysis
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts (ScatterChart for timeline visualization)
- **Data**: Synthetic patient data generator (1 year of realistic data)
- **Trend Detection**: Linear regression-based proactive alert system

## Success Metric (MVP Pilot)

Concierge physicians in the pilot must confirm that the time required for pre-visit data synthesis is reduced by at least 50%.

## Learn More

See `DATA_SUMMARY.md` for details on the synthetic patient dataset.
