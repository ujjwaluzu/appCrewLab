"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export function DiscussionWorkspace({
  heading,
  phase,
  meta,
  children,
  chat,
}: {
  heading: ReactNode;
  phase: ReactNode;
  meta: ReactNode;
  children: ReactNode;
  chat: ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return <>
    <header className="discussion-room-header">
      <div className="min-w-0">{heading}</div>
      <div className="discussion-room-header-actions">
        {phase}
        <button
          type="button"
          className="discussion-chat-toggle"
          aria-expanded={chatOpen}
          aria-controls="discussion-chat-sidebar"
          onClick={() => setChatOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.5-.7L4 20l1.2-3.7A7.1 7.1 0 0 1 4 12.5 7.5 7.5 0 0 1 12 5a7.5 7.5 0 0 1 8 6.5Z" /></svg>
          {chatOpen ? "Close chat" : "Open crew chat"}
        </button>
      </div>
    </header>
    {meta}
    <div className={`discussion-room-layout ${chatOpen ? "is-chat-open" : ""}`}>
      {children}
      <aside
        id="discussion-chat-sidebar"
        className="discussion-chat-sidebar"
        aria-label="Project chat sidebar"
        aria-hidden={!chatOpen}
        inert={!chatOpen}
      >
        {chat}
      </aside>
    </div>
  </>;
}
