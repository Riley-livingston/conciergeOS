// Core patient data types for Precision Clinical OS

export type LabSource = 'Quest' | 'LabCorp' | 'DUTCH' | 'Genova' | 'GI-Map';

export interface LabResult {
  id: string;
  timestamp: Date;
  source: LabSource;
  testName: string;
  value: number;
  unit: string;
  referenceRange: {
    min: number;
    max: number;
  };
  optimalRange?: {
    min: number;
    max: number;
  };
  isOutOfRange: boolean;
  isOutOfOptimal?: boolean;
  category: 'conventional' | 'specialty';
}

export interface WearableData {
  id: string;
  timestamp: Date;
  source: 'Oura' | 'Apple Health' | 'CGM' | 'Manual';
  type: 'heartRate' | 'sleep' | 'steps' | 'glucose' | 'bloodPressure' | 'weight' | 'hrv' | 'temperature';
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface EHREvent {
  id: string;
  timestamp: Date;
  type: 'medication' | 'note' | 'procedure' | 'diagnosis' | 'appointment';
  title: string;
  description: string;
  provider?: string;
  metadata?: Record<string, any>;
}

export interface GeneticMarker {
  id: string;
  gene: string;
  variant: string;
  status: string;
  significance: 'high' | 'medium' | 'low';
  clinicalImplications: string[];
  relatedLabs?: string[];
  relatedMedications?: string[];
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: Date;
  labs: LabResult[];
  wearables: WearableData[];
  ehrEvents: EHREvent[];
  geneticMarkers: GeneticMarker[];
}

export interface TimelineEntry {
  id: string;
  timestamp: Date;
  type: 'lab' | 'wearable' | 'ehr' | 'genetic';
  category: string;
  title: string;
  data: LabResult | WearableData | EHREvent | GeneticMarker;
  isOutOfRange?: boolean;
}

// Serialized variants for client components
export interface SerializedLabResult extends Omit<LabResult, 'timestamp'> {
  timestamp: string;
}

export interface SerializedWearableData extends Omit<WearableData, 'timestamp'> {
  timestamp: string;
}

export interface SerializedEHREvent extends Omit<EHREvent, 'timestamp'> {
  timestamp: string;
}

export interface SerializedTimelineEntry extends Omit<TimelineEntry, 'timestamp' | 'data'> {
  timestamp: string;
  data: SerializedLabResult | SerializedWearableData | SerializedEHREvent | GeneticMarker;
}

export interface SerializedPatient extends Omit<Patient, 'dateOfBirth' | 'labs' | 'wearables' | 'ehrEvents'> {
  dateOfBirth: string;
  labs: SerializedLabResult[];
  wearables: SerializedWearableData[];
  ehrEvents: SerializedEHREvent[];
}

// Trend Alert System - Five Pillars of Health
export type HealthPillar = 'nutrition' | 'exercise' | 'sleep' | 'stress' | 'spiritual';

export interface TrendAlert {
  id: string;
  metricLabel: string;
  category: 'lab' | 'wearable' | 'vital';
  healthPillar: HealthPillar;
  alertType: 'downtrend' | 'uptrend' | 'approaching_lower' | 'approaching_upper';
  severity: 'warning' | 'caution'; // warning = within 10% of edge, caution = within 20%
  currentValue: number;
  unit: string;
  referenceRange: { min: number; max: number };
  trendDirection: 'improving' | 'declining' | 'stable';
  dataPoints: Array<{ timestamp: string; value: number }>;
  daysToEdge?: number; // Estimated days until out of range if trend continues
  message: string; // e.g., "Sleep trending down - approaching lower limit (7.2 hrs)"
  recommendation?: string; // Pillar-specific recommendation
}

