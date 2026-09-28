import Link from "next/link";

export default function ProjectNotFound() {
  return <main className="workspace-main flex min-h-[70vh] items-center justify-center px-5 py-12"><div className="project-empty-state w-full max-w-xl"><p className="workspace-eyebrow">404 · Project</p><h1 className="mt-3">This project doesn’t exist.</h1><p>It may have been removed, or the link may be incorrect.</p><Link href="/projects" className="primary-button mt-5">Explore projects</Link></div></main>;
}
