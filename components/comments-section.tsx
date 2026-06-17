"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type Comment = {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string | Date;
  user: { id: string; email: string };
};

export function CommentsSection({
  comments,
  targetId,
  clerkConfigured
}: {
  comments: Comment[];
  targetId?: string;
  clerkConfigured: boolean;
}) {
  const clerkReady = clerkConfigured;

  if (!clerkReady) {
    return <CommentsSectionShell comments={comments} targetId={targetId} authMode="disabled" />;
  }

  return <CommentsSectionWithAuth comments={comments} targetId={targetId} />;
}

function CommentsSectionWithAuth({ comments, targetId }: { comments: Comment[]; targetId?: string }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sortedComments = useMemo(
    () => [...comments].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [comments]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!targetId) {
      setError("This title is missing a review target.");
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/movies/${targetId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, text }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "We couldn't save your review right now.");
      return;
    }

    setSuccess("Your review is live.");
    setText("");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="w-full">
      <div id="comments" className="space-y-6 pt-4">
        <h3 className="border-b border-[#222222] pb-3 text-xl font-bold uppercase tracking-widest text-zinc-300">Comments</h3>
        {sortedComments.length > 0 ? (
          <div className="space-y-6">
            {sortedComments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#222222] text-sm font-bold text-emerald-500">
                  {comment.user.email.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-zinc-200">{comment.user.email.split("@")[0]}</strong>
                      <span className="text-xs text-zinc-600">• {formatRelativeDate(comment.createdAt)}</span>
                    </div>
                    <span className="flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {comment.rating}/5
                    </span>
                  </div>
                  <div className="rounded-[1rem] rounded-tl-none border border-[#222222] bg-[#161616] p-4 text-sm leading-relaxed text-zinc-400 shadow-sm">
                    {comment.text || <span className="italic text-zinc-600">No comment provided.</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">No comments yet. Be the first to start the discussion.</p>
        )}
      </div>

      <div id="add-comment" className="mt-8 space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-widest text-zinc-300">Add Comment</h3>
        <div className="rounded-[0.5rem] bg-[#222222] p-5 shadow-inner">
          {!isLoaded ? (
            <p className="text-sm text-zinc-500">Loading review tools...</p>
          ) : !isSignedIn ? (
            <div className="space-y-3 rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-4">
              <p className="text-sm text-zinc-400">
                Sign in to leave a rating or update your review for this title.
              </p>
              <Link
                href="/sign-in"
                className="inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-black transition hover:bg-emerald-400"
              >
                Sign in to review
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Your rating</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                        rating === value
                          ? "bg-amber-400 text-black"
                          : "border border-[#333333] bg-[#1a1a1a] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {value} Star{value > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Share what stood out to you about this title..."
                  rows={6}
                  maxLength={2000}
                  className="w-full resize-none rounded bg-[#1a1a1a] p-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-zinc-500">Reviews are tied to your account and can be updated later.</p>
                <button
                  type="submit"
                  disabled={isPending}
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 px-8 py-3 text-sm font-bold uppercase tracking-[0.15em] text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  {isPending ? "Saving..." : "Submit Review"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentsSectionShell({
  comments,
  targetId,
  authMode,
}: {
  comments: Comment[];
  targetId?: string;
  authMode: "disabled";
}) {
  const sortedComments = useMemo(
    () => [...comments].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [comments]
  );

  return (
    <div className="w-full">
      <div id="comments" className="space-y-6 pt-4">
        <h3 className="border-b border-[#222222] pb-3 text-xl font-bold uppercase tracking-widest text-zinc-300">Comments</h3>
        {sortedComments.length > 0 ? (
          <div className="space-y-6">
            {sortedComments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#222222] text-sm font-bold text-emerald-500">
                  {comment.user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-zinc-200">{comment.user.email.split("@")[0]}</strong>
                      <span className="text-xs text-zinc-600">• {formatRelativeDate(comment.createdAt)}</span>
                    </div>
                    <span className="flex items-center gap-1 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {comment.rating}/5
                    </span>
                  </div>
                  <div className="rounded-[1rem] rounded-tl-none border border-[#222222] bg-[#161616] p-4 text-sm leading-relaxed text-zinc-400 shadow-sm">
                    {comment.text || <span className="italic text-zinc-600">No comment provided.</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-600">No comments yet. Be the first to start the discussion.</p>
        )}
      </div>

      <div id="add-comment" className="mt-8 space-y-4">
        <h3 className="text-xl font-bold uppercase tracking-widest text-zinc-300">Add Comment</h3>
        <div className="rounded-[0.5rem] bg-[#222222] p-5 shadow-inner">
          <div className="space-y-3 rounded-xl border border-[#2b2b2b] bg-[#1a1a1a] p-4">
            <p className="text-sm text-zinc-400">
              {authMode === "disabled"
                ? "Reviews are available once Clerk authentication is configured."
                : "Sign in to leave a review for this title."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRelativeDate(value: Date | string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
