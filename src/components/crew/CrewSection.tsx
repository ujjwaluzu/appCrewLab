import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import type { CrewMember } from "@/lib/crew";
import { RemoveCrewMemberControl } from "@/components/crew/CrewControls";

export function CrewSection({ members, isOwner, projectId }: { members: CrewMember[]; isOwner: boolean; projectId: string }) {
  return (
    <section className="project-detail-section" aria-labelledby="project-crew-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="workspace-eyebrow">Building together</p><h2 id="project-crew-heading" className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#26362c]">Crew</h2></div>
        <p className="text-sm text-[#69766e]">{members.length} {members.length === 1 ? "builder" : "builders"}{members.length >= 10 ? " · Full" : ""}</p>
      </div>
      {members.length === 1 ? <p className="mt-2 text-sm text-[#69766e]">You&apos;re the first builder here. Make your project discoverable to find the right people.</p> : null}
      <ul className="crew-member-list mt-5">
        {members.map((member) => {
          const name = member.display_name || member.username || "CrewLab builder";
          return <li className="crew-member-card" key={member.id}>
            {member.username ? <Link href={`/u/${encodeURIComponent(member.username)}`} aria-label={`View ${name}'s profile`}><Avatar name={name} username={member.username} size="md" /></Link> : <Avatar name={name} size="md" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="truncate font-semibold text-[#26362c]">{member.username ? <Link href={`/u/${encodeURIComponent(member.username)}`} className="crew-profile-link">{name}</Link> : name}</p><span className={`crew-role-badge ${member.is_owner ? "crew-role-owner" : ""}`}>{member.is_owner ? "Owner" : "Member"}</span></div>
              <p className="mt-0.5 truncate text-sm text-[#7a7466]">{member.username ? <Link href={`/u/${encodeURIComponent(member.username)}`} className="crew-profile-link">@{member.username}</Link> : "@builder"}</p>
              {member.skills.length ? <div className="mt-2 flex flex-wrap gap-1.5">{member.skills.slice(0, 3).map((skill) => <span key={skill.id} className="project-skill-chip">{skill.name}</span>)}</div> : null}
              {isOwner && !member.is_owner ? <RemoveCrewMemberControl projectId={projectId} userId={member.id} displayName={name} /> : null}
            </div>
          </li>;
        })}
      </ul>
    </section>
  );
}
