import { skillCategories } from "@/data/skills";

export function ProjectFilters({ query, skillSlug }: { query: string; skillSlug: string }) {
  const skills = skillCategories.flatMap((category) => category.skills).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <form action="/projects" className="project-filters">
      <label className="min-w-0 flex-1">
        <span className="sr-only">Search projects</span>
        <input name="q" type="search" className="form-input" placeholder="Search projects..." defaultValue={query} />
      </label>
      <label>
        <span className="sr-only">Filter by skill</span>
        <select name="skill" className="form-input project-filter-select" defaultValue={skillSlug}>
          <option value="">All skills</option>
          {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
        </select>
      </label>
      <button className="secondary-button" type="submit">Search</button>
    </form>
  );
}
