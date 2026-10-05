import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function userId() { const state = await getAuthState(); return state.status === "authenticated" ? state.user.id : null; }
export async function GET(request: Request) {
  const id = await userId(); if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url); const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  if (!from || !to || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  const db = await createClient(); const { data, error } = await db.from("events").select("id,title,starts_at,ends_at,notes,project_id").eq("owner_id", id).gte("starts_at", from).lt("starts_at", to).order("starts_at");
  if (error) return NextResponse.json({ error: "Could not load events" }, { status: 503 }); return NextResponse.json({ events: data ?? [] });
}
export async function POST(request: Request) {
  const id = await userId(); if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null); if (!body || typeof body.title !== "string" || !body.title.trim() || body.title.length > 120 || !body.startsAt || Number.isNaN(Date.parse(body.startsAt))) return NextResponse.json({ error: "Enter a title and a valid date." }, { status: 400 });
  const db = await createClient(); const { data, error } = await db.from("events").insert({ owner_id: id, title: body.title.trim(), starts_at: body.startsAt, ends_at: body.endsAt || null, notes: body.notes || null, project_id: body.projectId || null }).select("id,title,starts_at,ends_at,notes,project_id").single();
  if (error) return NextResponse.json({ error: "Could not save event. Check that the selected project belongs to you." }, { status: 400 }); return NextResponse.json({ event: data }, { status: 201 });
}
export async function PATCH(request: Request) {
  const id = await userId(); if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null); if (!body?.id || typeof body.title !== "string" || !body.title.trim() || !body.startsAt || Number.isNaN(Date.parse(body.startsAt))) return NextResponse.json({ error: "Enter a title and a valid date." }, { status: 400 });
  const db = await createClient(); const { data, error } = await db.from("events").update({ title: body.title.trim(), starts_at: body.startsAt, ends_at: body.endsAt || null, notes: body.notes || null, project_id: body.projectId || null }).eq("id", body.id).eq("owner_id", id).select("id,title,starts_at,ends_at,notes,project_id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Could not update event." }, { status: 400 }); return NextResponse.json({ event: data });
}
export async function DELETE(request: Request) {
  const id = await userId(); if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const eventId = new URL(request.url).searchParams.get("id"); if (!eventId) return NextResponse.json({ error: "Event id required" }, { status: 400 });
  const db = await createClient(); const { error } = await db.from("events").delete().eq("id", eventId).eq("owner_id", id); if (error) return NextResponse.json({ error: "Could not delete event" }, { status: 400 }); return NextResponse.json({ ok: true });
}
