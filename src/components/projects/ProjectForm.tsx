"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SkillPicker, type SelectedSkill } from "@/components/skills/SkillPicker";
import { createClient } from "@/lib/supabase/browser";
import type { Project, ProjectStatus } from "@/lib/projects";

const statuses: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "building", label: "Building" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const [title, setTitle] = useState(project?.title ?? "");
  const [shortDescription, setShortDescription] = useState(project?.short_description ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "idea");
  const [skills, setSkills] = useState<SelectedSkill[]>(project?.skills.map(({ id, slug, name }) => ({ id, slug, name })) ?? []);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) return setError("Project names need at least 3 characters.");
    if (cleanTitle.length > 80) return setError("Keep the project name to 80 characters or fewer.");
    if (shortDescription.trim().length > 180) return setError("Keep the short description to 180 characters or fewer.");
    if (description.trim().length > 10000) return setError("Keep the description to 10,000 characters or fewer.");

    setIsSaving(true);
    try {
      const supabase = createClient();
      const args = {
        project_title: cleanTitle,
        project_short_description: shortDescription.trim(),
        project_description: description.trim(),
        project_status: status,
        skill_slugs: skills.map((skill) => skill.slug),
      };
      const { data, error: saveError } = project
        ? await supabase.rpc("update_project_with_skills", { target_project_id: project.id, ...args })
        : await supabase.rpc("create_project_with_skills", args);

      if (saveError || typeof data !== "string") {
        setError(project ? "We couldn't save your changes. Please try again." : "We couldn't create your project. Please try again.");
        return;
      }

      router.push(`/projects/${data}`);
      router.refresh();
    } catch {
      setError(project ? "We couldn't save your changes. Please try again." : "We couldn't create your project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="project-form-card">
      <div className="space-y-6">
        <div>
          <label className="form-label" htmlFor="project-title">Project name</label>
          <input id="project-title" className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={80} required placeholder="Build something cool" />
          <p className="mt-2 text-right text-xs text-[#8a958d]">{title.length}/80</p>
        </div>
        <div>
          <label className="form-label" htmlFor="project-short-description">Short description</label>
          <input id="project-short-description" className="form-input" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} maxLength={180} placeholder="A short explanation of your idea" />
          <p className="mt-2 text-right text-xs text-[#8a958d]">{shortDescription.length}/180</p>
        </div>
        <div>
          <label className="form-label" htmlFor="project-description">About the project</label>
          <textarea id="project-description" className="form-input min-h-44 resize-y" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} placeholder="What are you building, what problem does it solve, and what would you like to make?" />
        </div>
        <div>
          <h2 className="form-label">What skills would help build this?</h2>
          <SkillPicker selectedSkills={skills} onChange={setSkills} />
        </div>
        <div>
          <label className="form-label" htmlFor="project-status">Status</label>
          <select id="project-status" className="form-input" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
            {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </div>
      {error ? <p className="mt-6 rounded-xl border border-[#bd5d4d]/25 bg-[#fff3f0] px-4 py-3 text-sm text-[#9e4639]" role="alert">{error}</p> : null}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#17251f]/10 pt-6 sm:flex-row sm:justify-end">
        <Link href={project ? `/projects/${project.id}` : "/projects"} className="secondary-button text-center">Cancel</Link>
        <button type="submit" disabled={isSaving} className="primary-button disabled:cursor-wait disabled:opacity-70">{isSaving ? project ? "Saving..." : "Creating project..." : project ? "Save changes" : "Create project"}</button>
      </div>
    </form>
  );
}
