import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoadingApplications() {
  return <main className="route-loading" aria-busy="true"><LoadingSpinner label="Loading applications" /></main>;
}
