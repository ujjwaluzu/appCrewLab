import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type NotificationRow = { id: string; created_at?: string; updated_at?: string; status?: string };

async function visibleNotifications(db: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: projects, error: projectsError } = await db.from("projects").select("id").eq("owner_id", userId);
  if (projectsError) return { error: projectsError, rows: [] as NotificationRow[] };

  const projectIds = (projects ?? []).map((project) => project.id);
  const [incoming, outgoing] = await Promise.all([
    projectIds.length
      ? db.from("join_requests").select("id,created_at,status").in("project_id", projectIds).eq("status", "pending").order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
    db.from("join_requests").select("id,updated_at,status").eq("user_id", userId).neq("status", "pending").order("updated_at", { ascending: false }).limit(5),
  ]);
  if (incoming.error || outgoing.error) return { error: incoming.error ?? outgoing.error, rows: [] as NotificationRow[] };
  const rows = [
    ...((incoming.data ?? []) as NotificationRow[]),
    ...((outgoing.data ?? []) as NotificationRow[]),
  ].sort((a, b) => (b.created_at ?? b.updated_at ?? "").localeCompare(a.created_at ?? a.updated_at ?? "")).slice(0, 5);
  return { error: null, rows };
}

export async function GET() {
  const auth = await getAuthState();
  if (auth.status !== "authenticated") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await createClient();
  const { rows, error } = await visibleNotifications(db, auth.user.id);
  if (error) return NextResponse.json({ error: "Notifications are unavailable" }, { status: 503 });

  const ids = rows.map((row) => row.id);
  const reads = ids.length
    ? await db.from("notification_reads").select("join_request_id").eq("user_id", auth.user.id).in("join_request_id", ids)
    : { data: [], error: null };
  if (reads.error) return NextResponse.json({ error: "Notifications are unavailable" }, { status: 503 });
  const readIds = new Set((reads.data ?? []).map((read) => read.join_request_id));
  const items = rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at ?? row.updated_at ?? "",
    text: row.status === "pending" ? "New incoming application" : `Application ${row.status}`,
    isRead: readIds.has(row.id),
  }));
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await getAuthState();
  if (auth.status !== "authenticated") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.ids) || body.ids.length > 100 || body.ids.some((id: unknown) => typeof id !== "string" || id.length > 80)) {
    return NextResponse.json({ error: "Invalid notification ids" }, { status: 400 });
  }
  const ids = [...new Set(body.ids as string[])];
  if (!ids.length) return NextResponse.json({ ok: true });

  const db = await createClient();
  const { data: projects, error: projectsError } = await db.from("projects").select("id").eq("owner_id", auth.user.id);
  if (projectsError) return NextResponse.json({ error: "Notifications are unavailable" }, { status: 503 });
  const projectIds = (projects ?? []).map((project) => project.id);
  const [incoming, outgoing] = await Promise.all([
    projectIds.length
      ? db.from("join_requests").select("id").in("project_id", projectIds).eq("status", "pending").in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    db.from("join_requests").select("id").eq("user_id", auth.user.id).neq("status", "pending").in("id", ids),
  ]);
  if (incoming.error || outgoing.error) return NextResponse.json({ error: "Notifications are unavailable" }, { status: 503 });
  const visibleIds = new Set([...(incoming.data ?? []), ...(outgoing.data ?? [])].map((row) => row.id));
  if (ids.some((id) => !visibleIds.has(id))) return NextResponse.json({ error: "One or more notifications are not available" }, { status: 403 });

  const { error } = await db.from("notification_reads").upsert(
    ids.map((join_request_id) => ({ user_id: auth.user.id, join_request_id })),
    { onConflict: "user_id,join_request_id", ignoreDuplicates: true },
  );
  if (error) return NextResponse.json({ error: "Could not update notifications" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
