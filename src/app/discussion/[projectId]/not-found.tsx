import Link from "next/link";

export default function DiscussionNotFound() {
  return <main className="project-empty-state discussion-not-found"><p className="workspace-eyebrow">Project discussion</p><h1>Discussion not found.</h1><p>You may not be a member of this project, or it may no longer be available.</p><Link href="/discussion" className="secondary-button mt-5">Back to discussions</Link></main>;
}