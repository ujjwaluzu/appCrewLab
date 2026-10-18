import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoadingProjects() {
  return <main className="route-loading" aria-busy="true"><LoadingSpinner label="Loading projects" /></main>;
}
