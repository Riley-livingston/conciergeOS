import { Patient, LabResult, WearableData, EHREvent, GeneticMarker, TimelineEntry } from '../types/patient';

// Helper to generate dates in the past
const daysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const hoursAgo = (hours: number): Date => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
};

// Generate synthetic lab results
function generateLabs(): LabResult[] {
  const labs: LabResult[] = [];
  const now = new Date();

  // Conventional Labs (Quest/LabCorp)
  const conventionalTests = [
    { name: 'Total Cholesterol', unit: 'mg/dL', refMin: 0, refMax: 200, optMin: 150, optMax: 180, source: 'Quest' as const },
    { name: 'LDL Cholesterol', unit: 'mg/dL', refMin: 0, refMax: 100, optMin: 50, optMax: 70, source: 'Quest' as const },
    { name: 'HDL Cholesterol', unit: 'mg/dL', refMin: 40, refMax: 60, optMin: 60, optMax: 100, source: 'LabCorp' as const },
    { name: 'Triglycerides', unit: 'mg/dL', refMin: 0, refMax: 150, optMin: 50, optMax: 100, source: 'Quest' as const },
    { name: 'HbA1c', unit: '%', refMin: 4.0, refMax: 5.7, optMin: 4.5, optMax: 5.2, source: 'LabCorp' as const },
    { name: 'Fasting Glucose', unit: 'mg/dL', refMin: 70, refMax: 100, optMin: 75, optMax: 85, source: 'Quest' as const },
    { name: 'TSH', unit: 'mIU/L', refMin: 0.4, refMax: 4.0, optMin: 1.0, optMax: 2.5, source: 'LabCorp' as const },
    { name: 'Free T3', unit: 'pg/mL', refMin: 2.3, refMax: 4.2, optMin: 3.0, optMax: 3.8, source: 'Quest' as const },
    { name: 'Free T4', unit: 'ng/dL', refMin: 0.8, refMax: 1.8, optMin: 1.2, optMax: 1.6, source: 'LabCorp' as const },
    { name: 'Vitamin D (25-OH)', unit: 'ng/mL', refMin: 30, refMax: 100, optMin: 50, optMax: 80, source: 'Quest' as const },
    { name: 'B12', unit: 'pg/mL', refMin: 200, refMax: 900, optMin: 500, optMax: 800, source: 'LabCorp' as const },
    { name: 'Ferritin', unit: 'ng/mL', refMin: 15, refMax: 150, optMin: 50, optMax: 100, source: 'Quest' as const },
    { name: 'Creatinine', unit: 'mg/dL', refMin: 0.6, refMax: 1.2, optMin: 0.7, optMax: 1.0, source: 'LabCorp' as const },
    { name: 'ALT', unit: 'U/L', refMin: 7, refMax: 56, optMin: 10, optMax: 25, source: 'Quest' as const },
    { name: 'AST', unit: 'U/L', refMin: 10, refMax: 40, optMin: 15, optMax: 25, source: 'LabCorp' as const },
  ];

  // Generate labs over the past 1 year (more frequent in recent months)
  // Quarterly labs for first 9 months, then monthly/bi-weekly in last 3 months
  const dates: number[] = [];
  
  // Quarterly labs for first 9 months (270 days)
  for (let i = 360; i >= 90; i -= 90) {
    dates.push(i);
  }
  
  // Monthly labs for months 3-1 (90, 60, 30 days ago)
  dates.push(90, 60, 30);
  
  // Bi-weekly labs for last month (14, 7, 0 days ago)
  dates.push(14, 7, 0);
  
  // Sort to ensure chronological order
  dates.sort((a, b) => b - a);
  
  dates.forEach((days, dateIdx) => {
    const timestamp = daysAgo(days);
    const testSubset = conventionalTests.slice(0, Math.min(8 + dateIdx % 3, conventionalTests.length));
    
    testSubset.forEach((test, idx) => {
      // Vary values to create some out-of-range results
      const baseValue = (test.refMin + test.refMax) / 2;
      const variation = (test.refMax - test.refMin) * 0.3;
      let value = baseValue + (Math.random() - 0.5) * variation;
      
      // Create declining trend for Vitamin D (25-OH) to trigger proactive alert
      // Start at 55 ng/mL 360 days ago, decline to ~32 ng/mL (approaching lower limit of 30)
      if (test.name === 'Vitamin D (25-OH)') {
        const daysFromStart = 360 - days;
        const declineRate = 23 / 360; // Decline from 55 to 32 over 360 days
        const baseValue = 55 - (daysFromStart * declineRate);
        // Add small noise but ensure clear declining trend
        value = baseValue + (Math.random() - 0.5) * 2; // Reduced noise
        value = Math.max(30, Math.min(60, value)); // Keep within reasonable bounds
        // Ensure recent values are definitely approaching the lower limit
        if (days <= 30) {
          value = Math.min(value, 35); // Recent values should be 30-35
        }
      }
      
      // Force some out-of-range values
      if (dateIdx === 2 && idx === 1) value = test.refMax * 1.15; // High LDL
      if (dateIdx === 4 && idx === 4) value = test.refMax * 1.1; // High HbA1c
      
      const isOutOfRange = value < test.refMin || value > test.refMax;
      const isOutOfOptimal = test.optMin && test.optMax 
        ? (value < test.optMin || value > test.optMax)
        : undefined;

      labs.push({
        id: `lab-${timestamp.getTime()}-${idx}`,
        timestamp,
        source: test.source,
        testName: test.name,
        value: Math.round(value * 100) / 100,
        unit: test.unit,
        referenceRange: { min: test.refMin, max: test.refMax },
        optimalRange: test.optMin ? { min: test.optMin, max: test.optMax } : undefined,
        isOutOfRange,
        isOutOfOptimal,
        category: 'conventional',
      });
    });
  });

  // Specialty Labs (DUTCH, Genova, GI-Map)
  const specialtyLabs: LabResult[] = [
    {
      id: 'dutch-1',
      timestamp: daysAgo(90),
      source: 'DUTCH',
      testName: 'Cortisol AM',
      value: 18.5,
      unit: 'μg/dL',
      referenceRange: { min: 10, max: 20 },
      optimalRange: { min: 12, max: 18 },
      isOutOfRange: false,
      isOutOfOptimal: true,
      category: 'specialty',
    },
    {
      id: 'dutch-2',
      timestamp: daysAgo(90),
      source: 'DUTCH',
      testName: 'Cortisol PM',
      value: 3.2,
      unit: 'μg/dL',
      referenceRange: { min: 2, max: 4 },
      optimalRange: { min: 2.5, max: 3.5 },
      isOutOfRange: false,
      isOutOfOptimal: false,
      category: 'specialty',
    },
    {
      id: 'genova-1',
      timestamp: daysAgo(60),
      source: 'Genova',
      testName: 'Omega-3 Index',
      value: 4.2,
      unit: '%',
      referenceRange: { min: 4, max: 8 },
      optimalRange: { min: 6, max: 8 },
      isOutOfRange: false,
      isOutOfOptimal: true,
      category: 'specialty',
    },
    {
      id: 'gimap-1',
      timestamp: daysAgo(45),
      source: 'GI-Map',
      testName: 'H. Pylori',
      value: 0,
      unit: 'DNA copies',
      referenceRange: { min: 0, max: 0 },
      isOutOfRange: false,
      category: 'specialty',
    },
  ];

  return [...labs, ...specialtyLabs];
}

