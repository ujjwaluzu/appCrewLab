"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { SkillPicker, type SelectedSkill } from "@/components/skills/SkillPicker";
import { intents } from "@/data/intents";
import type { UserProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/browser";

export function ProfileEditor({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>(profile.skills.map((skill) => ({ id: skill.id, slug: skill.slug, name: skill.name })));
  const [selectedIntents, setSelectedIntents] = useState(profile.intents);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

  async function saveProfile() {
    setError("");
    const normalizedUsername = username.trim().toLowerCase();

    if (displayName.trim().length < 1 || displayName.trim().length > 80) return setError("Use a display name between 1 and 80 characters.");
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(normalizedUsername)) return setError("Your username should be 3-24 characters using letters, numbers, or underscores.");
    if (bio.length > 160) return setError("Keep your bio to 160 characters or fewer.");

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error: profileError } = await supabase.from("profiles").update({ display_name: displayName.trim(), username: normalizedUsername, bio: bio.trim() || null, intents: selectedIntents }).eq("id", profile.id);
      if (profileError) {
        setError(profileError.code === "23505"
          ? "That username is already taken."
          : profileError.code === "23514"
            ? "Check your name, username, bio, and interests, then try again."
            : "We could not save your profile yet. Please try again.");
        return;
      }

      const newSkillSlugs = selectedSkills.filter((skill) => !skill.id).map((skill) => skill.slug);
      let selectedSkillIds = selectedSkills.flatMap((skill) => skill.id ? [skill.id] : []);
      if (newSkillSlugs.length) {
        const { data: skillRows, error: skillError } = await supabase.from("skills").select("id, slug").in("slug", newSkillSlugs);
        if (skillError || skillRows?.length !== newSkillSlugs.length) {
          setError("We could not update your skills yet. Please try again.");
          return;
        }
        selectedSkillIds = [...selectedSkillIds, ...skillRows.map((skill) => skill.id)];
      }

      const { error: deleteError } = await supabase.from("profile_skills").delete().eq("profile_id", profile.id);
      if (deleteError) {
        setError("We could not update your skills yet. Please try again.");
        return;
      }
      if (selectedSkillIds.length) {
        const { error: insertError } = await supabase.from("profile_skills").insert([...new Set(selectedSkillIds)].map((skillId) => ({ profile_id: profile.id, skill_id: skillId })));
        if (insertError) {
          setError("We could not update your skills yet. Please try again.");
          return;
        }
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      setError("We could not save your profile yet. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEditing() {
    setDisplayName(profile.display_name);
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setSelectedSkills(profile.skills.map((skill) => ({ id: skill.id, slug: skill.slug, name: skill.name })));
    setSelectedIntents(profile.intents);
    setError("");
    setIsEditing(false);
  }

  if (!isEditing) {
    return <button type="button" onClick={() => setIsEditing(true)} className="primary-button">Edit profile <span aria-hidden>↗</span></button>;
  }

  return <div className="space-y-8 rounded-3xl border border-[#17251f]/10 bg-[#fcfcf8] p-5 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#738178]">Edit profile</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Make it feel like you.</h2></div><button type="button" onClick={cancelEditing} className="text-sm font-semibold text-[#69766e] hover:text-[#17251f]">Cancel</button></div><div className="space-y-5"><div><label htmlFor="profile-display-name" className="form-label">Display name</label><input id="profile-display-name" maxLength={80} className="form-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></div><div><label htmlFor="profile-username" className="form-label">Username</label><input id="profile-username" maxLength={24} className="form-input" value={username} onChange={(event) => setUsername(event.target.value)} /><p className="mt-2 text-xs text-[#8a958d]">3-24 characters - letters, numbers, and underscores</p></div><div><label htmlFor="profile-bio" className="form-label">Short bio</label><textarea id="profile-bio" className="form-input min-h-28 resize-none" maxLength={160} value={bio} onChange={(event) => setBio(event.target.value)} /><p className="mt-2 text-right text-xs text-[#8a958d]">{bio.length}/160</p></div></div><div><h3 className="text-sm font-semibold text-[#33433a]">Skills</h3><div className="mt-4"><SkillPicker selectedSkills={selectedSkills} onChange={setSelectedSkills} /></div></div><div><h3 className="text-sm font-semibold text-[#33433a]">What are you looking for?</h3><div className="mt-4 space-y-2">{intents.map((intent) => { const active = selectedIntents.includes(intent.id); return <button key={intent.id} type="button" aria-pressed={active} onClick={() => setSelectedIntents((current) => active ? current.filter((item) => item !== intent.id) : [...current, intent.id])} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${active ? "border-[#17251f] bg-[#f0f5df]" : "border-[#17251f]/10 bg-white hover:border-[#17251f]/30"}`}><span className="text-sm font-semibold text-[#29392f]">{intent.label}</span><span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${active ? "border-[#17251f] bg-[#17251f] text-[#e7ff70]" : "border-[#17251f]/20 text-transparent"}`} aria-hidden>✓</span></button>; })}</div></div>{error ? <p className="rounded-xl border border-[#bd5d4d]/25 bg-[#fff3f0] px-4 py-3 text-sm text-[#9e4639]" role="alert">{error}</p> : null}<div className="flex justify-end"><button type="button" onClick={saveProfile} disabled={isSaving} className="primary-button">{isSaving ? "Saving..." : "Save changes"}</button></div></div>;
}
