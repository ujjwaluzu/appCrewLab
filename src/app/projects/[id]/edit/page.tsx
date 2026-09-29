import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/AppShell";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { getAuthState, requireResolvedAuthState } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profile";
import { getProjectById } from "@/lib/projects";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: PageProps) {
  const auth = requireResolvedAuthState(await getAuthState());
  if (auth.status === "onboarding-incomplete") redirect("/onboarding");
  const profile = await getCurrentUserProfile(auth.user.id);
  const { id } = await params;
  const result = await getProjectById(id);
  if (!result.project && !result.error) notFound();

  if (result.error) {
    return <AppShell profile={profile} active="projects"><div className="project-empty-state"><h1>We couldn&apos;t load this project.</h1><p>Please try again.</p><Link href={`/projects/${id}/edit`} className="secondary-button mt-5">Try again</Link></div></AppShell>;
  }

  const project = result.project!;
  if (project.owner_id !== auth.user.id) redirect(`/projects/${project.id}`);

  return (
    <AppShell profile={profile} active="projects">
      <div className="workspace-page mx-auto max-w-3xl">
        <Link href={`/projects/${project.id}`} className="project-back-link">← Back to project</Link>
        <header className="mt-7 mb-8"><p className="workspace-eyebrow">Your project</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Edit project</h1><p className="workspace-lede mt-3">Keep the details true to what you’re building.</p></header>
        <ProjectForm project={project} />
      </div>
    </AppShell>
  );
}
