import { SerializedTimelineEntry, TimelineEntry, SerializedLabResult, LabResult } from '../types/patient';

type TimelineLike = TimelineEntry | SerializedTimelineEntry;

/**
 * Filter timeline entries to show only out-of-range values
 * This is the "Signal Through the Noise" feature
 */
export function filterOutOfRange<T extends TimelineLike>(entries: T[]): T[] {
  return entries.filter((entry) => {
    if (entry.type !== 'lab') return false;
    const lab = entry.data as LabResult | SerializedLabResult;
    return Boolean(lab.isOutOfRange) || Boolean(lab.isOutOfOptimal);
  });
}

/**
 * Filter timeline entries by type
 */
export function filterByType<T extends TimelineLike>(entries: T[], types: TimelineEntry['type'][]): T[] {
  return entries.filter((entry) => types.includes(entry.type));
}

/**
 * Filter timeline entries by date range
 */
export function filterByDateRange(entries: TimelineEntry[], startDate: Date, endDate: Date): TimelineEntry[] {
  return entries.filter((entry) => {
    const timestamp = entry.timestamp.getTime();
    return timestamp >= startDate.getTime() && timestamp <= endDate.getTime();
  });
}