// Generate synthetic wearable data
function generateWearables(): WearableData[] {
  const wearables: WearableData[] = [];
  const now = new Date();

  // Generate daily data for the past 1 year (365 days)
  for (let i = 365; i >= 0; i--) {
    const date = daysAgo(i);
    
    // Oura Ring data - with declining trends to trigger proactive alerts
    // Sleep: Create declining trend from 8.5 hours to 7.1 hours (approaching lower limit of 7)
    // This will trigger a proactive alert as it approaches the lower reference range
    const daysFromStart = 365 - i;
    const sleepDeclineRate = 1.4 / 365; // Decline from 8.5 to 7.1 over 365 days
    let sleepValue = 8.5 - (daysFromStart * sleepDeclineRate) + (Math.random() - 0.5) * 0.3; // Reduced noise
    
    // Add weekly variation (weekends slightly better)
    if (i % 7 === 0 || i % 7 === 6) {
      sleepValue += 0.15; // Slightly better on weekends
    }
    
    // Add occasional poor sleep nights
    if (i % 10 === 0) sleepValue -= 0.4 + Math.random() * 0.3;
    
    // Ensure recent values are definitely approaching the lower limit
    if (i <= 30) {
      sleepValue = Math.min(sleepValue, 7.3); // Recent values should be 7.0-7.3 hours
    }
    
    // Ensure it doesn't go below 6.5 or above 9.5
    sleepValue = Math.max(6.5, Math.min(9.5, sleepValue));
    
    wearables.push({
      id: `oura-sleep-${date.getTime()}`,
      timestamp: date,
      source: 'Oura',
      type: 'sleep',
      value: Math.round(sleepValue * 10) / 10,
      unit: 'hours',
      metadata: { deepSleep: 1.8, remSleep: 1.5, lightSleep: 4.0 },
    });

    // HRV: Create declining trend from 45 ms to 22 ms (approaching lower limit of 20)
    // This will trigger a proactive alert as it approaches the lower reference range
    const hrvDeclineRate = 23 / 365; // Decline from 45 to 22 over 365 days
    let hrvValue = 45 - (daysFromStart * hrvDeclineRate) + (Math.random() - 0.5) * 2; // Reduced noise
    
    // Add weekly variation (recovery days)
    if (i % 7 === 0) {
      hrvValue += 1.5; // Slightly better on rest days
    }
    
    // Ensure recent values are definitely approaching the lower limit
    if (i <= 30) {
      hrvValue = Math.min(hrvValue, 25); // Recent values should be 20-25 ms
    }
    
    // Ensure it doesn't go below 18 or above 60
    hrvValue = Math.max(18, Math.min(60, hrvValue));
    
    wearables.push({
      id: `oura-hrv-${date.getTime()}`,
      timestamp: date,
      source: 'Oura',
      type: 'hrv',
      value: Math.round(hrvValue * 10) / 10,
      unit: 'ms',
    });

    // Heart Rate: Normal 60-100 bpm, relatively stable with some variation
    let heartRateValue = 70 + (Math.random() - 0.5) * 15; // Base: 62.5-77.5 bpm
    if (i % 6 === 0) heartRateValue = 105 + Math.random() * 10; // Occasional elevated (105-115 bpm)
    if (i % 8 === 0) heartRateValue = 55 + Math.random() * 3; // Occasional low (55-58 bpm)
    
    wearables.push({
      id: `oura-heartrate-${date.getTime()}`,
      timestamp: date,
      source: 'Oura',
      type: 'heartRate',
      value: Math.round(heartRateValue),
      unit: 'bpm',
    });

    // CGM data (multiple readings per day) - Normal fasting: 70-100 mg/dL
    const cgmReadings = [6, 12, 18]; // times of day (fasting, post-lunch, post-dinner)
    cgmReadings.forEach((hour, idx) => {
      const cgmDate = new Date(date);
      cgmDate.setHours(hour, 0, 0, 0);
      
      let glucoseValue;
      if (hour === 6) {
        // Fasting glucose: 70-100 mg/dL normal, some elevated
        glucoseValue = 85 + (Math.random() - 0.5) * 20; // Base: 75-95
        if (i % 4 === 0) glucoseValue = 105 + Math.random() * 15; // Occasional elevated fasting (105-120)
      } else {
        // Post-meal: can spike but should be <140 mg/dL
        glucoseValue = 95 + (Math.random() - 0.3) * 40 + (hour === 12 ? 15 : 10); // Post-meal higher
        if (i % 5 === 0) glucoseValue = 145 + Math.random() * 20; // Occasional post-meal spike (145-165)
      }
      
      wearables.push({
        id: `cgm-${cgmDate.getTime()}-${idx}`,
        timestamp: cgmDate,
        source: 'CGM',
        type: 'glucose',
        value: Math.round(glucoseValue),
        unit: 'mg/dL',
      });
    });

    // Daily weight measurement - Normal range varies, using 150-200 lbs as reference
    // Slight upward trend over the year (realistic weight gain)
    const weightBase = 175;
    const weightTrend = (daysFromStart / 365) * 3; // Gain ~3 lbs over the year
    let weightValue = weightBase + weightTrend + (Math.random() - 0.5) * 1.5; // Daily variation
    
    // Weekly patterns (slightly lower on Mondays after weekend)
    if (i % 7 === 0) weightValue -= 0.5;
    
    // Ensure it stays within reasonable bounds
    weightValue = Math.max(170, Math.min(185, weightValue));
    
    wearables.push({
      id: `weight-${date.getTime()}`,
      timestamp: date,
      source: 'Manual',
      type: 'weight',
      value: Math.round(weightValue * 10) / 10,
      unit: 'lbs',
    });

    // Manual vitals (every few days) - Normal BP: <120/<80 mmHg
    // More frequent in recent months
    const shouldMeasureBP = i <= 90 ? (i % 3 === 0) : (i % 7 === 0); // Every 3 days in last 3 months, weekly before
    
    if (shouldMeasureBP) {
      let systolic = 115 + (Math.random() - 0.3) * 10; // Base: 112-125
      let diastolic = 75 + (Math.random() - 0.3) * 8; // Base: 73-80
      
      // Occasional elevated BP
      if (i % 5 === 0) {
        systolic = 125 + Math.random() * 10; // Elevated: 125-135
        diastolic = 82 + Math.random() * 8; // Elevated: 82-90
      }
      
      wearables.push({
        id: `bp-${date.getTime()}`,
        timestamp: date,
        source: 'Manual',
        type: 'bloodPressure',
        value: Math.round(systolic),
        unit: 'mmHg',
        metadata: { systolic: Math.round(systolic), diastolic: Math.round(diastolic) },
      });
    }
  }

  return wearables;
}

