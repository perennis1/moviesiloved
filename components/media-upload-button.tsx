"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";

type MediaUploadButtonProps = {
  folder: "logos" | "profiles" | "screenshots";
  prefix: string;
  label: string;
  onUploaded: (url: string) => void;
  className?: string;
};

export function MediaUploadButton({
  folder,
  prefix,
  label,
  onUploaded,
  className = "",
}: MediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("prefix", prefix);

    try {
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to upload media.");
      }

      const data = (await response.json()) as { url: string };
      onUploaded(data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload media.");
    } finally {
      setUploading(false);
    }
  }

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    await uploadFile(file);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 transition-all hover:bg-emerald-500 hover:text-black disabled:opacity-60"
      >
        {uploading ? "Uploading..." : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      {error ? <p className="text-[11px] text-red-400">{error}</p> : null}
    </div>
  );
}
