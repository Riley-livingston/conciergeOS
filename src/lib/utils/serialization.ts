import {
  Patient,
  SerializedPatient,
  SerializedTimelineEntry,
  TimelineEntry,
  LabResult,
  SerializedLabResult,
  WearableData,
  SerializedWearableData,
  EHREvent,
  SerializedEHREvent,
  GeneticMarker,
} from '../types/patient';

const serializeLab = (lab: LabResult): SerializedLabResult => ({
  ...lab,
  timestamp: lab.timestamp.toISOString(),
});

const serializeWearable = (wearable: WearableData): SerializedWearableData => ({
  ...wearable,
  timestamp: wearable.timestamp.toISOString(),
});

const serializeEHR = (event: EHREvent): SerializedEHREvent => ({
  ...event,
  timestamp: event.timestamp.toISOString(),
});

export const serializePatient = (patient: Patient): SerializedPatient => ({
  ...patient,
  dateOfBirth: patient.dateOfBirth.toISOString(),
  labs: patient.labs.map(serializeLab),
  wearables: patient.wearables.map(serializeWearable),
  ehrEvents: patient.ehrEvents.map(serializeEHR),
});

export const serializeTimeline = (entries: TimelineEntry[]): SerializedTimelineEntry[] =>
  entries.map((entry): SerializedTimelineEntry => {
    const base = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      type: entry.type,
      category: entry.category,
      title: entry.title,
      isOutOfRange: entry.isOutOfRange,
    };

    if (entry.type === 'lab') {
      return {
        ...base,
        data: serializeLab(entry.data as LabResult),
      };
    }
    if (entry.type === 'wearable') {
      return {
        ...base,
        data: serializeWearable(entry.data as WearableData),
      };
    }
    if (entry.type === 'ehr') {
      return {
        ...base,
        data: serializeEHR(entry.data as EHREvent),
      };
    }
    // genetic
    return {
      ...base,
      data: entry.data as GeneticMarker,
    };
  });

