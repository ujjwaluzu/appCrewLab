import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoadingProject() {
  return <main className="route-loading" aria-busy="true"><LoadingSpinner label="Loading project" /></main>;
}
