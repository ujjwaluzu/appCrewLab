"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { Avatar } from "@/components/ui/Avatar";
import type { ProjectDiscussionPost } from "@/lib/discussion";
import type { CrewProfile } from "@/lib/crew";
import { createClient } from "@/lib/supabase/browser";

type ChatMessage = ProjectDiscussionPost & { delivery?: "sending" };

function formatPostDate(value: string) {
  return new Date(value).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

function mergeMessage(messages: ChatMessage[], message: ChatMessage) {
  if (messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message].sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
}

export function DiscussionThread({
  projectId,
  currentUserId,
  currentUser,
  posts,
}: {
  projectId: string;
  currentUserId: string;
  currentUser: CrewProfile;
  posts: ProjectDiscussionPost[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(posts);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const feedRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-discussion-${projectId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "project_discussion_posts", filter: `project_id=eq.${projectId}` },
        async ({ new: row }) => {
          const messageRow = row as Pick<ProjectDiscussionPost, "id" | "project_id" | "author_id" | "body" | "created_at">;
          let author = currentUser;
          if (messageRow.author_id !== currentUserId) {
            try {
              const { data } = await supabase.rpc("get_visible_project_profiles", { target_profile_ids: [messageRow.author_id] });
              const profileRow = data?.[0];
              author = profileRow
                ? { id: profileRow.profile_id, display_name: profileRow.display_name || profileRow.username || "CrewLab member", username: profileRow.username, skills: [] }
                : { id: messageRow.author_id, display_name: "CrewLab member", username: null, skills: [] };
            } catch {
              author = { id: messageRow.author_id, display_name: "CrewLab member", username: null, skills: [] };
            }
          }

          setMessages((current) => {
            const optimistic = current.find((message) => message.delivery && message.author_id === messageRow.author_id && message.body === messageRow.body);
            const withoutOptimistic = optimistic ? current.filter((message) => message.id !== optimistic.id) : current;
            return mergeMessage(withoutOptimistic, { ...messageRow, author });
          });
        },
      )
      .subscribe((status) => {
        setConnection(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "reconnecting" : "connecting");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser, currentUserId, projectId]);

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messageText = body.trim();
    if (!messageText || pending) return;

    const temporaryId = `sending-${crypto.randomUUID()}`;
    const optimisticMessage: ChatMessage = {
      id: temporaryId,
      project_id: projectId,
      author_id: currentUserId,
      body: messageText,
      created_at: new Date().toISOString(),
      author: currentUser,
      delivery: "sending",
    };

    setMessages((current) => mergeMessage(current, optimisticMessage));
    setBody("");
    setPending(true);
    setError("");

    try {
      const { data, error: insertError } = await createClient()
        .from("project_discussion_posts")
        .insert({ project_id: projectId, body: messageText })
        .select("id, project_id, author_id, body, created_at")
        .single();

      if (insertError || !data) {
        setMessages((current) => current.filter((item) => item.id !== temporaryId));
        setBody((current) => current || messageText);
        setError("Your message couldn't be sent. Please check your connection and try again.");
        return;
      }

      setMessages((current) => {
        const withoutOptimistic = current.filter((item) => item.id !== temporaryId);
        return mergeMessage(withoutOptimistic, { ...data, author: currentUser });
      });
    } catch {
      setMessages((current) => current.filter((item) => item.id !== temporaryId));
      setBody((current) => current || messageText);
      setError("Your message couldn't be sent. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return <section className="discussion-chat" aria-label="Project chat">
    <header className="discussion-chat-toolbar">
      <div><p className="workspace-eyebrow">Project chat</p><h2>Messages</h2></div>
      <span className={`discussion-live-status ${connection === "live" ? "is-live" : ""}`} aria-live="polite">
        <span aria-hidden="true" />{connection === "live" ? "Live" : connection === "connecting" ? "Connecting" : "Reconnecting"}
      </span>
    </header>

    <ol className="discussion-chat-feed" aria-label="Messages" aria-live="polite" aria-relevant="additions text" ref={feedRef}>
      {messages.length ? messages.map((message) => {
        const ownMessage = message.author_id === currentUserId;
        const authorName = ownMessage ? "You" : message.author.display_name || message.author.username || "CrewLab member";
        return <li key={message.id} className={`discussion-chat-row ${ownMessage ? "is-own-message" : ""}`}>
          {!ownMessage ? <Avatar name={authorName} username={message.author.username} size="sm" /> : null}
          <article className={`discussion-chat-bubble ${ownMessage ? "is-own-message" : ""}`} aria-label={`${authorName} said`}>
            {!ownMessage ? <p className="discussion-chat-author">{authorName}</p> : null}
            <p className="discussion-chat-body">{message.body}</p>
            <time dateTime={message.created_at}>{message.delivery ? "Sending…" : formatPostDate(message.created_at)}</time>
          </article>
        </li>;
      }) : <li className="discussion-chat-empty"><span aria-hidden="true">✳</span><h3>No messages yet</h3><p>Send the first message to get your crew talking.</p></li>}
    </ol>

    <form className="discussion-chat-composer" onSubmit={submitPost}>
      <label className="sr-only" htmlFor="discussion-message">Message your project crew</label>
      <textarea
        id="discussion-message"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={handleComposerKeyDown}
        maxLength={5000}
        rows={1}
        placeholder="Message your crew…"
        disabled={pending}
        required
      />
      <button type="submit" className="discussion-send-button" aria-label="Send message" disabled={pending || !body.trim()}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z" /><path d="m10.1 13.9 4-4" /></svg>
      </button>
      {error ? <p className="discussion-form-error" role="alert">{error}</p> : null}
    </form>
  </section>;
}
