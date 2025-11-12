"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Line,
  LineChart,
} from "recharts";
import {
  SerializedPatient,
  SerializedTimelineEntry,
  SerializedLabResult,
  SerializedWearableData,
  SerializedEHREvent,
  GeneticMarker,
  TrendAlert,
  HealthPillar,
} from "@/lib/types/patient";
import { formatDate, formatRelative } from "@/lib/utils/format";
import { detectTrends } from "@/lib/utils/trendDetection";

const CATEGORY_CONFIG = {
  clinicalLabs: {
    label: "Clinical Labs",
    color: "#2563EB",
    accent: "bg-blue-500",
  },
  vitals: {
    label: "Vitals/EHR",
    color: "#0F766E",
    accent: "bg-teal-600",
  },
  wearables: {
    label: "Wearables",
    color: "#7C3AED",
    accent: "bg-violet-500",
  },
} as const;

// Color palette for metrics (distinct, accessible colors)
const METRIC_COLORS: Record<string, string> = {
  // Wearables
  "Sleep": "#8B5CF6", // Purple
  "Heart Rate": "#EC4899", // Pink
  "Glucose": "#F59E0B", // Amber
  "HRV": "#10B981", // Green
  // Vitals
  "Blood Pressure": "#EF4444", // Red
  "Weight": "#06B6D4", // Cyan
  // Common lab tests (will be extended dynamically)
  "Total Cholesterol": "#3B82F6", // Blue
  "LDL Cholesterol": "#6366F1", // Indigo
  "HDL Cholesterol": "#14B8A6", // Teal
  "Triglycerides": "#F97316", // Orange
  "HbA1c": "#DC2626", // Red
  "Fasting Glucose": "#F59E0B", // Amber
  "TSH": "#8B5CF6", // Purple
  "Free T3": "#EC4899", // Pink
  "Free T4": "#10B981", // Green
  "Vitamin D (25-OH)": "#F59E0B", // Amber
  "B12": "#06B6D4", // Cyan
  "Ferritin": "#EF4444", // Red
  "Creatinine": "#6366F1", // Indigo
  "ALT": "#14B8A6", // Teal
  "AST": "#F97316", // Orange
  "Cortisol AM": "#8B5CF6", // Purple
  "Cortisol PM": "#EC4899", // Pink
  "Omega-3 Index": "#10B981", // Green
  "H. Pylori": "#F59E0B", // Amber
};

// Shape types for metrics
const SHAPE_TYPES = ["circle", "square", "triangle", "diamond", "star", "cross"] as const;
type ShapeType = typeof SHAPE_TYPES[number];

// Assign shapes to metrics
const METRIC_SHAPES: Record<string, ShapeType> = {
  // Wearables
  "Sleep": "circle",
  "Heart Rate": "square",
  "Glucose": "triangle",
  "HRV": "diamond",
  // Vitals
  "Blood Pressure": "square",
  "Weight": "circle",
  // Labs - assign shapes in order
  "Total Cholesterol": "circle",
  "LDL Cholesterol": "square",
  "HDL Cholesterol": "triangle",
  "Triglycerides": "diamond",
  "HbA1c": "star",
  "Fasting Glucose": "cross",
  "TSH": "circle",
  "Free T3": "square",
  "Free T4": "triangle",
  "Vitamin D (25-OH)": "diamond",
  "B12": "star",
  "Ferritin": "cross",
  "Creatinine": "circle",
  "ALT": "square",
  "AST": "triangle",
  "Cortisol AM": "diamond",
  "Cortisol PM": "star",
  "Omega-3 Index": "cross",
  "H. Pylori": "circle",
};

