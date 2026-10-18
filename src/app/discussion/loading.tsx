import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoadingDiscussions() {
  return <main className="route-loading" aria-busy="true"><LoadingSpinner label="Loading discussions" /></main>;
}
