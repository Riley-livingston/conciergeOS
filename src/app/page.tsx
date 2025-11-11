import { generateSyntheticPatient, generateTimeline } from "@/lib/data/syntheticData";
import { PatientDashboard } from "./components/PatientDashboard";
import { serializePatient, serializeTimeline } from "@/lib/utils/serialization";

export default function Home() {
  const patient = generateSyntheticPatient();
  const timeline = generateTimeline(patient);

  return (
    <PatientDashboard
      patient={serializePatient(patient)}
      timeline={serializeTimeline(timeline)}
    />
  );
}
