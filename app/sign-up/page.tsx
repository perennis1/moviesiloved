import { SignUp } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerk-config";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="rounded-[1.7rem] border border-white/10 bg-[#1e1f23] p-6">
          <h1 className="text-3xl font-semibold text-white">Clerk is not configured yet.</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Add your real Clerk publishable and secret keys in <code>.env</code>, then restart the dev server.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-10">
      <SignUp />
    </main>
  );
}
