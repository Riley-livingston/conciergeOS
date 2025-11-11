# Precision Clinical OS (PCOS)

**The Concierge Intelligence Engine** - A platform built for physician efficiency, practice management, and relationship depth.

## Overview

Precision Clinical OS is the first platform engineered to solve the physician's workflow problem and serve as the foundation for superior Patient Provider Relationship Management (PPRM). We shift the focus from data aggregation to clinical data synthesis, guaranteeing that every doctor can perform a deep, personalized patient review efficiently.

## MVP Features

### ✅ Core Platform Offering: Clinical Data Synthesis

1. **Unified Longitudinal Data Timeline**
   - Overlays all data points from multiple sources on a single chronological axis
   - Labs (Conventional & Specialty), Wearables, EHR Events, Genetic Markers

2. **Out-of-Range Filtering**
   - One-click filter to hide all "normal" data points
   - Shows only priority signals ("Signal Through the Noise")

3. **Persistent Genetic Sidebar**
   - Static display of key genetic markers for contextual recall
   - Clinical implications and relationships to labs/medications

4. **Role-Based Access**
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
│   │   └── syntheticData.ts       # Synthetic data generator
│   ├── types/
│   │   └── patient.ts             # TypeScript type definitions
│   └── utils/
│       ├── filters.ts              # Timeline filtering utilities
│       ├── format.ts               # Date formatting utilities
│       └── serialization.ts       # Data serialization for client
```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data**: Synthetic patient data generator

## Success Metric (MVP Pilot)

Concierge physicians in the pilot must confirm that the time required for pre-visit data synthesis is reduced by at least 50%.

## Learn More

See `DATA_SUMMARY.md` for details on the synthetic patient dataset.
