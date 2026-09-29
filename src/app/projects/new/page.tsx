import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");
  const profile = await getCurrentUserProfile(auth.user.id);

  return (
    <AppShell profile={profile} active="projects">
      <div className="workspace-page mx-auto max-w-3xl">
        <Link href="/projects" className="project-back-link">← All projects</Link>
        <header className="mt-7 mb-8">
          <p className="workspace-eyebrow">Start with an idea</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Create a project</h1>
          <p className="workspace-lede mt-3">Bring your idea to life.</p>
        </header>
        <ProjectForm />
      </div>
    </AppShell>
  );
}
