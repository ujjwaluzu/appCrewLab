"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import type { JoinRequestStatus, PendingJoinRequest } from "@/lib/crew";
import { createClient } from "@/lib/supabase/browser";

function ActionButton({ children, onClick, disabled, subtle = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; subtle?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`${subtle ? "secondary-button" : "primary-button"} disabled:cursor-not-allowed disabled:opacity-50`}>{children}</button>;
}

export function JoinProjectControl({
  projectId,
  userId,
  requestId,
  initialStatus,
  isOwner,
  crewCount,
}: {
  projectId: string;
  userId: string;
  requestId: string | null;
  initialStatus: JoinRequestStatus | null;
  isOwner: boolean;
  crewCount: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [currentRequestId, setCurrentRequestId] = useState(requestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [contribution, setContribution] = useState("");
  const [availability, setAvailability] = useState("");
  const [additionalInformation, setAdditionalInformation] = useState("");

  if (isOwner) return null;

  const validation = {
    motivation: motivation.trim().length === 0 ? "Tell the project owner why you want to join." : "",
    contribution: contribution.trim().length === 0 ? "Describe what you can contribute." : "",
    availability: availability.length === 0 ? "Choose how much time you can commit." : "",
  };
  const invalid = Boolean(validation.motivation || validation.contribution || validation.availability);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (invalid) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data, error: insertError } = await createClient().rpc("submit_project_join_application", {
        target_project_id: projectId,
        application_motivation: motivation.trim(),
        application_contribution: contribution.trim(),
        application_availability: availability,
        application_additional_information: additionalInformation.trim() || null,
      });
      setBusy(false);
      if (insertError) {
        if (insertError.code === "P0001" && insertError.message === "application_rate_limited") {
          setError("You have sent several applications recently. Please wait a little before trying again.");
          return;
        }
        if (insertError.code === "42501" && insertError.message === "onboarding_required") {
          setError("Complete your profile setup before applying to projects.");
          return;
        }
        setError("We could not send your application. Please check your connection and try again.");
        return;
      }
      if (typeof data !== "string") {
        setError("We could not send your application. Please check your connection and try again.");
        return;
      }
      setCurrentRequestId(data);
      setStatus("pending");
      setApplicationOpen(false);
      setNotice("Application sent. The project owner can now review your answers.");
      setMotivation("");
      setContribution("");
      setAvailability("");
      setAdditionalInformation("");
      setAttempted(false);
      router.refresh();
    } catch {
      setBusy(false);
      setError("We couldn’t send your application. Please check your connection and try again.");
    }
  }

  async function cancelRequest() {
    if (!currentRequestId) return;
    setBusy(true);
    setError("");
    const { error: deleteError } = await createClient()
      .from("join_requests")
      .delete()
      .eq("id", currentRequestId)
      .eq("status", "pending");
    setBusy(false);
    if (deleteError) {
      setError("We couldn’t cancel your request. Please try again.");
      return;
    }
    setCurrentRequestId(null);
    setStatus(null);
    setNotice("Request cancelled. You can apply again whenever you’re ready.");
    router.refresh();
  }

  async function leaveProject() {
    if (!window.confirm("Leave this project? You can request to join again later.")) return;
    setBusy(true);
    setError("");
    const { error: leaveError } = await createClient()
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
    setBusy(false);
    if (leaveError) {
      setError("We couldn’t update the crew. Please try again.");
      return;
    }
    setStatus(null);
    setCurrentRequestId(null);
    router.refresh();
  }

  let content: ReactNode;
  if (status === "accepted") {
    content = <><p className="font-semibold text-[#26362c]">You&apos;re part of this crew</p><ActionButton subtle disabled={busy} onClick={leaveProject}>{busy ? "Leaving..." : "Leave project"}</ActionButton></>;
  } else if (status === "pending") {
    content = <><p className="font-semibold text-[#26362c]">Request pending</p><ActionButton subtle disabled={busy} onClick={cancelRequest}>{busy ? "Cancelling..." : "Cancel request"}</ActionButton></>;
  } else if (status === "rejected") {
    content = <><p className="font-semibold text-[#8d493e]">Request declined</p>{crewCount >= 10 ? <p className="text-sm text-[#69766e]">This crew is full.</p> : <ActionButton disabled={busy} onClick={() => { setError(""); setNotice(""); setApplicationOpen(true); }}>Submit a new application</ActionButton>}</>;
  } else if (crewCount >= 10) {
    content = <p className="font-semibold text-[#69766e]">This crew is full.</p>;
  } else {
    content = <><p className="font-semibold text-[#26362c]">Interested in building this?</p><ActionButton disabled={busy} onClick={() => { setError(""); setNotice(""); setApplicationOpen(true); }}>Request to join</ActionButton></>;
  }

  return <div className="crew-join-control">
    {content}
    {notice ? <p className="text-sm text-[#4d6754]" role="status">{notice}</p> : null}
    {error && !applicationOpen ? <p className="text-sm text-[#9e4639]" role="alert">{error}</p> : null}
    {applicationOpen ? <div className="crew-application-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setApplicationOpen(false); }}>
      <section className="crew-application-dialog" role="dialog" aria-modal="true" aria-labelledby="crew-application-title" aria-describedby="crew-application-note" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setApplicationOpen(false); }}>
        <div className="flex items-start justify-between gap-4"><div><p className="workspace-eyebrow">Join request</p><h3 id="crew-application-title" className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#26362c]">Apply to join this crew</h3></div><button type="button" className="crew-dialog-close" aria-label="Close application" onClick={() => setApplicationOpen(false)} disabled={busy}>×</button></div>
        <p id="crew-application-note" className="mt-3 text-sm leading-6 text-[#69766e]">Your application will be visible to the project owner. You&apos;ll become a crew member only if they accept.</p>
        <form className="mt-5 space-y-4" onSubmit={submitRequest} noValidate>
          <div><label htmlFor="join-motivation" className="form-label">Why do you want to join this project? <span aria-hidden="true">*</span></label><textarea id="join-motivation" rows={3} required maxLength={500} value={motivation} onChange={(event) => setMotivation(event.target.value)} aria-invalid={attempted && Boolean(validation.motivation)} aria-describedby="join-motivation-help join-motivation-count" autoFocus className="crew-application-input" placeholder="What interests you about this project?" /><div className="flex items-start justify-between gap-3"><p id="join-motivation-help" className="text-xs text-[#9e4639]" role={attempted && validation.motivation ? "alert" : undefined}>{attempted ? validation.motivation : " "}</p><span id="join-motivation-count" className="crew-character-count">{motivation.length}/500</span></div></div>
          <div><label htmlFor="join-contribution" className="form-label">What can you contribute? <span aria-hidden="true">*</span></label><textarea id="join-contribution" rows={3} required maxLength={500} value={contribution} onChange={(event) => setContribution(event.target.value)} aria-invalid={attempted && Boolean(validation.contribution)} aria-describedby="join-contribution-help join-contribution-count" className="crew-application-input" placeholder="Share relevant skills, experience, or ideas." /><div className="flex items-start justify-between gap-3"><p id="join-contribution-help" className="text-xs text-[#9e4639]" role={attempted && validation.contribution ? "alert" : undefined}>{attempted ? validation.contribution : " "}</p><span id="join-contribution-count" className="crew-character-count">{contribution.length}/500</span></div></div>
          <div><label htmlFor="join-availability" className="form-label">How much time can you commit? <span aria-hidden="true">*</span></label><select id="join-availability" required value={availability} onChange={(event) => setAvailability(event.target.value)} aria-invalid={attempted && Boolean(validation.availability)} aria-describedby="join-availability-help" className="crew-application-input"><option value="">Select an option</option><option>A few hours a week</option><option>5–10 hours a week</option><option>10–20 hours a week</option><option>20+ hours a week</option><option>Flexible / depends on the project</option></select><p id="join-availability-help" className="mt-1 min-h-4 text-xs text-[#9e4639]" role={attempted && validation.availability ? "alert" : undefined}>{attempted ? validation.availability : " "}</p></div>
          <div><label htmlFor="join-additional-information" className="form-label">Anything else you&apos;d like the owner to know? <span className="font-normal text-[#879188]">(optional)</span></label><textarea id="join-additional-information" rows={2} maxLength={500} value={additionalInformation} onChange={(event) => setAdditionalInformation(event.target.value)} aria-describedby="join-additional-information-count" className="crew-application-input" placeholder="Add anything else that may help the owner decide." /><div className="mt-1 flex justify-end"><span id="join-additional-information-count" className="crew-character-count">{additionalInformation.length}/500</span></div></div>
          {error ? <p className="text-sm text-[#9e4639]" role="alert">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 border-t border-[#17251f]/10 pt-4 sm:flex-row sm:justify-end"><button type="button" className="secondary-button" onClick={() => setApplicationOpen(false)} disabled={busy}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Sending application..." : "Send application"}</button></div>
        </form>
      </section>
    </div> : null}
  </div>;
}