// Generate a color for a metric if not in the palette
function getMetricColor(label: string): string {
  if (METRIC_COLORS[label]) {
    return METRIC_COLORS[label];
  }
  // Generate a color based on the label hash
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

// Generate a shape for a metric if not in the mapping
function getMetricShape(label: string): ShapeType {
  if (METRIC_SHAPES[label]) {
    return METRIC_SHAPES[label];
  }
  // Cycle through shapes based on label hash
  const hash = label.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SHAPE_TYPES[hash % SHAPE_TYPES.length];
}

// Render a shape component
function renderShape(shapeType: ShapeType, cx: number, cy: number, color: string, size: number = 4) {
  switch (shapeType) {
    case "circle":
      return <circle cx={cx} cy={cy} r={size} fill={color} />;
    case "square":
      return <rect x={cx - size} y={cy - size} width={size * 2} height={size * 2} fill={color} />;
    case "triangle":
      return <polygon points={`${cx},${cy - size} ${cx - size},${cy + size} ${cx + size},${cy + size}`} fill={color} />;
    case "diamond":
      return <polygon points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`} fill={color} />;
    case "star":
      // Simple star shape
      const starPoints = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        starPoints.push(`${x},${y}`);
      }
      return <polygon points={starPoints.join(" ")} fill={color} />;
    case "cross":
      return (
        <g>
          <line x1={cx - size} y1={cy} x2={cx + size} y2={cy} stroke={color} strokeWidth={2} />
          <line x1={cx} y1={cy - size} x2={cx} y2={cy + size} stroke={color} strokeWidth={2} />
        </g>
      );
    default:
      return <circle cx={cx} cy={cy} r={size} fill={color} />;
  }
}

// Render a shape for the legend (centered at 0,0)
function renderLegendShape(shapeType: ShapeType, color: string, size: number = 6) {
  switch (shapeType) {
    case "circle":
      return <circle cx={size} cy={size} r={size} fill={color} />;
    case "square":
      return <rect x={0} y={0} width={size * 2} height={size * 2} fill={color} />;
    case "triangle":
      return <polygon points={`${size},0 ${0},${size * 2} ${size * 2},${size * 2}`} fill={color} />;
    case "diamond":
      return <polygon points={`${size},0 ${size * 2},${size} ${size},${size * 2} 0,${size}`} fill={color} />;
    case "star":
      const starPoints = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = size + size * Math.cos(angle);
        const y = size + size * Math.sin(angle);
        starPoints.push(`${x},${y}`);
      }
      return <polygon points={starPoints.join(" ")} fill={color} />;
    case "cross":
      return (
        <g>
          <line x1={0} y1={size} x2={size * 2} y2={size} stroke={color} strokeWidth={2} />
          <line x1={size} y1={0} x2={size} y2={size * 2} stroke={color} strokeWidth={2} />
        </g>
      );
    default:
      return <circle cx={size} cy={size} r={size} fill={color} />;
  }
}

type CategoryKey = keyof typeof CATEGORY_CONFIG;

const TIME_RANGES = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
];

interface PatientDashboardProps {
  patient: SerializedPatient;
  timeline: SerializedTimelineEntry[];
}

interface NormalizedPoint {
  id: string;
  timestamp: string;
  label: string;
  category: CategoryKey;
  normalizedValue: number;
  actualValue: number;
  displayValue: string;
  unit?: string;
  source?: string;
  isOutOfRange: boolean;
  referenceRange: {
    min: number;
    max: number;
  };
}

// Medical standard reference ranges
const WEARABLE_BASELINES: Record<SerializedWearableData["type"], { min: number; max: number; unit?: string }> = {
  sleep: { min: 7, max: 9 }, // Optimal: 7-9 hours per night (CDC/AHA guidelines)
  steps: { min: 3000, max: 12000 }, // Keep for reference but not used
  heartRate: { min: 60, max: 100 }, // Normal resting heart rate: 60-100 bpm (AHA)
  glucose: { min: 70, max: 100 }, // Normal fasting glucose: 70-100 mg/dL (ADA)
  bloodPressure: { min: 90, max: 120 }, // Normal systolic: <120 mmHg (AHA)
  weight: { min: 150, max: 200 }, // Reasonable range for patient (BMI-based would be better, but using fixed range)
  hrv: { min: 20, max: 60 }, // Typical HRV range: 20-60 ms for adults
  temperature: { min: 97.0, max: 99.0 }, // Normal body temperature: 97.0-99.0°F
};

const normalize = (value: number, min: number, max: number) => {
  if (max === min) return 50; // Default to middle if range is zero
  const percentage = ((value - min) / (max - min)) * 100;
  // Clamp to reasonable range but allow out-of-range values to show
  return Number.isFinite(percentage) ? Math.round(percentage * 10) / 10 : 50;
};

const computeLastVisit = (events: SerializedEHREvent[]) => {
  if (!events.length) return null;
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return sorted[0].timestamp;
};

const getWearablePrimaryValue = (wearable: SerializedWearableData) => {
  if (wearable.type === "bloodPressure") {
    return (wearable.metadata?.systolic as number | undefined) ?? wearable.value;
  }
  return wearable.value;
};

const composeWearableDisplay = (wearable: SerializedWearableData, value: number) => {
  if (wearable.type === "bloodPressure") {
    const systolic = wearable.metadata?.systolic ?? value;
    const diastolic = wearable.metadata?.diastolic;
    return `${systolic}${diastolic ? `/${diastolic}` : ""} ${wearable.unit}`;
  }
  return `${Math.round(value * 10) / 10} ${wearable.unit}`.trim();
};

export const PatientDashboard = ({ patient, timeline }: PatientDashboardProps) => {
  const [showSignalsOnly, setShowSignalsOnly] = useState(false);
  const [activeCategories, setActiveCategories] = useState<CategoryKey[]>(
    Object.keys(CATEGORY_CONFIG) as CategoryKey[]
  );
  const [activeRange, setActiveRange] = useState<string>("All");
  const [activeWearableTypes, setActiveWearableTypes] = useState<Set<string>>(new Set());
  const hasInitializedWearableTypes = useRef(false);

  const age = useMemo(() => {
    const dob = new Date(patient.dateOfBirth);
    const diff = Date.now() - dob.getTime();
    const ageDt = new Date(diff);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  }, [patient.dateOfBirth]);

  const lastVisit = useMemo(() => computeLastVisit(patient.ehrEvents), [patient.ehrEvents]);

  // Extract current medications from EHR events
  const currentMedications = useMemo(() => {
    const medications = patient.ehrEvents
      .filter((event) => event.type === "medication")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Parse medication name and dosage from title
    const medicationMap = new Map<string, { name: string; dosage: string; description: string; date: string }>();

    medications.forEach((med) => {
      const title = med.title;
      // Parse patterns like "Started Metformin 500mg" or "Increased Metformin to 1000mg" or "Added Vitamin D3 5000 IU"
      const match = title.match(/(?:Started|Increased|Added|Changed)\s+(.+?)(?:\s+to\s+|\s+)(\d+(?:\s*[a-zA-Z]+)?)/i) ||
        title.match(/(.+?)\s+(\d+(?:\s*[a-zA-Z]+)?)/i);
      
      if (match) {
        const name = match[1].trim();
        const dosage = match[2].trim();
        medicationMap.set(name, {
          name,
          dosage,
          description: med.description,
          date: formatDate(med.timestamp),
        });
      } else {
        // Fallback: use title as name
        const name = title.replace(/^(Started|Increased|Added|Changed)\s+/i, "").trim();
        medicationMap.set(name, {
          name,
          dosage: "See description",
          description: med.description,
          date: formatDate(med.timestamp),
        });
      }
    });

    return Array.from(medicationMap.values());
  }, [patient.ehrEvents]);

  const normalizedPoints = useMemo<NormalizedPoint[]>(() => {
    const points: NormalizedPoint[] = [];

    timeline.forEach((entry) => {
      if (entry.type === "lab") {
        const lab = entry.data as SerializedLabResult;
        const { min, max } = lab.referenceRange;
        const normalizedValue = normalize(lab.value, min, max);
        points.push({
          id: entry.id,
          timestamp: entry.timestamp,
          label: lab.testName,
          category: "clinicalLabs",
          normalizedValue,
          actualValue: lab.value,
          displayValue: `${lab.value} ${lab.unit}`,
          unit: lab.unit,
          source: lab.source,
          isOutOfRange: lab.isOutOfRange ?? lab.isOutOfOptimal ?? false,
          referenceRange: { min, max },
        });
      }

      if (entry.type === "wearable") {
        const wearable = entry.data as SerializedWearableData;
        const baseline = WEARABLE_BASELINES[wearable.type];
        if (!baseline) return;
        const value = getWearablePrimaryValue(wearable);
        const normalizedValue = normalize(value, baseline.min, baseline.max);

        points.push({
          id: entry.id,
          timestamp: entry.timestamp,
          label: wearable.type === "bloodPressure" ? "Blood Pressure" : wearable.type === "weight" ? "Weight" : wearable.type === "glucose" ? "Glucose" : wearable.type === "sleep" ? "Sleep" : wearable.type === "hrv" ? "HRV" : wearable.type === "heartRate" ? "Heart Rate" : wearable.type,
          category:
            wearable.type === "bloodPressure" || wearable.type === "weight"
              ? "vitals"
              : "wearables",
          normalizedValue,
          actualValue: value,
          displayValue: composeWearableDisplay(wearable, value),
          unit: wearable.unit,
          source: wearable.source,
          isOutOfRange: value < baseline.min || value > baseline.max,
          referenceRange: { min: baseline.min, max: baseline.max },
        });
      }
    });

    return points;
  }, [timeline]);

  // Detect trends and generate alerts
  // Use filteredPoints to respect time range, but need enough data points
  // For proactive alerts, we want to see trends, so use all normalized points
  const trendAlerts = useMemo(() => {
    const alerts = detectTrends(normalizedPoints);
    // Debug: log alerts to console
    console.log('Trend alerts calculated:', alerts.length, 'alerts');
    if (alerts.length > 0) {
      console.log('Proactive alerts detected:', alerts.map(a => ({ 
        metric: a.metricLabel, 
        severity: a.severity, 
        value: a.currentValue,
        pillar: a.healthPillar 
      })));
    }
    return alerts;
  }, [normalizedPoints]);

  // Get all available wearable types from the data
  const availableWearableTypes = useMemo(() => {
    const types = new Set<string>();
    normalizedPoints.forEach((point) => {
      if (point.category === "wearables" || point.category === "vitals") {
        types.add(point.label);
      }
    });
    return Array.from(types).sort();
  }, [normalizedPoints]);

  // Initialize active wearable types only on first load
  useEffect(() => {
    if (!hasInitializedWearableTypes.current && activeWearableTypes.size === 0 && availableWearableTypes.length > 0) {
      setActiveWearableTypes(new Set(availableWearableTypes));
      hasInitializedWearableTypes.current = true;
    }
  }, [availableWearableTypes, activeWearableTypes.size]);

  // Automatically deselect wearable types when their parent category is deselected
  useEffect(() => {
    const vitalsTypes = new Set(["Blood Pressure", "Weight"]);
    const wearablesTypes = new Set(["Glucose", "HRV", "Heart Rate", "Sleep"]);

    setActiveWearableTypes((prev) => {
      const updated = new Set(prev);
      let changed = false;

      // If vitals category is deselected, remove vitals types
      if (!activeCategories.includes("vitals")) {
        vitalsTypes.forEach((type) => {
          if (updated.has(type)) {
            updated.delete(type);
            changed = true;
          }
        });
      }

      // If wearables category is deselected, remove wearables types
      if (!activeCategories.includes("wearables")) {
        wearablesTypes.forEach((type) => {
          if (updated.has(type)) {
            updated.delete(type);
            changed = true;
          }
        });
      }

      return changed ? updated : prev;
    });
  }, [activeCategories]);

  const filteredPoints = useMemo(() => {
    let points = normalizedPoints.filter((point) => activeCategories.includes(point.category));

    // Filter by specific wearable types if wearables/vitals are active
    if (activeCategories.includes("wearables") || activeCategories.includes("vitals")) {
      // If no wearable types are selected, hide all wearables/vitals
      if (activeWearableTypes.size === 0) {
        points = points.filter((point) => {
          return point.category !== "wearables" && point.category !== "vitals";
        });
      } else {
        // Filter to only show selected wearable types
        points = points.filter((point) => {
          if (point.category === "wearables" || point.category === "vitals") {
            return activeWearableTypes.has(point.label);
          }
          return true; // Keep labs if labs category is active
        });
      }
    }

    if (showSignalsOnly) {
      points = points.filter((point) => point.isOutOfRange);
    }

    if (activeRange !== "All") {
      const range = TIME_RANGES.find((item) => item.label === activeRange);
      if (range) {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - range.months);
        points = points.filter((point) => new Date(point.timestamp) >= cutoff);
      }
    }

    return points.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [normalizedPoints, activeCategories, activeWearableTypes, showSignalsOnly, activeRange]);

  // Group points by metric label instead of category
  // Clinical labs all use the same color and shape
  // Add alert indicators for points with active alerts
  const pointsByMetric = useMemo(() => {
    const grouped: Record<string, Array<NormalizedPoint & { x: number; y: number; color: string; shape: ShapeType; hasAlert?: boolean }>> = {};
    
    // Create a set of metrics that have alerts for quick lookup
    const metricsWithAlerts = new Set(trendAlerts.map(a => a.metricLabel));
    
    filteredPoints.forEach((point) => {
      // Clinical labs all use the same color and shape
      const color = point.category === "clinicalLabs" 
        ? CATEGORY_CONFIG.clinicalLabs.color 
        : getMetricColor(point.label);
      const shape = point.category === "clinicalLabs" 
        ? "circle" as ShapeType
        : getMetricShape(point.label);
      
      const hasAlert = metricsWithAlerts.has(point.label);
      
      // Add jitter to prevent overlapping points
      // Jitter is proportional to the data range
      const xJitter = (Math.random() - 0.5) * (24 * 60 * 60 * 1000); // ±12 hours
      const yJitter = (Math.random() - 0.5) * 2; // ±1% on Y axis
      
      const transformedPoint = {
        ...point,
        x: new Date(point.timestamp).getTime() + xJitter,
        y: point.normalizedValue + yJitter,
        color,
        shape,
        hasAlert,
      };
      
      if (!grouped[point.label]) {
        grouped[point.label] = [];
      }
      grouped[point.label].push(transformedPoint);
    });
    
    return grouped;
  }, [filteredPoints, trendAlerts]);

  // Calculate trend lines for metrics with alerts
  const trendLines = useMemo(() => {
    const lines: Array<{
      metricLabel: string;
      color: string;
      points: Array<{ x: number; y: number }>;
    }> = [];

    trendAlerts.forEach(alert => {
      // Get the data points for this metric
      const metricData = pointsByMetric[alert.metricLabel];
      if (!metricData || metricData.length < 2) return;

      // Use the alert's data points to calculate trend line
      if (alert.dataPoints.length < 2) return;

      // Get the time range from filtered points
      const filteredDataForMetric = filteredPoints.filter(p => p.label === alert.metricLabel);
      if (filteredDataForMetric.length < 2) return;

      const minX = Math.min(...filteredDataForMetric.map(p => new Date(p.timestamp).getTime()));
      const maxX = Math.max(...filteredDataForMetric.map(p => new Date(p.timestamp).getTime()));

      // Calculate trend from alert data points (these are the recent points used for detection)
      const alertDataPoints = alert.dataPoints
        .map(dp => {
          const point = filteredDataForMetric.find(p => 
            Math.abs(new Date(p.timestamp).getTime() - new Date(dp.timestamp).getTime()) < 24 * 60 * 60 * 1000
          );
          return point ? {
            x: new Date(point.timestamp).getTime(),
            y: point.normalizedValue,
            actualValue: point.actualValue
          } : null;
        })
        .filter((p): p is { x: number; y: number; actualValue: number } => p !== null);

      if (alertDataPoints.length < 2) return;

      // Calculate linear regression for the trend line
      const n = alertDataPoints.length;
      const sumX = alertDataPoints.reduce((sum, p) => sum + p.x, 0);
      const sumY = alertDataPoints.reduce((sum, p) => sum + p.y, 0);
      const sumXY = alertDataPoints.reduce((sum, p) => sum + p.x * p.y, 0);
      const sumX2 = alertDataPoints.reduce((sum, p) => sum + p.x * p.x, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Generate trend line points across the visible X range
      const linePoints: Array<{ x: number; y: number }> = [];
      const numPoints = 50; // Smooth line
      for (let i = 0; i <= numPoints; i++) {
        const x = minX + ((maxX - minX) * i) / numPoints;
        const y = slope * x + intercept;
        // Clamp Y to 0-100 range
        linePoints.push({ x, y: Math.max(0, Math.min(100, y)) });
      }

      // Get the color for this metric
      const firstPoint = metricData[0];
      lines.push({
        metricLabel: alert.metricLabel,
        color: firstPoint.color,
        points: linePoints,
      });
    });

    return lines;
  }, [trendAlerts, pointsByMetric, filteredPoints]);

  const statSummary = useMemo(() => {
    const clinicalLabs = patient.labs.length;
    const vitals = normalizedPoints.filter((point) => point.category === "vitals").length;
    const wearables = normalizedPoints.filter((point) => point.category === "wearables").length;
    const outOfRange = normalizedPoints.filter((point) => point.isOutOfRange).length;

    return {
      totalPoints: normalizedPoints.length,
      clinicalLabs,
      vitalsWearables: vitals + wearables,
      outOfRange,
    };
  }, [normalizedPoints, patient.labs.length]);

  // Calculate normalized averages for wearable data to show as reference lines
  // Only show when clinical labs are deselected AND we have wearable/vital data
  const wearableAverageLines = useMemo(() => {
    if (activeCategories.includes("clinicalLabs")) return [];
    
    // Also return empty if no wearable types are selected
    if (activeWearableTypes.size === 0) return [];

    const wearablePoints = filteredPoints.filter(
      (point) => point.category === "wearables" || point.category === "vitals"
    );

    const averagesByType = new Map<
      string,
      { 
        normalizedSum: number; 
        actualSum: number; 
        count: number; 
        color: string;
        unit: string;
        referenceRange: { min: number; max: number };
      }
    >();

    wearablePoints.forEach((point) => {
      const existing = averagesByType.get(point.label);
      const categoryConfig = point.category === "vitals" 
        ? CATEGORY_CONFIG.vitals 
        : CATEGORY_CONFIG.wearables;
      
      if (existing) {
        existing.normalizedSum += point.normalizedValue;
        existing.actualSum += point.actualValue;
        existing.count += 1;
      } else {
        averagesByType.set(point.label, {
          normalizedSum: point.normalizedValue,
          actualSum: point.actualValue,
          count: 1,
          color: getMetricColor(point.label),
          unit: point.unit || "",
          referenceRange: point.referenceRange,
        });
      }
    });

    const averages: Array<{
      label: string;
      averageNormalized: number;
      averageActual: number;
      color: string;
      unit: string;
      referenceRange: { min: number; max: number };
    }> = [];

    averagesByType.forEach((data, label) => {
      const averageNormalized = data.normalizedSum / data.count;
      const averageActual = data.actualSum / data.count;
      averages.push({
        label,
        averageNormalized: Math.round(averageNormalized * 10) / 10,
        averageActual: Math.round(averageActual * 10) / 10,
        color: data.color,
        unit: data.unit,
        referenceRange: data.referenceRange,
      });
    });

    return averages.sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredPoints, activeCategories]);

  const toggleCategory = (category: CategoryKey) => {
    setActiveCategories((prev) =>
      prev.includes(category)
        ? prev.filter((cat) => cat !== category)
        : [...prev, category]
    );
  };

  const toggleWearableType = (type: string) => {
    setActiveWearableTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
        <section className="rounded-3xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-500">
                  {patient.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </div>
              <div>
                  <h1 className="text-xl font-semibold text-slate-900">{patient.name}</h1>
                  <p className="text-sm text-slate-500">
                    ID: {patient.id ?? "PT-001"} • Age: {age} • DOB {formatDate(patient.dateOfBirth)}
                </p>
              </div>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-2 text-right text-sm text-slate-500">
              <p className="uppercase tracking-widest text-xs text-slate-400">Last Visit</p>
              <p className="font-medium text-slate-700">
                {lastVisit ? formatDate(lastVisit) : "No visit recorded"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Data Points" value={statSummary.totalPoints.toString()} trendLabel={formatRelative(filteredPoints.at(-1)?.timestamp ?? patient.dateOfBirth)} />
          <StatCard title="Clinical Labs" value={statSummary.clinicalLabs.toString()} subtitle="Optimized ranges applied" />
          <StatCard title="Vitals & Wearables" value={statSummary.vitalsWearables.toString()} subtitle="Active monitoring streams" />
          <StatCard title="Out of Range" value={statSummary.outOfRange.toString()} tone="alert" subtitle="Flagged for review" />
        </section>

        <section className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Unified Longitudinal Data Timeline</h2>
              <p className="text-sm text-slate-500">
                Normalized to reference ranges. Out-of-range markers extend beyond 0–100%.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <button
                onClick={() => setShowSignalsOnly((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  showSignalsOnly
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-red-400" />
                Show Out-of-Range Only
              </button>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                <span className="text-xs uppercase tracking-widest text-slate-400">Time Range</span>
                {TIME_RANGES.map(({ label }) => (
                  <button
                    key={label}
                    onClick={() => setActiveRange(label)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      activeRange === label
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:bg-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setActiveRange("All")}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    activeRange === "All"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:bg-white"
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              {Object.entries(CATEGORY_CONFIG).map(([category, config]) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category as CategoryKey)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 transition ${
                    activeCategories.includes(category as CategoryKey)
                      ? "border-slate-300 bg-slate-100 text-slate-700"
                      : "border-transparent bg-slate-50 text-slate-400"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${config.accent}`} />
                  {config.label}
                </button>
              ))}
            </div>

            {/* Wearable Type Filters - Only show when wearables/vitals are active */}
            {(activeCategories.includes("wearables") || activeCategories.includes("vitals")) && availableWearableTypes.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 flex items-center gap-1.5">
                    <span className="text-red-500">⚠</span>
                    Filter by Metric
                  </p>
                  <button
                    onClick={() => {
                      if (activeWearableTypes.size === availableWearableTypes.length) {
                        setActiveWearableTypes(new Set());
                      } else {
                        setActiveWearableTypes(new Set(availableWearableTypes));
                      }
                    }}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    {activeWearableTypes.size === availableWearableTypes.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableWearableTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleWearableType(type)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        activeWearableTypes.has(type)
                          ? "border-slate-400 bg-white text-slate-900 shadow-sm"
                          : "border-slate-200 bg-slate-100 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {type}
                  </button>
                ))}
              </div>
            </div>
            )}
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 120, bottom: 24, left: 60 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                  }}
                  tick={{ fill: "#64748B", fontSize: 12 }}
                  axisLine={{ stroke: "#CBD5F5" }}
                  tickLine={{ stroke: "#CBD5F5" }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fill: "#64748B", fontSize: 12 }}
                  axisLine={{ stroke: "#CBD5F5" }}
                  tickLine={{ stroke: "#CBD5F5" }}
                  label={{
                    value: "% of Reference Range",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    fill: "#64748B",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={0} stroke="#CBD5F5" />
                <ReferenceLine y={100} stroke="#CBD5F5" strokeDasharray="3 3" />
                {/* Average lines for wearable data when clinical labs are deselected */}
                {wearableAverageLines.map((avg) => (
                  <ReferenceLine
                    key={avg.label}
                    y={avg.averageNormalized}
                    stroke={avg.color}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    strokeOpacity={0.6}
                    label={{
                      value: avg.label,
                      position: "right",
                      fill: avg.color,
                      fontSize: 10,
                      fontWeight: 500,
                      offset: 5,
                    }}
                  />
                ))}
                {/* Invisible scatter points for average lines to enable tooltips */}
                {wearableAverageLines.length > 0 && filteredPoints.length > 0 && (
                  <Scatter
                    name="averages"
                    data={wearableAverageLines.flatMap((avg) => {
                      // Create multiple invisible points along the line for better hover detection
                      const minX = Math.min(...filteredPoints.map((p) => new Date(p.timestamp).getTime()));
                      const maxX = Math.max(...filteredPoints.map((p) => new Date(p.timestamp).getTime()));
                      const points: Array<{
                        x: number;
                        y: number;
                        label: string;
                        averageNormalized: number;
                        averageActual: number;
                        unit: string;
                        referenceRange: { min: number; max: number };
                        color: string;
                      }> = [];
                      
                      // Create 5 points across the X axis for better hover coverage
                      for (let i = 0; i < 5; i++) {
                        const x = minX + ((maxX - minX) * i) / 4;
                        points.push({
                          x,
                          y: avg.averageNormalized,
                          label: avg.label,
                          averageNormalized: avg.averageNormalized,
                          averageActual: avg.averageActual,
                          unit: avg.unit,
                          referenceRange: avg.referenceRange,
                          color: avg.color,
                        });
                      }
                      return points;
                    })}
                    fill="transparent"
                    shape={() => <circle r={0} />}
                  />
                )}
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "#94A3B8" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload as any;
                    
                    // Check if this is an average line tooltip
                    if (data.label && data.averageNormalized !== undefined && data.averageActual !== undefined && data.color) {
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
                          <p className="font-semibold text-slate-800" style={{ color: data.color }}>
                            {data.label} Average
                          </p>
                          <div className="mt-3 space-y-1 text-xs text-slate-600">
                            <p>
                              Normalized: <span className="font-semibold text-slate-800">{data.averageNormalized.toFixed(1)}%</span> of reference range
                            </p>
                            <p>
                              Actual: <span className="font-semibold text-slate-800">{data.averageActual.toFixed(1)} {data.unit}</span>
                            </p>
                            <p className="text-slate-500">
                              Reference Range: {data.referenceRange.min.toFixed(1)} - {data.referenceRange.max.toFixed(1)} {data.unit}
                            </p>
            </div>
                </div>
                      );
                    }
                    
                    // Regular data point tooltip
                    const point = data as NormalizedPoint & { x: number; y: number };
                    
                    // Calculate how far out of range
                    let outOfRangeBy: number | null = null;
                    let outOfRangeDirection: "above" | "below" | null = null;
                    
                    if (point.isOutOfRange) {
                      if (point.normalizedValue > 100) {
                        outOfRangeBy = point.normalizedValue - 100;
                        outOfRangeDirection = "above";
                      } else if (point.normalizedValue < 0) {
                        outOfRangeBy = Math.abs(point.normalizedValue);
                        outOfRangeDirection = "below";
                      }
                    }
                    
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg">
                        <p className="font-semibold text-slate-800">{point.label}</p>
                        <p className="text-xs text-slate-500">{formatDate(point.timestamp, true)}</p>
                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                          <p>
                            Normalized: <span className="font-semibold text-slate-800">{point.normalizedValue.toFixed(1)}%</span>
                          </p>
                          <p>
                            Actual: <span className="font-semibold text-slate-800">{point.displayValue}</span>
                          </p>
                          <p>
                            Reference Range: <span className="font-semibold text-slate-800">
                              {point.referenceRange.min.toFixed(1)} - {point.referenceRange.max.toFixed(1)} {point.unit}
                        </span>
                          </p>
                          {point.source ? <p>Source: {point.source}</p> : null}
                          {point.isOutOfRange && outOfRangeBy !== null ? (
                            <p className="mt-2 text-red-600">
                              <span className="font-semibold">Out of Range by {outOfRangeBy.toFixed(1)}%</span>
                              <span className="ml-1 text-slate-500">
                                ({outOfRangeDirection === "above" ? "above" : "below"} reference range)
                        </span>
                            </p>
                          ) : (
                            <p className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest bg-emerald-50 text-emerald-600`}>
                              In Range
                            </p>
                          )}
                      </div>
                    </div>
                    );
                  }}
                />
                {/* Custom Legend - hidden, we'll render our own below */}
                <Legend
                  formatter={() => ""}
                  wrapperStyle={{ display: "none" }}
                />
                {Object.entries(pointsByMetric).map(([metricLabel, data]) => {
                  if (data.length === 0) return null;
                  const firstPoint = data[0];
                  const hasAlert = firstPoint.hasAlert || false;
                  
                  return (
                    <Scatter
                      key={metricLabel}
                      name={metricLabel}
                      data={data}
                      fill={firstPoint.color}
                      shape={(props: any) => {
                        const { cx, cy } = props;
                        const shapeElement = renderShape(firstPoint.shape, cx, cy, firstPoint.color, 4);
                        
                        // Add alert indicator (dashed ring) if this metric has an alert
                        if (hasAlert) {
                          return (
                            <g>
                              {shapeElement}
                              <circle
                                cx={cx}
                                cy={cy}
                                r={6}
                                fill="none"
                                stroke="#EF4444"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                opacity={0.6}
                              />
                            </g>
                          );
                        }
                        return shapeElement;
                      }}
                    />
                  );
                })}
                {/* Trend lines for metrics with alerts - using ReferenceLine segments */}
                {trendLines.map((line, idx) => {
                  if (line.points.length < 2) return null;
                  // Use the first and last points to draw a simple trend line
                  const firstPoint = line.points[0];
                  const lastPoint = line.points[line.points.length - 1];
                  
                  // Calculate slope and intercept for the line equation: y = mx + b
                  const slope = (lastPoint.y - firstPoint.y) / (lastPoint.x - firstPoint.x);
                  const intercept = firstPoint.y - slope * firstPoint.x;
                  
                  // Create two points at the edges of the visible range for the line
                  const minX = Math.min(...filteredPoints.map(p => new Date(p.timestamp).getTime()));
                  const maxX = Math.max(...filteredPoints.map(p => new Date(p.timestamp).getTime()));
                  
                  const y1 = Math.max(0, Math.min(100, slope * minX + intercept));
                  const y2 = Math.max(0, Math.min(100, slope * maxX + intercept));
                  
                  // Draw the line using a custom shape
                  return (
                    <ReferenceLine
                      key={`trend-${line.metricLabel}-${idx}`}
                      segment={[
                        { x: minX, y: y1 },
                        { x: maxX, y: y2 }
                      ]}
                      stroke={line.color}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      opacity={0.7}
                    />
                  );
                })}
              </ScatterChart>
            </ResponsiveContainer>
                    </div>
            
            {/* Custom Legend with matching shapes - exclude clinical labs */}
            {Object.keys(pointsByMetric).length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Metrics Legend
                </p>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(pointsByMetric)
                    .filter(([metricLabel, data]) => {
                      // Filter out clinical labs
                      if (data.length === 0) return false;
                      const firstPoint = data[0];
                      return firstPoint.category !== "clinicalLabs";
                    })
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([metricLabel, data]) => {
                      const firstPoint = data[0];
                      return (
                        <div key={metricLabel} className="flex items-center gap-2">
                          <svg width={12} height={12} className="flex-shrink-0">
                            {renderLegendShape(firstPoint.shape, firstPoint.color, 6)}
                          </svg>
                          <span className="text-xs font-medium text-slate-700">{metricLabel}</span>
                  </div>
                      );
                    })}
            </div>
                
                {/* Average values legend - only show when clinical labs is deselected */}
                {wearableAverageLines.length > 0 && !activeCategories.includes("clinicalLabs") && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Average Values
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {wearableAverageLines.map((avg) => (
                        <div
                          key={avg.label}
                          className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <div
                            className="mt-1 h-3 w-3 flex-shrink-0 rounded-full border-2 border-dashed"
                            style={{ borderColor: avg.color, backgroundColor: "transparent" }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-900">{avg.label}</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-700">
                              {avg.averageActual.toFixed(1)} <span className="text-xs font-normal text-slate-500">{avg.unit}</span>
                            </p>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              {avg.averageNormalized.toFixed(1)}% of range
                            </p>
            </div>
                    </div>
                      ))}
                    </div>
                  </div>
          )}

                {/* Warnings Section - Show alerts for metrics in the current view */}
                {trendAlerts.length > 0 && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 flex items-center gap-1.5">
                      <span className="text-red-500">⚠</span>
                      Proactive Health Alerts
                    </p>
                    <div className="space-y-2">
                      {trendAlerts
                        .filter(alert => {
                          // Only show alerts for metrics that are currently visible
                          return Object.keys(pointsByMetric).includes(alert.metricLabel);
                        })
                        .map(alert => {
                          const severityColors = alert.severity === 'warning'
                            ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800' }
                            : { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' };
                          
                          // Check if the value is still within range (hasn't breached yet)
                          const isWithinRange = alert.currentValue >= alert.referenceRange.min && 
                                                alert.currentValue <= alert.referenceRange.max;
                          
                          return (
                            <div key={alert.id} className={`rounded-lg border ${severityColors.border} ${severityColors.bg} p-2.5`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityColors.badge}`}>
                                    {alert.severity === 'warning' ? '⚠ Warning' : '⚠ Caution'}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-900">{alert.metricLabel}</span>
            </div>
                                <span className="text-xs text-slate-600">
                                  {alert.currentValue.toFixed(1)} {alert.unit}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-700">{alert.message}</p>
                              {isWithinRange && alert.daysToEdge !== undefined && (
                                <p className="mt-1.5 text-xs font-semibold text-slate-800">
                                  Estimated <span className="text-red-600">{alert.daysToEdge} days</span> until {alert.alertType.includes('lower') ? 'lower' : 'upper'} limit breach if trend continues
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Current Medications</h3>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active Prescriptions</p>
  </div>
          {currentMedications.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">No active medications recorded</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {currentMedications.map((med, idx) => (
                <MedicationCard key={idx} medication={med} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Genetic Markers</h3>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Precision Genomics Overview</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {patient.geneticMarkers.map((marker) => (
              <GeneticMarkerCard key={marker.id} marker={marker} />
            ))}
        </div>
        </section>
      </div>
    </div>
  );
};

// Trend Alerts Component - Five Pillars of Health
const TrendAlerts = ({ alerts }: { alerts: TrendAlert[] }) => {
  if (alerts.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-center py-4">
          <p className="text-sm text-slate-500">No proactive alerts at this time</p>
          <p className="text-xs text-slate-400 mt-1">All metrics are within safe ranges</p>
  </div>
      </section>
    );
  }
  
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const cautionAlerts = alerts.filter(a => a.severity === 'caution');
  
  // Group by health pillar
  const alertsByPillar = alerts.reduce((acc, alert) => {
    if (!acc[alert.healthPillar]) {
      acc[alert.healthPillar] = [];
    }
    acc[alert.healthPillar].push(alert);
    return acc;
  }, {} as Record<HealthPillar, TrendAlert[]>);
  
  const pillarLabels: Record<HealthPillar, string> = {
    nutrition: 'Nutrition',
    exercise: 'Exercise',
    sleep: 'Sleep',
    stress: 'Stress Management',
    spiritual: 'Spiritual Health',
  };
  
  const pillarColors: Record<HealthPillar, { bg: string; border: string; text: string }> = {
    nutrition: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
    exercise: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
    sleep: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' },
    stress: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
    spiritual: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
  };

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between mb-4">
      <div>
          <h3 className="text-lg font-semibold text-slate-900">Proactive Health Alerts</h3>
          <p className="text-sm text-slate-500">Early warning system based on five pillars of health</p>
      </div>
          <div className="flex items-center gap-2">
          {warningAlerts.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
              {warningAlerts.length} Warning{warningAlerts.length !== 1 ? 's' : ''}
            </span>
          )}
          {cautionAlerts.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              {cautionAlerts.length} Caution{cautionAlerts.length !== 1 ? 's' : ''}
              </span>
          )}
        </div>
      </div>

      {/* Group alerts by pillar */}
      <div className="space-y-4">
        {(Object.keys(alertsByPillar) as HealthPillar[]).map(pillar => {
          const pillarAlerts = alertsByPillar[pillar];
          if (pillarAlerts.length === 0) return null;
          
          const colors = pillarColors[pillar];
          
            return (
            <div key={pillar} className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-semibold ${colors.text}`}>
                  {pillarLabels[pillar]} ({pillarAlerts.length})
                </h4>
        </div>
              <div className="space-y-2">
                {pillarAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
      </div>
    </div>
          );
        })}
  </div>
    </section>
  );
};

const AlertCard = ({ alert }: { alert: TrendAlert }) => {
  const severityColors = alert.severity === 'warning'
    ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-800' }
    : { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' };
  
  const directionIcon = alert.alertType.includes('lower') ? '↓' : '↑';
  const directionColor = alert.alertType.includes('lower') ? 'text-blue-600' : 'text-orange-600';

  return (
    <div className={`rounded-lg border ${severityColors.border} ${severityColors.bg} p-3`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className={`font-semibold ${severityColors.text}`}>{alert.metricLabel}</p>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${severityColors.badge}`}>
              {alert.severity === 'warning' ? '⚠️ Warning' : '⚠️ Caution'}
            </span>
          </div>
          <p className={`text-sm ${severityColors.text} mb-2`}>{alert.message}</p>
          {alert.daysToEdge && (
            <p className="text-xs text-slate-600">
              Estimated <span className="font-semibold">{alert.daysToEdge} days</span> until out of range if trend continues
            </p>
          )}
        </div>
        <div className="ml-4 flex flex-col items-end">
          <span className={`inline-flex items-center rounded-lg px-2 py-1 text-sm font-semibold ${directionColor} bg-white border border-slate-200`}>
            <span className="mr-1">{directionIcon}</span>
            {alert.currentValue.toFixed(1)} {alert.unit}
              </span>
          <p className="text-xs text-slate-500 mt-1">
            Range: {alert.referenceRange.min.toFixed(1)} - {alert.referenceRange.max.toFixed(1)}
          </p>
          </div>
        </div>
      </div>
      );
};

const StatCard = ({
  title,
  value,
  subtitle,
  tone = "default",
  trendLabel,
}: {
  title: string;
  value: string;
  subtitle?: string;
  trendLabel?: string;
  tone?: "default" | "alert";
}) => {
  const toneClasses =
    tone === "alert"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-white text-slate-900";

      return (
    <article className={`rounded-3xl border px-5 py-4 shadow-sm ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      {trendLabel ? <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-400">{trendLabel}</p> : null}
    </article>
  );
};

const MedicationCard = ({
  medication,
}: {
  medication: { name: string; dosage: string; description: string; date: string };
}) => (
  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <h4 className="text-base font-semibold text-slate-900">{medication.name}</h4>
        <p className="mt-1 text-sm font-medium text-slate-700">{medication.dosage}</p>
        <p className="mt-2 text-xs text-slate-600">{medication.description}</p>
        </div>
      <div className="flex-shrink-0">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          Active
            </span>
          </div>
        </div>
    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
      <span className="uppercase tracking-[0.3em]">Started</span>
      <span>{medication.date}</span>
                </div>
  </article>
);

const GeneticMarkerCard = ({ marker }: { marker: GeneticMarker }) => {
  const getExplanation = (gene: string) => {
    switch (gene) {
      case "APOE":
        return "Apolipoprotein E gene involved in cholesterol metabolism. Variants are associated with cardiovascular disease risk and Alzheimer's disease susceptibility.";
      case "MTHFR":
        return "Methylenetetrahydrofolate reductase gene involved in folate (vitamin B9) metabolism. Variants can affect how the body processes folic acid and related compounds.";
      case "CYP2D6":
        return "Cytochrome P450 2D6 enzyme gene involved in drug metabolism. Variants affect how the body processes many medications, influencing drug efficacy and dosing requirements.";
    default:
        return "Genetic variant with potential clinical significance.";
  }
};

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{marker.gene}</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{marker.variant}</p>
        <p className="mt-1 text-sm text-slate-500">{marker.status}</p>
      </div>
      <div className="mt-4">
        <p className="text-sm leading-relaxed text-slate-700">{getExplanation(marker.gene)}</p>
    </div>
      {marker.relatedLabs?.length || marker.relatedMedications?.length ? (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
          {marker.relatedLabs?.length ? (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Related Labs: <span className="ml-2 normal-case text-slate-500">{marker.relatedLabs.join(", ")}</span>
            </p>
      ) : null}
          {marker.relatedMedications?.length ? (
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Medications: <span className="ml-2 normal-case text-slate-500">{marker.relatedMedications.join(", ")}</span>
            </p>
      ) : null}
    </div>
      ) : null}
  </article>
);
};
