import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const auth = await getAuthState(); if (auth.status !== "authenticated") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url); const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100); const scope = url.searchParams.get("in") ?? "projects"; if (!q) return NextResponse.json({ results: [] });
  const db = await createClient(); const pattern = `%${q.replace(/[%,]/g, " ")}%`; const limit = url.searchParams.get("all") === "1" ? 50 : 5;
  if (scope === "projects") {
    const [byTitle, byShort, byDescription, skills] = await Promise.all([
      db.from("projects").select("id").ilike("title", pattern).limit(limit),
      db.from("projects").select("id").ilike("short_description", pattern).limit(limit),
      db.from("projects").select("id").ilike("description", pattern).limit(limit),
      db.from("skills").select("id").ilike("name", pattern).limit(50),
    ]);
    if (byTitle.error || byShort.error || byDescription.error || skills.error) return NextResponse.json({ error:"Search is unavailable" },{status:503});
    const skillProjects=skills.data?.length?await db.from("project_skills").select("project_id").in("skill_id",skills.data.map(s=>s.id)):{data:[],error:null};
    if(skillProjects.error)return NextResponse.json({error:"Search is unavailable"},{status:503});
    const ids=[...new Set([...(byTitle.data??[]),...(byShort.data??[]),...(byDescription.data??[]),...(skillProjects.data??[]).map(x=>({id:x.project_id}))].map(x=>x.id))].slice(0,limit);
    const {data,error}=ids.length?await db.from("projects").select("id,title,short_description").in("id",ids):{data:[],error:null};
    if(error)return NextResponse.json({error:"Search is unavailable"},{status:503});
    return NextResponse.json({results:(data??[]).map(p=>({title:p.title,subtitle:p.short_description,href:`/projects/${p.id}`}))});
  }
  if (scope === "builders") { const { data } = await db.rpc("search_public_profiles",{search_term:q,result_limit:limit}); const builders=(data??[]) as Array<{username:string|null;display_name:string|null}>;return NextResponse.json({ results: builders.map((p) => ({ title:p.display_name || p.username, subtitle:p.username ? `@${p.username}` : "Builder", href:p.username ? `/u/${encodeURIComponent(p.username)}` : "/my-crew" })) }); }
  if (scope === "skills") { const { data } = await db.from("skills").select("id,name,slug").ilike("name", pattern).limit(limit); const skillIds=(data??[]).map(s=>s.id); const usage=skillIds.length?await db.from("project_skills").select("skill_id,project:projects(id,title)").in("skill_id",skillIds):{data:[]}; return NextResponse.json({ results: (data ?? []).map((s) => {const projects=(usage.data??[]).filter((x)=>x.skill_id===s.id).flatMap((x)=>Array.isArray(x.project)?x.project:x.project?[x.project]:[]);return { title:s.name, subtitle:projects.map(p=>p.title).join(", ")||"No projects yet", href:projects.length?`/projects/${projects[0].id}`:`/search?q=${encodeURIComponent(s.name)}&in=skills`};}) }); }
  if (scope === "discussions") { const { data } = await db.from("project_discussion_posts").select("id,body,project_id").ilike("body", pattern).order("created_at", { ascending:false }).limit(limit); return NextResponse.json({ results: (data ?? []).map((p) => ({ title:p.body.slice(0,70), subtitle:"Discussion", href:`/discussion/${p.project_id}` })) }); }
  return NextResponse.json({ results: [] });
}
