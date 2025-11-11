# Synthetic Patient Data Generator

This module generates realistic synthetic patient data for the Precision Clinical OS MVP.

## Data Categories

### 1. Lab Results
- **Conventional Labs**: Quest and LabCorp results including lipid panel, metabolic markers, thyroid function, vitamins
- **Specialty Labs**: DUTCH (hormones), Genova (nutritional), GI-Map (gut health)
- Includes reference ranges and optimal ranges
- Automatically flags out-of-range and out-of-optimal values

### 2. Wearable Data
- **Oura Ring**: Sleep, HRV, steps
- **CGM**: Continuous glucose monitoring (multiple readings per day)
- **Manual Vitals**: Blood pressure, weight
- Daily data for the past 30 days

### 3. EHR Events
- Medication changes
- Clinical notes
- Procedures
- Appointments
- Historical events over the past 6 months

### 4. Genetic Markers
- APOE status (cardiovascular risk)
- MTHFR variants (folate metabolism)
- CYP2D6 (pharmacogenomics)
- Includes clinical implications and relationships to labs/medications

## Usage

```typescript
import { generateSyntheticPatient, generateTimeline } from '@/lib/data/syntheticData';
import { filterOutOfRange } from '@/lib/utils/filters';

// Generate patient data
const patient = generateSyntheticPatient();

// Generate unified timeline
const timeline = generateTimeline(patient);

// Filter to show only out-of-range values (Signal Through the Noise)
const prioritySignals = filterOutOfRange(timeline);
```

## API Endpoint

The data is available via API route:
- `GET /api/patient` - Returns complete patient data and unified timeline

