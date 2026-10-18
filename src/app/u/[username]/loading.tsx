import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoadingProfile() {
  return <main className="route-loading" aria-busy="true"><LoadingSpinner label="Loading profile" /></main>;
}
