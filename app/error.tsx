"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur p-8 max-w-md">
        <h2 className="text-2xl font-semibold text-white mb-4">Something went wrong!</h2>
        <p className="text-slate-300 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-sky-500 text-black font-medium hover:brightness-110"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

