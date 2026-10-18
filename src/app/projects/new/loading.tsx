import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoadingNewProject() {
  return <main className="route-loading" aria-busy="true"><LoadingSpinner label="Loading the new project form" /></main>;
}
