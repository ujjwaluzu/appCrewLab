"use client";

import { useState } from "react";
import type { ReactNode } from "react";
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

  if (isOwner) return null;

  async function submitRequest() {
    setBusy(true);
    setError("");
    const { data, error: insertError } = await createClient()
      .from("join_requests")
      .insert({ project_id: projectId, user_id: userId, status: "pending" })
      .select("id")
      .single();
    setBusy(false);
    if (insertError || !data) {
      setError("We couldn’t send your request. Please try again.");
      return;
    }
    setCurrentRequestId(data.id);
    setStatus("pending");
    router.refresh();
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
    content = <><p className="font-semibold text-[#8d493e]">Request declined</p><ActionButton disabled={busy || crewCount >= 10} onClick={submitRequest}>{busy ? "Sending..." : "Request to join again"}</ActionButton></>;
  } else if (crewCount >= 10) {
    content = <p className="font-semibold text-[#69766e]">This crew is full.</p>;
  } else {
    content = <><p className="font-semibold text-[#26362c]">Interested in building this?</p><ActionButton disabled={busy} onClick={submitRequest}>{busy ? "Sending..." : "Request to join"}</ActionButton></>;
  }

  return <div className="crew-join-control">{content}{error ? <p className="text-sm text-[#9e4639]" role="alert">{error}</p> : null}</div>;
}

export function OwnerJoinRequests({ requests }: { requests: PendingJoinRequest[] }) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<{ id: string; action: "accept" | "decline" } | null>(null);
  const [message, setMessage] = useState("");

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
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {requests.length ? requests.map((request) => {
        const name = request.user.display_name || request.user.username || "CrewLab builder";
        const busyActionForRequest = busyAction?.id === request.id ? busyAction.action : null;
        const busy = busyActionForRequest !== null;
        return (
          <article key={request.id} className="crew-request-card">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={name} username={request.user.username} size="md" />
              <div className="min-w-0"><p className="truncate font-semibold text-[#26362c]">{name}</p><p className="truncate text-sm text-[#7a7466]">@{request.user.username || "builder"}</p>
                {request.user.skills.length ? <div className="mt-2 flex flex-wrap gap-1.5">{request.user.skills.slice(0, 3).map((skill) => <span className="project-skill-chip" key={skill.id}>{skill.name}</span>)}</div> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => void decide(request.id, "accept")} disabled={busy} className="crew-small-button">{busyActionForRequest === "accept" ? "Accepting..." : "Accept"}</button><button type="button" onClick={() => void decide(request.id, "decline")} disabled={busy} className="crew-small-button crew-small-button-muted">{busyActionForRequest === "decline" ? "Declining..." : "Decline"}</button></div>
          </article>
        );
      }) : <p className="text-sm leading-6 text-[#69766e]">No join requests yet. People interested in your project will appear here.</p>}
      {message ? <p role="alert" className="text-sm text-[#9e4639]">{message}</p> : null}
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
