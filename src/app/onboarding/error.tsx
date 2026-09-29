"use client";

import { RouteError } from "@/components/app/RouteError";

export default function OnboardingError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError retry={retry} />;
}