// Generate synthetic EHR events
function generateEHREvents(): EHREvent[] {
  return [
    {
      id: 'ehr-1',
      timestamp: daysAgo(360),
      type: 'medication',
      title: 'Started Metformin 500mg',
      description: 'Prescribed for insulin resistance management',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-2',
      timestamp: daysAgo(330),
      type: 'note',
      title: 'Initial Consultation',
      description: 'Comprehensive health assessment. Discussed lifestyle modifications.',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-3',
      timestamp: daysAgo(270),
      type: 'note',
      title: 'Follow-up Consultation',
      description: 'Patient reports improved energy levels. Discussed dietary modifications.',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-4',
      timestamp: daysAgo(240),
      type: 'medication',
      title: 'Increased Metformin to 1000mg',
      description: 'Titrated based on glucose response',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-5',
      timestamp: daysAgo(180),
      type: 'procedure',
      title: 'DEXA Scan',
      description: 'Bone density assessment - T-score: -1.2',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-6',
      timestamp: daysAgo(120),
      type: 'medication',
      title: 'Added Vitamin D3 5000 IU',
      description: 'Supplementation for declining Vitamin D levels',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-7',
      timestamp: daysAgo(90),
      type: 'note',
      title: 'Quarterly Review',
      description: 'Comprehensive metabolic panel reviewed. Noted declining sleep and HRV trends.',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-8',
      timestamp: daysAgo(60),
      type: 'note',
      title: 'Follow-up Consultation',
      description: 'Discussed sleep hygiene and stress management strategies.',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-9',
      timestamp: daysAgo(30),
      type: 'note',
      title: 'Quarterly Review',
      description: 'Comprehensive metabolic panel reviewed. Patient progressing well.',
      provider: 'Dr. Smith',
    },
    {
      id: 'ehr-10',
      timestamp: daysAgo(7),
      type: 'appointment',
      title: 'Upcoming: Annual Physical',
      description: 'Scheduled for comprehensive evaluation',
      provider: 'Dr. Smith',
    },
  ];
}

