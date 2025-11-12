import { TrendAlert, HealthPillar } from '../types/patient';

interface TrendPoint {
  timestamp: Date;
  value: number;
  normalizedValue: number;
}

interface NormalizedPoint {
  id: string;
  timestamp: string;
  label: string;
  category: 'clinicalLabs' | 'vitals' | 'wearables';
  normalizedValue: number;
  actualValue: number;
  unit?: string;
  referenceRange: {
    min: number;
    max: number;
  };
}

// Map metrics to health pillars
const METRIC_TO_PILLAR: Record<string, HealthPillar> = {
  // Nutrition
  'Glucose': 'nutrition',
  'Fasting Glucose': 'nutrition',
  'HbA1c': 'nutrition',
  'Weight': 'nutrition',
  'Vitamin D (25-OH)': 'nutrition',
  'B12': 'nutrition',
  'Ferritin': 'nutrition',
  'Omega-3 Index': 'nutrition',
  'Total Cholesterol': 'nutrition',
  'LDL Cholesterol': 'nutrition',
  'HDL Cholesterol': 'nutrition',
  'Triglycerides': 'nutrition',
  
  // Exercise
  'Heart Rate': 'exercise',
  'HRV': 'exercise', // Also stress, but primarily exercise/recovery
  
  // Sleep
  'Sleep': 'sleep',
  
  // Stress Management
  'Blood Pressure': 'stress',
  'Cortisol AM': 'stress',
  'Cortisol PM': 'stress',
  
  // Spiritual health (inferred from overall wellness markers)
  // Will use HRV, Sleep quality, and stress markers as proxies
};

// Get health pillar for a metric
function getHealthPillar(metricLabel: string): HealthPillar {
  return METRIC_TO_PILLAR[metricLabel] || 'nutrition';
}

// Get recommendation based on pillar and trend
function getRecommendation(
  pillar: HealthPillar,
  metricLabel: string,
  alertType: TrendAlert['alertType']
): string {
  const isDeclining = alertType === 'downtrend' || alertType === 'approaching_lower';
  const isRising = alertType === 'uptrend' || alertType === 'approaching_upper';
  
  switch (pillar) {
    case 'nutrition':
      if (isDeclining && (metricLabel.includes('Vitamin') || metricLabel.includes('B12') || metricLabel.includes('Ferritin'))) {
        return 'Consider nutritional supplementation or dietary adjustments';
      }
      if (isRising && metricLabel.includes('Glucose')) {
        return 'Review dietary patterns and meal timing';
      }
      if (isRising && metricLabel.includes('Cholesterol')) {
        return 'Evaluate dietary fat intake and sources';
      }
      return 'Review nutritional intake and consider dietary modifications';
      
    case 'exercise':
      if (isDeclining && metricLabel === 'HRV') {
        return 'Consider reducing training intensity or increasing recovery time';
      }
      if (isRising && metricLabel === 'Heart Rate') {
        return 'Monitor exercise intensity and ensure adequate recovery';
      }
      return 'Evaluate exercise routine and recovery strategies';
      
    case 'sleep':
      if (isDeclining) {
        return 'Review sleep hygiene, bedtime routine, and sleep environment';
      }
      return 'Optimize sleep duration and quality';
      
    case 'stress':
      if (isRising) {
        return 'Implement stress management techniques: meditation, breathing exercises, or lifestyle adjustments';
      }
      return 'Focus on stress reduction and recovery strategies';
      
    case 'spiritual':
      return 'Consider holistic wellness practices and work-life balance';
      
    default:
      return 'Monitor closely and consider lifestyle modifications';
  }
}

// Calculate linear trend from data points
function calculateLinearTrend(points: TrendPoint[]): { slope: number; r2: number } {
  if (points.length < 2) return { slope: 0, r2: 0 };
  
  const n = points.length;
  const xValues = points.map((_, i) => i);
  const yValues = points.map(p => p.value);
  
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calculate R² for trend strength
  const yMean = sumY / n;
  const ssRes = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + (sumY / n - slope * sumX / n);
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  
  return { slope, r2 };
}

