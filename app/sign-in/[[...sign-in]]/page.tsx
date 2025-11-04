import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="max-w-md mx-auto p-6">
      <SignIn />
    </main>
  );
}
