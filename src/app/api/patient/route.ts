import { NextResponse } from 'next/server';
import { generateSyntheticPatient, generateTimeline } from '@/lib/data/syntheticData';
import { serializePatient, serializeTimeline } from '@/lib/utils/serialization';

export async function GET() {
  try {
    const patient = generateSyntheticPatient();
    const timeline = generateTimeline(patient);

    return NextResponse.json({
      patient: serializePatient(patient),
      timeline: serializeTimeline(timeline),
    });
  } catch (error) {
    console.error('Error generating patient data:', error);
    return NextResponse.json(
      { error: 'Failed to generate patient data' },
      { status: 500 }
    );
  }
}