// Detect trends in normalized points
export function detectTrends(
  points: NormalizedPoint[],
  minDataPoints: number = 5
): TrendAlert[] {
  const alerts: TrendAlert[] = [];
  
  // Group points by metric
  const byMetric = new Map<string, TrendPoint[]>();
  points.forEach(point => {
    if (!byMetric.has(point.label)) {
      byMetric.set(point.label, []);
    }
    byMetric.get(point.label)!.push({
      timestamp: new Date(point.timestamp),
      value: point.actualValue,
      normalizedValue: point.normalizedValue,
    });
  });
  
  byMetric.forEach((dataPoints, metricLabel) => {
    if (dataPoints.length < minDataPoints) return;
    
    // Sort by timestamp
    dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Get reference range from first point
    const firstPoint = points.find(p => p.label === metricLabel);
    if (!firstPoint) return;
    
    const { min, max } = firstPoint.referenceRange;
    const range = max - min;
    if (range === 0) return; // Skip if no range
    
    // Calculate trend using linear regression on recent points
    // For daily data, use last 30-60 days; for less frequent data, use more points
    const isDailyData = dataPoints.length > 30 && 
      (dataPoints[dataPoints.length - 1].timestamp.getTime() - dataPoints[dataPoints.length - 30].timestamp.getTime()) < (30 * 24 * 60 * 60 * 1000);
    
    const windowSize = isDailyData ? Math.min(60, dataPoints.length) : Math.min(14, dataPoints.length);
    const recentPoints = dataPoints.slice(-windowSize);
    const trend = calculateLinearTrend(recentPoints);
    
    // Calculate slope relative to the value range for better sensitivity
    const valueRange = Math.max(...recentPoints.map(p => p.value)) - Math.min(...recentPoints.map(p => p.value));
    const relativeSlope = valueRange > 0 ? Math.abs(trend.slope) / valueRange : 0;
    
    // More lenient thresholds: R² > 0.15 or relative slope > 0.03 (3% of value range)
    // This catches gradual long-term trends
    // For metrics close to edges, be even more lenient
    const latestValue = recentPoints[recentPoints.length - 1].value;
    const distanceFromMin = latestValue - min;
    const distanceFromMax = max - latestValue;
    const percentFromMin = (distanceFromMin / range) * 100;
    const percentFromMax = (distanceFromMax / range) * 100;
    const isCloseToEdge = percentFromMin <= 35 || percentFromMax <= 35;
    
    // If close to edge, use even more lenient thresholds
    const minR2 = isCloseToEdge ? 0.1 : 0.15;
    const minRelativeSlope = isCloseToEdge ? 0.02 : 0.03;
    
    if (trend.r2 < minR2 && relativeSlope < minRelativeSlope) return;
    
    // Alert thresholds - more sensitive to catch trends earlier
    const warningThreshold = 15; // Within 15% of edge
    const cautionThreshold = 30; // Within 30% of edge
    
    const healthPillar = getHealthPillar(metricLabel);
    const category = firstPoint.category === 'clinicalLabs' ? 'lab' : 
                    firstPoint.category === 'vitals' ? 'vital' : 'wearable';
    
    // Check for downtrend approaching lower limit
    // Also check if we're already close to the edge even without strong trend
    const isCloseToLowerEdge = percentFromMin <= cautionThreshold;
    const hasDecliningTrend = trend.slope < 0;
    
    if (hasDecliningTrend && isCloseToLowerEdge) {
      const severity = percentFromMin <= warningThreshold ? 'warning' : 'caution';
      
      // Estimate days to edge (assuming trend continues)
      // Convert slope to per-day change (slope is per data point)
      const avgDaysBetweenPoints = (recentPoints[recentPoints.length - 1].timestamp.getTime() - 
                                   recentPoints[0].timestamp.getTime()) / (1000 * 60 * 60 * 24) / (recentPoints.length - 1);
      const dailySlope = trend.slope / (avgDaysBetweenPoints || 1);
      const daysToEdge = dailySlope !== 0 && distanceFromMin > 0
        ? Math.abs(distanceFromMin / dailySlope)
        : undefined;
      
      alerts.push({
        id: `alert-${metricLabel}-${Date.now()}-lower`,
        metricLabel,
        category,
        healthPillar,
        alertType: 'approaching_lower',
        severity,
        currentValue: latestValue,
        unit: firstPoint.unit || '',
        referenceRange: { min, max },
        trendDirection: 'declining',
        dataPoints: recentPoints.map(p => ({
          timestamp: p.timestamp.toISOString(),
          value: p.value,
        })),
        daysToEdge: daysToEdge ? Math.round(daysToEdge) : undefined,
        message: `${metricLabel} trending down - ${severity === 'warning' ? 'near' : 'approaching'} lower limit (${latestValue.toFixed(1)} ${firstPoint.unit || ''})`,
        recommendation: getRecommendation(healthPillar, metricLabel, 'approaching_lower'),
      });
    }
    
    // Check for uptrend approaching upper limit
    // Also check if we're already close to the edge even without strong trend
    const isCloseToUpperEdge = percentFromMax <= cautionThreshold;
    const hasRisingTrend = trend.slope > 0;
    
    if (hasRisingTrend && isCloseToUpperEdge) {
      const severity = percentFromMax <= warningThreshold ? 'warning' : 'caution';
      
      const avgDaysBetweenPoints = (recentPoints[recentPoints.length - 1].timestamp.getTime() - 
                                   recentPoints[0].timestamp.getTime()) / (1000 * 60 * 60 * 24) / (recentPoints.length - 1);
      const dailySlope = trend.slope / (avgDaysBetweenPoints || 1);
      const daysToEdge = dailySlope !== 0 && distanceFromMax > 0
        ? Math.abs(distanceFromMax / dailySlope)
        : undefined;
      
      alerts.push({
        id: `alert-${metricLabel}-${Date.now()}-upper`,
        metricLabel,
        category,
        healthPillar,
        alertType: 'approaching_upper',
        severity,
        currentValue: latestValue,
        unit: firstPoint.unit || '',
        referenceRange: { min, max },
        trendDirection: 'declining', // Health declining even though value increasing
        dataPoints: recentPoints.map(p => ({
          timestamp: p.timestamp.toISOString(),
          value: p.value,
        })),
        daysToEdge: daysToEdge ? Math.round(daysToEdge) : undefined,
        message: `${metricLabel} trending up - ${severity === 'warning' ? 'near' : 'approaching'} upper limit (${latestValue.toFixed(1)} ${firstPoint.unit || ''})`,
        recommendation: getRecommendation(healthPillar, metricLabel, 'approaching_upper'),
      });
    }
  });
  
  // Sort alerts by severity (warnings first) then by days to edge
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'warning' ? -1 : 1;
    }
    if (a.daysToEdge !== undefined && b.daysToEdge !== undefined) {
      return a.daysToEdge - b.daysToEdge;
    }
    return 0;
  });
}