// Generate genetic markers
function generateGeneticMarkers(): GeneticMarker[] {
  return [
    {
      id: 'gen-1',
      gene: 'APOE',
      variant: 'ε3/ε4',
      status: 'Heterozygous',
      significance: 'high',
      clinicalImplications: [
        'Increased risk for cardiovascular disease',
        'May benefit from lower saturated fat intake',
        'Monitor lipid panel more frequently',
      ],
      relatedLabs: ['Total Cholesterol', 'LDL Cholesterol', 'HDL Cholesterol'],
      relatedMedications: ['Metformin'],
    },
    {
      id: 'gen-2',
      gene: 'MTHFR',
      variant: 'C677T (Heterozygous)',
      status: 'Heterozygous',
      significance: 'medium',
      clinicalImplications: [
        'Reduced folate metabolism efficiency',
        'May require methylated B-vitamin supplementation',
        'Monitor homocysteine levels',
      ],
      relatedLabs: ['B12', 'Folate'],
    },
    {
      id: 'gen-3',
      gene: 'CYP2D6',
      variant: 'Intermediate Metabolizer',
      status: 'Intermediate',
      significance: 'high',
      clinicalImplications: [
        'Altered metabolism of many medications',
        'May require dose adjustments for certain drugs',
        'Important for pharmacogenomics considerations',
      ],
      relatedMedications: ['Metformin'],
    },
  ];
}

// Generate complete synthetic patient
export function generateSyntheticPatient(): Patient {
  return {
    id: 'patient-001',
    name: 'John Doe',
    dateOfBirth: new Date(1975, 5, 15),
    labs: generateLabs(),
    wearables: generateWearables(),
    ehrEvents: generateEHREvents(),
    geneticMarkers: generateGeneticMarkers(),
  };
}

// Generate unified timeline from patient data
export function generateTimeline(patient: Patient): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Add labs
  patient.labs.forEach((lab) => {
    entries.push({
      id: lab.id,
      timestamp: lab.timestamp,
      type: 'lab',
      category: lab.category,
      title: `${lab.testName}: ${lab.value} ${lab.unit}`,
      data: lab,
      isOutOfRange: lab.isOutOfRange || lab.isOutOfOptimal,
    });
  });

  // Add wearables
  patient.wearables.forEach((wearable) => {
    entries.push({
      id: wearable.id,
      timestamp: wearable.timestamp,
      type: 'wearable',
      category: wearable.type,
      title: `${wearable.type}: ${wearable.value} ${wearable.unit}`,
      data: wearable,
    });
  });

  // Add EHR events
  patient.ehrEvents.forEach((event) => {
    entries.push({
      id: event.id,
      timestamp: event.timestamp,
      type: 'ehr',
      category: event.type,
      title: event.title,
      data: event,
    });
  });

  // Sort by timestamp
  return entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