export function OwnerJoinRequests({ requests }: { requests: PendingJoinRequest[] }) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<{ id: string; action: "accept" | "decline" } | null>(null);
  const [message, setMessage] = useState("");
  const [previewRequest, setPreviewRequest] = useState<PendingJoinRequest | null>(null);

  async function decide(requestId: string, action: "accept" | "decline") {
    setBusyAction({ id: requestId, action });
    setMessage("");
    const supabase = createClient();
    const { data, error } = action === "accept"
      ? await supabase.rpc("accept_project_join_request", { target_request_id: requestId })
      : await supabase.rpc("decline_project_join_request", { target_request_id: requestId });
    setBusyAction(null);
    if (error) {
      setMessage(action === "accept" ? "We couldn’t accept this request. Please try again." : "We couldn’t decline this request. Please try again.");
      return;
    }
    if (action === "accept" && data === "full") {
      setMessage("This crew is already full.");
      return;
    }
    setPreviewRequest(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {requests.length ? requests.map((request) => {
        const name = request.user.display_name || request.user.username || "CrewLab builder";
        return (
          <article key={request.id} className="crew-request-card">
            <div className="flex min-w-0 items-center gap-3">
              {request.user.username ? <Link href={`/u/${encodeURIComponent(request.user.username)}`} aria-label={`View ${name}'s profile`}><Avatar name={name} username={request.user.username} size="md" /></Link> : <Avatar name={name} size="md" />}
              <div className="min-w-0"><p className="truncate font-semibold text-[#26362c]">{request.user.username ? <Link href={`/u/${encodeURIComponent(request.user.username)}`} className="crew-profile-link">{name}</Link> : name}</p><p className="truncate text-sm text-[#7a7466]">{request.user.username ? <Link href={`/u/${encodeURIComponent(request.user.username)}`} className="crew-profile-link">@{request.user.username}</Link> : "@builder"}</p>
                {request.user.skills.length ? <div className="mt-2 flex flex-wrap gap-1.5">{request.user.skills.slice(0, 3).map((skill) => <span className="project-skill-chip" key={skill.id}>{skill.name}</span>)}</div> : null}
              </div>
            </div>
            <button type="button" className="crew-preview-icon-button" aria-label={`Preview application from ${name}`} title="Preview application" onClick={() => { setPreviewRequest(request); setMessage(""); }}>
              <span className="crew-review-icon" aria-hidden="true">▤</span>
            </button>
          </article>
        );
      }) : <p className="text-sm leading-6 text-[#69766e]">No join requests yet. People interested in your project will appear here.</p>}
      {message && !previewRequest ? <p role="alert" className="text-sm text-[#9e4639]">{message}</p> : null}
      {previewRequest ? (() => {
        const name = previewRequest.user.display_name || previewRequest.user.username || "CrewLab builder";
        const action = busyAction?.id === previewRequest.id ? busyAction.action : null;
        return <div className="crew-review-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !action) setPreviewRequest(null); }}>
          <section className="crew-review-dialog" role="dialog" aria-modal="true" aria-labelledby="crew-review-title" onKeyDown={(event) => { if (event.key === "Escape" && !action) setPreviewRequest(null); }}>
            <header className="crew-review-dialog-header">
              <div className="flex min-w-0 items-center gap-3">{previewRequest.user.username ? <Link href={`/u/${encodeURIComponent(previewRequest.user.username)}`} aria-label={`View ${name}'s profile`}><Avatar name={name} username={previewRequest.user.username} size="md" /></Link> : <Avatar name={name} size="md" />}<div className="min-w-0"><p className="workspace-eyebrow">Join request</p><h3 id="crew-review-title" className="truncate text-xl font-semibold tracking-[-0.04em] text-[#26362c]">{previewRequest.user.username ? <Link href={`/u/${encodeURIComponent(previewRequest.user.username)}`} className="crew-profile-link">{name}</Link> : name}&apos;s application</h3><p className="truncate text-sm text-[#7a7466]">{previewRequest.user.username ? <Link href={`/u/${encodeURIComponent(previewRequest.user.username)}`} className="crew-profile-link">@{previewRequest.user.username}</Link> : "@builder"}</p></div></div>
              <button type="button" className="crew-dialog-close" aria-label="Close application preview" onClick={() => setPreviewRequest(null)} disabled={Boolean(action)} autoFocus>×</button>
            </header>
            {previewRequest.user.skills.length ? <div className="mt-4 flex flex-wrap gap-2">{previewRequest.user.skills.slice(0, 3).map((skill) => <span className="project-skill-chip" key={skill.id}>{skill.name}</span>)}</div> : null}
            <div className="crew-review-dialog-content">
              {previewRequest.application_legacy ? <p className="crew-review-legacy">This request was submitted before the application form was added.</p> : <>
                <section><h4>Why do you want to join this project?</h4><p>{previewRequest.motivation}</p></section>
                <section><h4>What can you contribute?</h4><p>{previewRequest.contribution}</p></section>
                <section><h4>How much time can you commit?</h4><p>{previewRequest.availability}</p></section>
                {previewRequest.additional_information ? <section><h4>Anything else for the project owner?</h4><p>{previewRequest.additional_information}</p></section> : null}
              </>}
            </div>
            {message ? <p role="alert" className="mt-4 text-sm text-[#9e4639]">{message}</p> : null}
            <footer className="crew-review-dialog-actions"><button type="button" className="crew-small-button crew-small-button-muted" onClick={() => void decide(previewRequest.id, "decline")} disabled={Boolean(action)}>{action === "decline" ? "Declining..." : "Decline"}</button><button type="button" className="crew-small-button crew-small-button-accept" onClick={() => void decide(previewRequest.id, "accept")} disabled={Boolean(action)}>{action === "accept" ? "Accepting..." : "Accept"}</button></footer>
          </section>
        </div>;
      })() : null}
    </div>
  );
}

export function RemoveCrewMemberControl({ projectId, userId, displayName }: { projectId: string; userId: string; displayName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Remove ${displayName} from this crew?`)) return;
    setBusy(true);
    setError("");
    const { error: deleteError } = await createClient().from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
    setBusy(false);
    if (deleteError) {
      setError("We couldn’t update the crew. Please try again.");
      return;
    }
    router.refresh();
  }

  return <div className="mt-3"><button type="button" className="text-xs font-semibold text-[#8d493e] underline decoration-[#8d493e]/30 underline-offset-4 disabled:opacity-50" onClick={() => void remove()} disabled={busy}>{busy ? "Removing..." : "Remove from crew"}</button>{error ? <p className="mt-1 text-xs text-[#9e4639]" role="alert">{error}</p> : null}</div>;
}
