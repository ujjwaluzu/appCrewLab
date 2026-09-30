import { getCrewProfilesByIds, type CrewProfile } from "@/lib/crew";
import { createClient } from "@/lib/supabase/server";

export type ProjectDiscussionPost = {
  id: string;
  project_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: CrewProfile;
};

export async function getProjectDiscussionPosts(projectId: string): Promise<{ posts: ProjectDiscussionPost[]; error: boolean }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("project_discussion_posts")
      .select("id, project_id, author_id, body, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { posts: [], error: true };

    const rows = [...(data ?? [])].reverse();
    const profiles = await getCrewProfilesByIds(rows.map((row) => row.author_id));
    if (profiles.error) return { posts: [], error: true };
    return {
      posts: rows.map((row) => ({
        ...row,
        author: profiles.profiles.get(row.author_id) ?? {
          id: row.author_id,
          display_name: "CrewLab member",
          username: null,
          skills: [],
        },
      })),
      error: false,
    };
  } catch {
    return { posts: [], error: true };
  }
}
