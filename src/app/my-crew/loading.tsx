import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoadingMyCrew() {
  return <main className="route-loading" aria-busy="true"><LoadingSpinner label="Loading your crew" /></main>;
}
