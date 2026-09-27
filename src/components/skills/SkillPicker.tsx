"use client";

import { useMemo, useState } from "react";

import { skillCategories, type Skill } from "@/data/skills";

export const MAX_SKILLS = 8;

export type SelectedSkill = {
  id?: string;
  slug: string;
  name: string;
};

function CheckIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5" fill="none"><path d="m3 8 3.1 3.1L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none"><circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" strokeWidth="1.6" /><path d="m13.2 13.2 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return <svg viewBox="0 0 16 16" aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none"><path d="m3.5 6 4.5 4 4.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

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
      setSkillMessage(`Choose up to ${MAX_SKILLS} skills.`);
      return;
    }
    onChange([...selectedSkills, { slug: skill.id, name: skill.name }]);
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
        className={`skill-option ${active ? "is-selected" : ""}`}
      >
        <span className="min-w-0">
          <span className="block truncate">{skill.name}</span>
          {query ? <span className="skill-option-category">{categoryName}</span> : null}
        </span>
        <span className="skill-option-check" aria-hidden="true">{active ? <CheckIcon /> : null}</span>
      </button>
    );
  }

  return (
    <div className="skill-picker">
      <div className="skill-selection">
        <div className="flex items-center justify-between gap-3">
          <p className="skill-section-label">Selected skills</p>
          <span className="skill-count">{selectedSkills.length} / {MAX_SKILLS}</span>
        </div>
        {selectedSkills.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <span key={skill.slug} className="skill-chip">
                {skill.name}
                <button type="button" onClick={() => onChange(selectedSkills.filter((item) => item.slug !== skill.slug))} aria-label={`Remove ${skill.name}`} className="skill-chip-remove">×</button>
              </span>
            ))}
          </div>
        ) : <p className="mt-2 text-sm text-[#7a7466]">Pick the skills you want your future crew to see.</p>}
      </div>

      <div className="skill-search-wrap">
        <label htmlFor="skill-search" className="sr-only">Search skills</label>
        <span className="skill-search-icon" aria-hidden="true"><SearchIcon /></span>
        <input id="skill-search" type="search" value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder="Search skills" className="form-input skill-search-input" />
        {skillQuery ? <button type="button" onClick={() => setSkillQuery("")} aria-label="Clear skill search" className="skill-search-clear">×</button> : null}
      </div>

      {skillMessage ? <p className="mt-3 text-sm font-semibold text-[#b42318]" role="status">{skillMessage}</p> : null}

      <div className="skill-categories">
        {query ? (
          visibleCategories.length ? visibleCategories.map((category) => (
            <section key={category.id} className="skill-search-group">
              <h3 className="skill-section-label mb-2">{category.name}</h3>
              <div className="skill-options-grid">{category.skills.map((skill) => renderSkillButton(skill, category.name))}</div>
            </section>
          )) : <div className="skill-empty">No skills found. Try a broader search.</div>
        ) : skillCategories.map((category) => {
          const isExpanded = expandedCategories.includes(category.id);
          const panelId = `skills-${category.id}`;

          return (
            <section key={category.id} className="skill-category">
              <button type="button" aria-expanded={isExpanded} aria-controls={panelId} onClick={() => toggleCategory(category.id)} className="skill-category-toggle">
                <span className="text-sm font-bold">{category.name}</span>
                <span className="flex items-center gap-2 text-xs"><span>{category.skills.length}</span><ChevronIcon open={isExpanded} /></span>
              </button>
              {isExpanded ? <div id={panelId} className="skill-options-grid border-t border-black/10 p-2.5 sm:p-3">{category.skills.map((skill) => renderSkillButton(skill, category.name))}</div> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
