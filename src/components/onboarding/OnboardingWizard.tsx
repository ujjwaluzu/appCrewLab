"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SkillPicker, type SelectedSkill } from "@/components/skills/SkillPicker";
import { DroidPanel } from "@/components/visuals/DroidPanel";
import { intents } from "@/data/intents";
import { createClient } from "@/lib/supabase/browser";

type Step = 1 | 2 | 3;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [touchedBasics, setTouchedBasics] = useState({ displayName: false, username: false });
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([]);
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: userResult, error: authError } = await supabase.auth.getUser();

        if (authError) {
          if (isMounted) setLoadError("We could not verify your session. Please try again.");
          return;
        }

        if (!userResult.user) {
          router.replace("/auth");
          return;
        }

        const [profileResult, profileSkillsResult] = await Promise.all([
          supabase.from("profiles").select("display_name, username, bio, intents").eq("id", userResult.user.id).maybeSingle(),
          supabase.from("profile_skills").select("skill_id").eq("profile_id", userResult.user.id),
        ]);
        if (profileResult.error || profileSkillsResult.error) {
          if (isMounted) setLoadError("We could not load your saved profile details. Please try again.");
          return;
        }

        const profile = profileResult.data;
        const profileSkillRows = profileSkillsResult.data;

        const savedSkillIds = (profileSkillRows ?? []).map((row) => row.skill_id).filter(Boolean);
        const { data: savedSkills, error: savedSkillsError } = savedSkillIds.length
          ? await supabase.from("skills").select("id, slug, name").in("id", savedSkillIds)
          : { data: [], error: null };

        if (savedSkillsError) {
          if (isMounted) setLoadError("We could not load your saved skills. Please try again.");
          return;
        }

        if (!isMounted) return;

        setLoadError("");
        setDisplayName(profile?.display_name ?? "");
        setUsername(profile?.username ?? "");
        setBio(profile?.bio ?? "");
        setSelectedIntents(profile?.intents ?? []);
        setSelectedSkills((savedSkills ?? []).map((skill) => ({ id: skill.id, slug: skill.slug, name: skill.name })));
      } catch {
        if (isMounted) setLoadError("We could not load your profile. Please try again.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProfile();
    return () => { isMounted = false; };
  }, [router, loadAttempt]);

  const isDisplayNameValid = displayName.trim().length >= 1 && displayName.trim().length <= 80;
  const isUsernameValid = /^[a-zA-Z0-9_]{3,24}$/.test(username.trim());
  const canContinueFromBasics = isDisplayNameValid && isUsernameValid;

  function continueFromBasics() {
    setError("");
    if (canContinueFromBasics) setStep(2);
  }

  async function saveBasics() {
    const supabase = createClient();
    const { data: userResult } = await supabase.auth.getUser();

    if (!userResult.user) {
      router.replace("/auth");
      return null;
    }

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: userResult.user.id,
      display_name: displayName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim() || null,
    }, { onConflict: "id" });

    if (saveError) {
      setError(saveError.code === "23505" ? "That username is already taken. Try another one." : "We could not save your profile yet. Please try again.");
      return null;
    }

    return userResult.user.id;
  }

  async function persistSelectedSkills(profileId: string) {
    const supabase = createClient();
    const newSkillSlugs = selectedSkills.filter((skill) => !skill.id).map((skill) => skill.slug);
    let selectedSkillIds = selectedSkills.flatMap((skill) => skill.id ? [skill.id] : []);

    if (newSkillSlugs.length) {
      const { data: selectedSkillRows, error: skillError } = await supabase.from("skills").select("id, slug").in("slug", newSkillSlugs);
      if (skillError || selectedSkillRows?.length !== newSkillSlugs.length) {
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
      const { error: insertError } = await supabase.from("profile_skills").insert([...new Set(selectedSkillIds)].map((skillId) => ({ profile_id: profileId, skill_id: skillId })));
      if (insertError) {
        setError("We could not update your skills yet. Please try again.");
        return false;
      }
    }

    return true;
  }

  async function continueFromSkills() {
    setError("");
    if (!selectedSkills.length) {
      setError("Choose at least one skill so people know what you enjoy building.");
      return;
    }

    setIsSaving(true);
    try {
      const profileId = await saveBasics();
      if (profileId && await persistSelectedSkills(profileId)) setStep(3);
    } catch {
      setError("We could not save your profile yet. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function finishOnboarding() {
    setError("");
    if (!selectedIntents.length) {
      setError("Choose at least one reason you are here.");
      return;
    }

    setIsSaving(true);
    try {
      const profileId = await saveBasics();
      if (!profileId || !(await persistSelectedSkills(profileId))) return;

      const { error: profileError } = await createClient().rpc("complete_profile_onboarding", { selected_intents: selectedIntents });
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

  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#66736b]">Checking your session...</div>;

  return (
    <main className="auth-page min-h-screen px-4 py-4 text-[#17251f] sm:px-7 sm:py-7">
      <div className="auth-frame mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col overflow-hidden rounded-[2rem] border bg-[#fcfcf8] sm:min-h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-3.5rem)] lg:min-h-0 lg:flex-row">
        <DroidPanel className="min-h-[25rem] lg:min-h-0 lg:w-[36%]" compact eyebrow="Your starting point" title="Let&apos;s make your profile feel like you." body="A few useful details help the right projects and people find you." />

        <section className="onboarding-pane flex flex-1 items-center px-6 py-6 sm:px-10 sm:py-8 lg:px-14"><div className="onboarding-content w-full max-w-xl">
          <div className="onboarding-meta mb-6">
            <span className="onboarding-meta-label">Profile setup</span>
            <span className="onboarding-meta-count">{step} / 3</span>
            <div className="onboarding-meta-progress" aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((number) => <span key={number} className={number <= step ? "is-complete" : ""} />)}
            </div>
          </div>
          {step === 1 ? <div className="animate-fade-in"><h2 className="text-4xl font-semibold leading-tight tracking-[-0.055em]">The basics.</h2><p className="mt-3 text-base leading-7 text-[#59665d]">Start with the details you want people to see first.</p><div className="mt-6 space-y-5"><div><label htmlFor="display-name" className="form-label">What&apos;s your name?</label><input id="display-name" maxLength={80} className={`form-input ${touchedBasics.displayName && !isDisplayNameValid ? "onboarding-field-invalid" : ""}`} value={displayName} onChange={(event) => setDisplayName(event.target.value)} onBlur={() => setTouchedBasics((current) => ({ ...current, displayName: true }))} autoComplete="name" placeholder="Ada Lovelace" aria-invalid={touchedBasics.displayName && !isDisplayNameValid} /></div><div><label htmlFor="username" className="form-label">Username</label><input id="username" maxLength={24} className={`form-input ${touchedBasics.username && !isUsernameValid ? "onboarding-field-invalid" : ""}`} value={username} onChange={(event) => setUsername(event.target.value)} onBlur={() => setTouchedBasics((current) => ({ ...current, username: true }))} autoComplete="username" placeholder="ada-builds" aria-invalid={touchedBasics.username && !isUsernameValid} /><p className="mt-2 text-xs text-[#8a958d]">3-24 characters - letters, numbers, and underscores</p></div><div><label htmlFor="bio" className="form-label">Short bio <span className="font-normal text-[#8a958d]">(optional)</span></label><textarea id="bio" className="form-input min-h-28 resize-none" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} placeholder="What are you curious about?" /><p className="mt-2 text-right text-xs text-[#8a958d]">{bio.length}/160</p></div></div></div> : null}

          {step === 2 ? <div className="animate-fade-in"><button type="button" onClick={() => setStep(1)} className="mb-8 text-sm font-semibold text-[#69766e] hover:text-[#17251f]">&larr; Back</button><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Step two</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em]">What are you good at?</h2><p className="mt-4 text-base leading-7 text-[#59665d]">Choose the skills you want to bring to your next project.</p><div className="mt-8"><SkillPicker selectedSkills={selectedSkills} onChange={setSelectedSkills} /></div></div> : null}

          {step === 3 ? <div className="animate-fade-in"><button type="button" onClick={() => setStep(2)} className="mb-8 text-sm font-semibold text-[#69766e] hover:text-[#17251f]">&larr; Back</button><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#738178]">Step three</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em]">What brings you here?</h2><p className="mt-4 text-base leading-7 text-[#59665d]">Choose one or a few. Your direction can evolve.</p><div className="mt-9 space-y-3">{intents.map((intent) => { const active = selectedIntents.includes(intent.id); return <button key={intent.id} type="button" aria-pressed={active} onClick={() => setSelectedIntents((current) => active ? current.filter((value) => value !== intent.id) : [...current, intent.id])} className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${active ? "border-[#17251f] bg-[#f0f5df]" : "border-[#17251f]/10 bg-white hover:border-[#17251f]/30"}`}><span><span className="block text-sm font-semibold text-[#29392f]">{intent.label}</span><span className="mt-1 block text-xs leading-5 text-[#7a877e]">{intent.detail}</span></span><span className={`ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${active ? "border-[#17251f] bg-[#17251f] text-[#e7ff70]" : "border-[#17251f]/20 text-transparent"}`} aria-hidden>✓</span></button>; })}</div></div> : null}

          {loadError ? <div className="mt-6 rounded-xl border border-[#bd5d4d]/25 bg-[#fff3f0] px-4 py-3 text-sm leading-6 text-[#9e4639]" role="alert"><p>{loadError}</p><button type="button" className="mt-2 font-semibold underline underline-offset-2" onClick={() => { setIsLoading(true); setLoadAttempt((current) => current + 1); }}>Try again</button></div> : null}
          {error ? <p className="mt-7 rounded-xl border border-[#bd5d4d]/25 bg-[#fff3f0] px-4 py-3 text-sm leading-6 text-[#9e4639]" role="alert">{error}</p> : null}
          <div className="mt-9 flex justify-end">{step === 1 ? <button type="button" onClick={continueFromBasics} disabled={isSaving || Boolean(loadError) || !canContinueFromBasics} className="primary-button">Continue <span aria-hidden>&rarr;</span></button> : null}{step === 2 ? <button type="button" onClick={continueFromSkills} disabled={isSaving || Boolean(loadError)} className="primary-button">{isSaving ? "Saving..." : "Continue"} <span aria-hidden>&rarr;</span></button> : null}{step === 3 ? <button type="button" onClick={finishOnboarding} disabled={isSaving || Boolean(loadError)} className="primary-button">{isSaving ? "Completing..." : "Finish profile"} <span aria-hidden>&rarr;</span></button> : null}</div>
        </div></section>
      </div>
    </main>
  );
}
