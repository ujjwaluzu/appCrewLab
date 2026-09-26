"use client";

import { useMemo, useState } from "react";

import { skillCategories, type Skill } from "@/data/skills";

export const MAX_SKILLS = 8;

export type SelectedSkill = {
  id?: string;
  slug: string;
  name: string;
};

export function SkillPicker({
  selectedSkills,
  onChange,
}: {
  selectedSkills: SelectedSkill[];
  onChange: (skills: SelectedSkill[]) => void;
}) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["development"]);
  const [skillQuery, setSkillQuery] = useState("");
  const [skillMessage, setSkillMessage] = useState("");
  const query = skillQuery.trim().toLowerCase();

  const visibleCategories = useMemo(() => {
    if (!query) return skillCategories;

    return skillCategories
      .map((category) => ({ ...category, skills: category.skills.filter((skill) => skill.name.toLowerCase().includes(query)) }))
      .filter((category) => category.skills.length > 0);
  }, [query]);

  function isSelected(skillId: string) {
    return selectedSkills.some((skill) => skill.slug === skillId);
  }

  function toggleSkill(skill: Skill) {
    setSkillMessage("");

    if (isSelected(skill.id)) {
      onChange(selectedSkills.filter((selectedSkill) => selectedSkill.slug !== skill.id));
      return;
    }

    if (selectedSkills.length >= MAX_SKILLS) {
      setSkillMessage(`You can select up to ${MAX_SKILLS} skills.`);
      return;
    }

    onChange([...selectedSkills, { slug: skill.id, name: skill.name }]);
  }

  function removeSkill(slug: string) {
    onChange(selectedSkills.filter((skill) => skill.slug !== slug));
    setSkillMessage("");
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]);
  }

  function renderSkillButton(skill: Skill, categoryName: string) {
    const active = isSelected(skill.id);

    return (
      <button
        key={skill.id}
        type="button"
        aria-pressed={active}
        onClick={() => toggleSkill(skill)}
        className={`group flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${active ? "border-[#17251f] bg-[#17251f] text-white shadow-[0_8px_18px_rgba(23,37,31,0.12)]" : "border-[#17251f]/10 bg-white text-[#4e5d53] hover:border-[#17251f]/30 hover:bg-[#f8faf2]"}`}
      >
        <span className="min-w-0">
          <span className="block truncate">{skill.name}</span>
          {query ? <span className={`mt-1 block truncate text-[0.68rem] font-medium ${active ? "text-[#cbd9a0]" : "text-[#8a958d]"}`}>{categoryName}</span> : null}
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition ${active ? "border-[#e7ff70] bg-[#e7ff70] font-bold text-[#17251f]" : "border-[#17251f]/15 text-transparent group-hover:border-[#17251f]/30"}`} aria-hidden>
          {active ? "✓" : ""}
        </span>
      </button>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-[#17251f]/10 bg-[#f7f8f1] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#738178]">Your skills</p>
          <span className="text-xs text-[#8a958d]">{selectedSkills.length} / {MAX_SKILLS} selected</span>
        </div>
        {selectedSkills.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <span key={skill.slug} className="inline-flex items-center gap-2 rounded-full bg-[#17251f] px-3 py-2 text-xs font-semibold text-white">
                {skill.name}
                <button type="button" onClick={() => removeSkill(skill.slug)} aria-label={`Remove ${skill.name}`} className="flex h-4 w-4 items-center justify-center rounded-full text-[#e7ff70] transition hover:bg-white/15">&times;</button>
              </span>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-[#8a958d]">Your selected skills will appear here.</p>}
      </div>

      <div className="relative mt-5">
        <label htmlFor="skill-search" className="sr-only">Search skills</label>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#879188]" aria-hidden>⌕</span>
        <input id="skill-search" type="search" value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder="Search skills..." className="form-input pl-11 pr-11" />
        {skillQuery ? <button type="button" onClick={() => setSkillQuery("")} aria-label="Clear skill search" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-lg text-[#718077] hover:bg-[#17251f]/5">&times;</button> : null}
      </div>

      {skillMessage ? <p className="mt-3 text-sm font-medium text-[#9e4639]" role="status">{skillMessage}</p> : null}

      <div className="mt-5 space-y-3">
        {query ? (
          visibleCategories.length ? visibleCategories.map((category) => (
            <div key={category.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a958d]">{category.name}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{category.skills.map((skill) => renderSkillButton(skill, category.name))}</div>
            </div>
          )) : <div className="rounded-2xl border border-dashed border-[#17251f]/15 px-5 py-8 text-center text-sm text-[#7b887f]">No skills found. Try a broader search.</div>
        ) : skillCategories.map((category) => {
          const isExpanded = expandedCategories.includes(category.id);

          return (
            <div key={category.id} className="overflow-hidden rounded-2xl border border-[#17251f]/10 bg-white">
              <button type="button" aria-expanded={isExpanded} aria-controls={`skills-${category.id}`} onClick={() => toggleCategory(category.id)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#f8faf2] sm:px-5">
                <span className="text-sm font-semibold text-[#29392f]">{category.name}</span>
                <span className="flex items-center gap-3 text-xs text-[#8a958d]"><span>{category.skills.length} skills</span><span className={`text-lg transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden>⌄</span></span>
              </button>
              {isExpanded ? <div id={`skills-${category.id}`} className="border-t border-[#17251f]/10 bg-[#fcfcf8] p-3 sm:grid sm:grid-cols-2 sm:gap-2 sm:p-4">{category.skills.map((skill) => renderSkillButton(skill, category.name))}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
