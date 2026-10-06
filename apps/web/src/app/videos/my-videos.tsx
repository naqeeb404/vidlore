"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Film, Loader2, Play, Trash2 } from "lucide-react";
import type { PublicJob } from "@vidlore/core";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, ApiError, type JobResponse } from "@/lib/api";
import { forgetVideo, listSaved, type SavedVideo } from "@/lib/my-videos";

type Row = { saved: SavedVideo; job: PublicJob | null };

const STATUS_LABEL: Record<string, string> = {
  writing_script: "Writing script…",
  script_ready: "Script ready, not made yet",
  making_images: "Painting scenes…",
  recording_voice: "Recording voice…",
  rendering: "Rendering…",
  failed: "Didn't finish",
};

export function MyVideos() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const saved = listSaved();
    void Promise.all(
      saved.map(async (s): Promise<Row | null> => {
        try {
          return { saved: s, job: (await api<JobResponse>(`/api/jobs/${s.id}`)).job };
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            forgetVideo(s.id); // deleted or expired
            return null;
          }
          return { saved: s, job: null };
        }
      }),
    ).then((r) => setRows(r.filter((x): x is Row => x !== null)));
  }, []);

  async function remove(row: Row) {
    if (!window.confirm("Delete this video? This can't be undone.")) return;
    try {
      await api(`/api/jobs/${row.saved.id}`, { method: "DELETE", token: row.saved.token });
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        window.alert(err instanceof Error ? err.message : "Couldn't delete the video.");
        return;
      }
    }
    forgetVideo(row.saved.id);
    setRows((r) => r?.filter((x) => x.saved.id !== row.saved.id) ?? null);
  }

  if (!rows) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card className="mt-10 py-14 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
          <Film className="size-7" />
        </span>
        <h2 className="mt-5 font-display text-xl font-bold">No videos yet</h2>
        <p className="mt-2 text-muted">Your first one takes a few minutes. It's free during the demo.</p>
        <Button asChild className="mt-6">
          <Link href="/create">Create a video</Link>
        </Button>
      </Card>
    );
  }

  return (
    <ul className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
      {rows.map((row) => {
        const job = row.job;
        const done = job?.status === "done";
        return (
          <li key={row.saved.id} className="flex flex-col">
            <Link
              href={`/v/${row.saved.id}`}
              className="group relative block aspect-[9/16] overflow-hidden rounded-2xl border border-border bg-surface-2"
            >
              {done && job.thumbnailUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={job.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/30">
                    <span className="grid size-12 place-items-center rounded-full bg-white/90 text-black opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="ml-0.5 size-5 fill-current" />
                    </span>
                  </span>
                </>
              ) : (
                <span className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">
                  {job ? STATUS_LABEL[job.status] : "Couldn't load"}
                </span>
              )}
            </Link>
            <p className="mt-3 line-clamp-2 text-sm font-semibold">{job?.script?.title ?? job?.input.topic ?? "Untitled"}</p>
            <p className="text-xs text-muted">{new Date(row.saved.createdAt).toLocaleDateString()}</p>
            <div className="mt-2 flex gap-1">
              {done && job.downloadUrl && (
                <Button asChild size="sm" variant="outline">
                  <a href={job.downloadUrl} download aria-label="Download MP4">
                    <Download /> MP4
                  </a>
                </Button>
              )}
              <Button size="sm" variant="danger" onClick={() => void remove(row)} aria-label="Delete video">
                <Trash2 />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
