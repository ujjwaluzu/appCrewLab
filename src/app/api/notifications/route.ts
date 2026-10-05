import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  const auth = await getAuthState(); if (auth.status !== "authenticated") return NextResponse.json({ error:"Unauthorized" }, { status:401 }); const db = await createClient();
  const { data: owned } = await db.from("projects").select("id,title").eq("owner_id", auth.user.id); const ids = (owned ?? []).map((p) => p.id); let incoming: {id:string;created_at:string;project_id:string}[] = [];
  if (ids.length) { const result = await db.from("join_requests").select("id,created_at,project_id").in("project_id",ids).eq("status","pending").order("created_at",{ascending:false}).limit(5); incoming = result.data ?? []; }
  const { data: outgoing } = await db.from("join_requests").select("id,updated_at,status,project_id").eq("user_id",auth.user.id).neq("status","pending").order("updated_at",{ascending:false}).limit(5);
  return NextResponse.json({ items:[...incoming.map((x)=>({id:x.id,createdAt:x.created_at,text:"New incoming application"})),...(outgoing??[]).map((x)=>({id:x.id,createdAt:x.updated_at,text:`Application ${x.status}`}))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5) });
}
