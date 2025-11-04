import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Welcome to BioFlo</h1>
      <p className="text-slate-600">Your biohacking personal assistant.</p>
      <Link href="/chat" className="inline-block px-4 py-2 rounded-lg bg-black text-white text-sm">
        Open Chat
      </Link>
    </main>
  );
}
