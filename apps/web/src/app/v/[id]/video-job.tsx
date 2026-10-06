"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Download, Loader2, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { getNiche, getStyle, getVoice, type JobStatus, type PublicJob, type Script } from "@vidlore/core";
import { LimitReached } from "@/components/limit-reached";
import { PhoneFrame } from "@/components/phone-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api, ApiError, type JobResponse } from "@/lib/api";
import { tokenFor } from "@/lib/my-videos";
import { cn } from "@/lib/utils";

const WORKING: JobStatus[] = ["writing_script", "making_images", "recording_voice", "rendering"];

export function VideoJob({ id }: { id: string }) {
  const [job, setJob] = useState<PublicJob | null>(null);
  const [notFound, setNotFound] = useState(false);
  // Read lazily: the first render (server and client) shows a loader, so this cannot cause a hydration mismatch.
  const [token] = useState<string | undefined>(() => (typeof window === "undefined" ? undefined : tokenFor(id)));
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<null | "daily" | "images">(null);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api<JobResponse>(`/api/jobs/${id}`);
      setJob(res.job);
      return res.job;
    } catch {
      setNotFound(true);
      return null;
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    api<JobResponse>(`/api/jobs/${id}`)
      .then((res) => !cancelled && setJob(res.job))
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Each phase is a new screen: start it at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [job?.status]);

  // Poll while the server or the worker is busy.
  useEffect(() => {
    if (!job || !WORKING.includes(job.status) || (job.status === "making_images" && running.current)) return;
    const t = setTimeout(refresh, 2500);
    return () => clearTimeout(t);
  }, [job, refresh]);

  /** Paint missing scenes one request at a time, then hand off to the render worker. */
  const make = useCallback(
    async (script?: Script) => {
      if (!token || running.current) return;
      running.current = true;
      setError(null);
      try {
        if (script) setJob((await api<JobResponse>(`/api/jobs/${id}`, { method: "PATCH", token, body: JSON.stringify({ script }) })).job);
        const current = (await api<JobResponse>(`/api/jobs/${id}`)).job;
        const total = current.script?.scenes.length ?? 0;
        for (let n = 0; n < total; n++) {
          let res: JobResponse;
          try {
            res = await api<JobResponse>(`/api/jobs/${id}/scenes/${n}`, { method: "POST", token });
          } catch (err) {
            if (err instanceof ApiError && (err.code === "daily_limit" || err.code === "image_quota")) throw err;
            res = await api<JobResponse>(`/api/jobs/${id}/scenes/${n}`, { method: "POST", token }); // retry once
          }
          setJob(res.job);
        }
        setJob((await api<JobResponse>(`/api/jobs/${id}/render`, { method: "POST", token })).job);
      } catch (err) {
        if (err instanceof ApiError && err.code === "daily_limit") setLimitReached("daily");
        if (err instanceof ApiError && err.code === "image_quota") setLimitReached("images");
        setError(err instanceof Error ? err.message : "Something went wrong.");
        await refresh();
      } finally {
        running.current = false;
      }
    },
    [id, token, refresh],
  );

  // Reloaded the page halfway through painting? Pick up where we left off.
  useEffect(() => {
    if (job?.status === "making_images" && token && !running.current) void make();
  }, [job?.status, token, make]);

  if (notFound) {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="font-display text-2xl font-bold">Video not found</h1>
        <p className="mt-2 text-muted">It may have been deleted, or the link is incomplete.</p>
        <Button asChild className="mt-6">
          <Link href="/create">Create a video</Link>
        </Button>
      </Card>
    );
  }
  if (!job) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const isOwner = Boolean(token);
  if (limitReached) return <LimitReached reason={limitReached} />;

  if (job.status === "script_ready") {
    return isOwner && job.script ? (
      <ScriptEditor job={job} onMake={make} error={error} />
    ) : (
      <Pending title="This video hasn't been made yet" />
    );
  }

  if (job.status === "done") return <Finished job={job} />;

  if (job.status === "failed") {
    const canRetry = isOwner && Boolean(job.script);
    return (
      <Card className="mx-auto max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-danger/15 text-danger">
          <AlertTriangle className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">This video didn't finish</h1>
        <p className="mt-2 text-muted">{error ?? job.error ?? "Something went wrong."}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {canRetry && (
            <Button onClick={() => void make()}>
              <RotateCcw /> Try again
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/create">Start over</Link>
          </Button>
        </div>
        {canRetry && <p className="mt-4 text-xs text-muted">Finished steps are kept, so a retry is quicker.</p>}
      </Card>
    );
  }

  return <Progress job={job} error={error} />;
}

function ScriptEditor({ job, onMake, error }: { job: PublicJob; onMake: (s: Script) => Promise<void>; error: string | null }) {
  const [script, setScript] = useState<Script>(job.script!);
  const [busy, setBusy] = useState(false);
  const words = script.scenes.map((s) => s.narration).join(" ").trim().split(/\s+/).filter(Boolean).length;
  const seconds = Math.round(words / 2.5);
  const valid = script.title.trim() && script.scenes.every((s) => s.narration.trim()) && seconds <= 75;

  function setNarration(i: number, narration: string) {
    setScript((s) => ({ ...s, scenes: s.scenes.map((sc, j) => (j === i ? { ...sc, narration } : sc)) }));
  }

  return (
    <div>
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">Step 1 of 2 · Review your script</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Make it yours, then hit make.</h1>
      <Summary job={job} />

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-muted">Title</span>
          <input
            value={script.title}
            maxLength={100}
            onChange={(e) => setScript((s) => ({ ...s, title: e.target.value }))}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 font-display text-lg font-bold outline-none focus:border-primary"
          />
        </label>
        {script.scenes.map((scene, i) => (
          <label key={i} className="flex gap-4 rounded-2xl border border-border bg-surface p-4 focus-within:border-primary">
            <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
              {i + 1}
            </span>
            <textarea
              value={scene.narration}
              maxLength={400}
              rows={2}
              onChange={(e) => setNarration(i, e.target.value)}
              aria-label={`Scene ${i + 1} narration`}
              className="w-full resize-y bg-transparent leading-relaxed outline-none"
            />
          </label>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 mt-8 flex flex-col gap-3 border-t border-border bg-background/90 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className={cn("text-sm", seconds > 75 ? "text-danger" : "text-muted")}>
          {words} words · about {seconds} seconds{seconds > 75 ? " — too long, trim a little" : ""}
        </p>
        <Button
          size="lg"
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            await onMake(script);
            setBusy(false);
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} Make video
        </Button>
      </div>
    </div>
  );
}

const STEPS: { key: JobStatus; label: string }[] = [
  { key: "writing_script", label: "Writing script" },
  { key: "making_images", label: "Finding footage & painting scenes" },
  { key: "recording_voice", label: "Recording voice & timing captions" },
  { key: "rendering", label: "Rendering video" },
  { key: "done", label: "Done" },
];

function Progress({ job, error }: { job: PublicJob; error: string | null }) {
  const current = STEPS.findIndex((s) => s.key === job.status);
  const total = job.script?.scenes.length ?? 0;
  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">Step 2 of 2 · Making your video</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">{job.script?.title ?? "Your video"}</h1>
      <p className="mt-2 text-muted">This usually takes a few minutes. You can leave this page; it keeps going and you'll find it in My videos.</p>
      <Card className="mt-8">
        <ol className="space-y-5" aria-live="polite">
          {STEPS.map((step, i) => {
            const state = i < current ? "done" : i === current ? "active" : "todo";
            return (
              <li key={step.key} className="flex items-center gap-4">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border",
                    state === "done" && "border-primary bg-primary text-primary-foreground",
                    state === "active" && "border-primary text-primary",
                    state === "todo" && "border-border text-muted",
                  )}
                >
                  {state === "done" ? <Check className="size-4" /> : state === "active" ? <Loader2 className="size-4 animate-spin" /> : i + 1}
                </span>
                <span className={cn("font-medium", state === "todo" && "text-muted")}>
                  {step.label}
                  {step.key === "making_images" && state === "active" && total > 0 && (
                    <span className="ml-2 text-sm text-muted">
                      {job.imagesDone}/{total}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
        {job.status === "making_images" && total > 0 && (
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(job.imagesDone / total) * 100}%` }} />
          </div>
        )}
      </Card>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}

function Finished({ job }: { job: PublicJob }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid items-start gap-10 md:grid-cols-[minmax(0,320px)_1fr]">
      <div className="mx-auto w-full max-w-[300px]">
        <PhoneFrame>
          <video src={job.videoUrl} poster={job.thumbnailUrl} className="h-full w-full object-cover" controls playsInline autoPlay />
        </PhoneFrame>
      </div>
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent">
          <Sparkles className="size-4" /> Your video is ready
        </p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">{job.script?.title}</h1>
        <Summary job={job} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={job.downloadUrl} download>
              <Download /> Download MP4
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
        <ul className="mt-8 space-y-2 text-sm text-muted">
          <li>1080×1920 MP4 · H.264 + AAC{job.durationSec ? ` · ${Math.round(job.durationSec)} seconds` : ""}</li>
          <li>Ready for TikTok, Instagram Reels and YouTube Shorts.</li>
          <li>Tip: turn on each platform's "AI-generated" label when you post.</li>
        </ul>
        <Credits job={job} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="ghost">
            <Link href="/create">Make another</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/videos">My videos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Pexels asks us to credit the videographers whose clips appear in the video. */
function Credits({ job }: { job: PublicJob }) {
  const credits = Object.entries(job.credits ?? {}).sort(([a], [b]) => Number(a) - Number(b));
  if (credits.length === 0) return null;
  const unique = [...new Map(credits.map(([, c]) => [c.url, c])).values()];
  return (
    <p className="mt-6 text-xs leading-relaxed text-muted">
      Footage and photos:{" "}
      {unique.map((c, i) => (
        <span key={c.url}>
          {i > 0 && ", "}
          <a href={c.url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
            {c.name}
          </a>
        </span>
      ))}{" "}
      on{" "}
      <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
        Pexels
      </a>
      .
    </p>
  );
}

function Summary({ job }: { job: PublicJob }) {
  const n = getNiche(job.input.niche);
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs">
      {[`${n.emoji} ${n.label}`, getStyle(job.input.style).label, `${getVoice(job.input.voice).label} voice`, `${job.input.length}s`].map((t) => (
        <span key={t} className="rounded-full border border-border bg-surface px-3 py-1 text-muted">
          {t}
        </span>
      ))}
    </div>
  );
}

function Pending({ title }: { title: string }) {
  return (
    <Card className="mx-auto max-w-lg text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">Check back in a few minutes.</p>
      <Button asChild className="mt-6">
        <Link href="/create">Create your own</Link>
      </Button>
    </Card>
  );
}
