import Link from "next/link";

export default function PublicProfileNotFound() {
  return <main className="public-profile-not-found"><div><p className="workspace-eyebrow">CrewLab builder</p><h1>Profile not found</h1><p>This builder may not exist or their username may have changed.</p><Link href="/projects" className="primary-button mt-6">Explore projects</Link></div></main>;
}
