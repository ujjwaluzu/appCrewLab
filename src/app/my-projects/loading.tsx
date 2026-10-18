import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoadingMyProjects() {
  return <main className="route-loading" aria-busy="true"><LoadingSpinner label="Loading your projects" /></main>;
}
