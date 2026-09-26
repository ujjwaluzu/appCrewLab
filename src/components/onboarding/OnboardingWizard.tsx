"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Brand } from "@/components/Brand";
import { allSkills, skillCategories, type Skill, type SkillCategory } from "@/data/skills";
import { createClient } from "@/lib/supabase/browser";

const MAX_SKILLS = 8;
const catalogSkillIds = new Set(allSkills.map((skill) => skill.id));
const skillById = new Map(allSkills.map((skill) => [skill.id, skill]));

const intents = [
  ["idea", "I have an idea", "Turn a thought into something tangible."],
  ["join", "I want to join a project", "Find a direction that already has momentum."],
  ["collaborators", "I want to find collaborators", "Meet people who complement your strengths."],
  ["portfolio", "I want to build my portfolio", "Make work you are proud to show."],
] as const;

type Step = 1 | 2 | 3;
type LegacySkill = { id: string; slug: string; name: string };

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [legacySelectedSkills, setLegacySelectedSkills] = useState<LegacySkill[]>([]);
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["development"]);
  const [skillQuery, setSkillQuery] = useState("");
  const [skillMessage, setSkillMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedSkillCount = selectedSkills.length + legacySelectedSkills.length;
  const selectedSkillItems = [
    ...selectedSkills.map((id) => skillById.get(id)).filter((skill): skill is Skill => Boolean(skill)),
    ...legacySelectedSkills,
  ];

  const visibleCategories = useMemo(() => {
    const query = skillQuery.trim().toLowerCase();

    if (!query) {
      return skillCategories;
    }

    return skillCategories
      .map((category) => ({
        ...category,
        skills: category.skills.filter((skill) => skill.name.toLowerCase().includes(query)),
      }))
      .filter((category) => category.skills.length > 0);
  }, [skillQuery]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: userResult } = await supabase.auth.getUser();

        if (!userResult.user) {
          router.replace("/auth");
          return;
        }

        const [{ data: profile }, { data: profileSkillRows }] = await Promise.all([
          supabase.from("profiles").select("display_name, username, bio").eq("id", userResult.user.id).maybeSingle(),
          supabase.from("profile_skills").select("skill_id").eq("profile_id", userResult.user.id),
        ]);

        let savedSkills: LegacySkill[] = [];
        const savedSkillIds = (profileSkillRows ?? []).map((row) => row.skill_id).filter(Boolean);

        if (savedSkillIds.length) {
          const { data } = await supabase.from("skills").select("id, slug, name").in("id", savedSkillIds);
          savedSkills = data ?? [];
        }

        if (!isMounted) return;

        if (profile) {
          setDisplayName(profile.display_name ?? "");
          setUsername(profile.username ?? "");
          setBio(profile.bio ?? "");
        }

        setSelectedSkills(savedSkills.filter((skill) => catalogSkillIds.has(skill.slug)).map((skill) => skill.slug));
        setLegacySelectedSkills(savedSkills.filter((skill) => !catalogSkillIds.has(skill.slug)));
      } catch {
        if (isMounted) setError("We could not load your profile. Please refresh and try again.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, [router]);

  function toggleValue(value: string, values: string[], setValues: (next: string[]) => void) {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories((current) => current.includes(categoryId) ? current.filter((id) => id !== categoryId) : [...current, categoryId]);
  }

  function isSkillSelected(skillId: string) {
    return selectedSkills.includes(skillId) || legacySelectedSkills.some((skill) => skill.slug === skillId);
  }

  function toggleSkill(skill: Skill) {
    setError("");

    if (selectedSkills.includes(skill.id)) {
      setSelectedSkills((current) => current.filter((id) => id !== skill.id));
      setSkillMessage("");
      return;
    }

    const legacyMatch = legacySelectedSkills.find((item) => item.slug === skill.id);
    if (legacyMatch) {
      setLegacySelectedSkills((current) => current.filter((item) => item.id !== legacyMatch.id));
      setSkillMessage("");
      return;
    }

    if (selectedSkillCount >= MAX_SKILLS) {
      setSkillMessage(`You can select up to ${MAX_SKILLS} skills.`);
      return;
    }

    setSelectedSkills((current) => [...current, skill.id]);
    setSkillMessage("");
  }

  function removeSelectedSkill(skillId: string) {
    setSelectedSkills((current) => current.filter((id) => id !== skillId));
    setLegacySelectedSkills((current) => current.filter((skill) => skill.slug !== skillId));
    setSkillMessage("");
  }

  function continueFromBasics() {
    setError("");
    if (!displayName.trim()) {
      setError("Tell us what to call you.");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) {
      setError("Your username should be 3-24 characters using letters, numbers, or underscores.");
      return;
    }
    if (bio.length > 160) {
      setError("Keep your bio to 160 characters or fewer.");
      return;
    }
    setStep(2);
  }

  async function saveBasics() {
    const supabase = createClient();
    const { data: userResult } = await supabase.auth.getUser();
    if (!userResult.user) {
      router.replace("/auth");
      return null;
    }

    const { error: saveError } = await supabase.from("profiles").upsert(
      {
        id: userResult.user.id,
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim() || null,
        onboarding_completed: false,
      },
      { onConflict: "id" },
    );

    if (saveError) {
      if (saveError.code === "23505") setError("That username is already taken. Try another one.");
      else setError("We could not save your profile yet. Please try again.");
      return null;
    }

    return userResult.user.id;
  }

  async function persistSelectedSkills(profileId: string) {
    const supabase = createClient();
    let selectedSkillIds = legacySelectedSkills.map((skill) => skill.id);

    if (selectedSkills.length) {
      const { data: selectedSkillRows, error: skillError } = await supabase.from("skills").select("id, slug").in("slug", selectedSkills);
      if (skillError || selectedSkillRows?.length !== selectedSkills.length) {
        setError("Some skills are not available yet. Please refresh and try again.");
        return false;
      }
      selectedSkillIds = [...selectedSkillIds, ...selectedSkillRows.map((skill) => skill.id)];
    }

    const { error: deleteError } = await supabase.from("profile_skills").delete().eq("profile_id", profileId);
    if (deleteError) {
      setError("We could not update your skills yet. Please try again.");
      return false;
    }

    if (selectedSkillIds.length) {
      const { error: insertError } = await supabase.from("profile_skills").insert(selectedSkillIds.map((skillId) => ({ profile_id: profileId, skill_id: skillId })));
      if (insertError) {
        setError("We could not update your skills yet. Please try again.");
        return false;
      }
    }

    return true;
  }

  async function finishOnboarding() {
    setError("");
    if (!selectedSkillCount) {
      setError("Choose at least one skill so people know what you enjoy building.");
      return;
    }
    if (!selectedIntents.length) {
      setError("Choose at least one reason you are here.");
      return;
    }

    setIsSaving(true);
    try {
      const profileId = await saveBasics();
      if (!profileId) return;
      if (!(await persistSelectedSkills(profileId))) return;

      const { error: profileError } = await createClient()
        .from("profiles")
        .update({ onboarding_completed: true, intents: selectedIntents })
        .eq("id", profileId);
      if (profileError) {
        setError("We could not finish your profile yet. Please try again.");
        return;
      }

      router.replace("/home");
      router.refresh();
    } catch {
      setError("We could not finish setting up your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function continueFromSkills() {
    setError("");
    if (!selectedSkillCount) {
      setError("Choose at least one skill so people know what you enjoy building.");
      return;
    }
    setIsSaving(true);
    try {
      const profileId = await saveBasics();
      if (!profileId) return;
      if (await persistSelectedSkills(profileId)) setStep(3);
    } catch {
      setError("We could not save your profile yet. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function renderSkillButton(skill: Skill, categoryName: string) {
    const active = isSkillSelected(skill.id);

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
          {skillQuery ? <span className={`mt-1 block truncate text-[0.68rem] font-medium ${active ? "text-[#cbd9a0]" : "text-[#8a958d]"}`}>{categoryName}</span> : null}
        </span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition ${active ? "border-[#e7ff70] bg-[#e7ff70] font-bold text-[#17251f]" : "border-[#17251f]/15 text-transparent group-hover:border-[#17251f]/30"}`} aria-hidden>{active ? "✓" : ""}</span>
      </button>
    );
  }

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#66736b]">Checking your session...</div>;
  }

  return (
    <main className="min-h-screen bg-[#f4f5ef] px-5 py-5 text-[#17251f] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[#17251f]/10 bg-[#fcfcf8] shadow-[0_24px_80px_rgba(23,37,31,0.09)] lg:min-h-[calc(100vh-4rem)] lg:flex-row">
        <aside className="flex flex-col justify-between bg-[#17251f] p-7 text-[#f8faef] sm:p-10 lg:w-[36%]">
          <div>
            <Brand surface="light" />
            <div className="mt-16 max-w-xs sm:mt-24">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7ff70]">Your starting point</p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1] tracking-[-0.06em] sm:text-5xl">Let&apos;s make your profile feel like you.</h1>
              <p className="mt-6 text-base leading-7 text-[#d6ded5]">A few useful details help the right projects and people find you.</p>
            </div>
          </div>
          <div className="mt-12">
            <div className="mb-4 flex justify-between text-xs font-semibold text-[#aab8aa]"><span>Profile setup</span><span>{step} / 3</span></div>
            <div className="flex gap-2">{[1, 2, 3].map((number) => <span key={number} className={`h-1.5 flex-1 rounded-full ${number <= step ? "bg-[#e7ff70]" : "bg-white/15"}`} />)}</div>
          </div>
        </aside>

        <section className="flex flex-1 items-center px-6 py-10 sm:px-12 sm:py-14 lg:px-16">
          <div className="w-full max-w-xl">
            {step === 1 ? (
              <div className="animate-fade-in">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Step one</p>
                <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em]">The basics.</h2>
                <p className="mt-4 text-base leading-7 text-[#59665d]">Start with the details you want people to see first.</p>
                <div className="mt-9 space-y-5">
                  <div><label htmlFor="display-name" className="form-label">What&apos;s your name?</label><input id="display-name" className="form-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" placeholder="Ada Lovelace" /></div>
                  <div><label htmlFor="username" className="form-label">Username</label><input id="username" className="form-input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="ada-builds" /><p className="mt-2 text-xs text-[#8a958d]">3-24 characters - letters, numbers, and underscores</p></div>
                  <div><label htmlFor="bio" className="form-label">Short bio <span className="font-normal text-[#8a958d]">(optional)</span></label><textarea id="bio" className="form-input min-h-28 resize-none" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} placeholder="What are you curious about?" /><p className="mt-2 text-right text-xs text-[#8a958d]">{bio.length}/160</p></div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="animate-fade-in">
                <button type="button" onClick={() => setStep(1)} className="mb-8 text-sm font-semibold text-[#69766e] hover:text-[#17251f]">&larr; Back</button>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Step two</p>
                    <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em]">What are you good at?</h2>
                    <p className="mt-4 text-base leading-7 text-[#59665d]">Choose the skills you want to bring to your next project.</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#58675d]">{selectedSkillCount} / {MAX_SKILLS} selected</span>
                </div>

                <div className="mt-8 rounded-2xl border border-[#17251f]/10 bg-[#f7f8f1] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#738178]">Your skills</p>
                    <span className="text-xs text-[#8a958d]">Select up to {MAX_SKILLS}</span>
                  </div>
                  {selectedSkillItems.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedSkillItems.map((skill) => (
                        <span key={skill.id} className="inline-flex items-center gap-2 rounded-full bg-[#17251f] px-3 py-2 text-xs font-semibold text-white">
                          {skill.name}
                          <button type="button" onClick={() => removeSelectedSkill(skill.id)} aria-label={`Remove ${skill.name}`} className="flex h-4 w-4 items-center justify-center rounded-full text-[#e7ff70] transition hover:bg-white/15">&times;</button>
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
                  {skillQuery ? (
                    visibleCategories.length ? visibleCategories.map((category) => (
                      <div key={category.id}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a958d]">{category.name}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{category.skills.map((skill) => renderSkillButton(skill, category.name))}</div>
                      </div>
                    )) : <div className="rounded-2xl border border-dashed border-[#17251f]/15 px-5 py-8 text-center text-sm text-[#7b887f]">No skills found. Try a broader search.</div>
                  ) : skillCategories.map((category: SkillCategory) => {
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
            ) : null}

            {step === 3 ? (
              <div className="animate-fade-in">
                <button type="button" onClick={() => setStep(2)} className="mb-8 text-sm font-semibold text-[#69766e] hover:text-[#17251f]">&larr; Back</button>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Step three</p>
                <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em]">What brings you here?</h2>
                <p className="mt-4 text-base leading-7 text-[#59665d]">Choose one or a few. Your direction can evolve.</p>
                <div className="mt-9 space-y-3">
                  {intents.map(([value, label, detail]) => { const active = selectedIntents.includes(value); return <button key={value} type="button" aria-pressed={active} onClick={() => toggleValue(value, selectedIntents, setSelectedIntents)} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${active ? "border-[#17251f] bg-[#f0f5df]" : "border-[#17251f]/10 bg-white hover:border-[#17251f]/30"}`}><span><span className="block text-sm font-semibold text-[#29392f]">{label}</span><span className="mt-1 block text-xs leading-5 text-[#7a877e]">{detail}</span></span><span className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${active ? "border-[#17251f] bg-[#17251f] text-[#e7ff70]" : "border-[#17251f]/20 text-transparent"}`} aria-hidden>✓</span></button>; })}
                </div>
              </div>
            ) : null}

            {error ? <p className="mt-7 rounded-xl border border-[#bd5d4d]/25 bg-[#fff3f0] px-4 py-3 text-sm leading-6 text-[#9e4639]" role="alert">{error}</p> : null}

            <div className="mt-9 flex justify-end">
              {step === 1 ? <button type="button" onClick={continueFromBasics} disabled={isSaving} className="primary-button">Continue <span aria-hidden>&rarr;</span></button> : null}
              {step === 2 ? <button type="button" onClick={continueFromSkills} disabled={isSaving} className="primary-button">{isSaving ? "Saving..." : "Continue"} <span aria-hidden>&rarr;</span></button> : null}
              {step === 3 ? <button type="button" onClick={finishOnboarding} disabled={isSaving} className="primary-button">{isSaving ? "Completing..." : "Finish profile"} <span aria-hidden>&rarr;</span></button> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
