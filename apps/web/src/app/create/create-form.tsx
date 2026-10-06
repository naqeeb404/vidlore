"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Pause, Play } from "lucide-react";
import {
  getNiche,
  LENGTHS,
  LIMITS,
  NICHES,
  STYLES,
  VOICES,
  type LengthSec,
  type NicheId,
  type PublicJob,
  type StyleId,
  type VoiceId,
} from "@vidlore/core";
import { LimitReached } from "@/components/limit-reached";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { saveVideo } from "@/lib/my-videos";
import { cn } from "@/lib/utils";


const WAIT_MESSAGES = [
  "Writing your script…",
  "Finding a hook for the first two seconds…",
  "Planning the scenes…",
  "Polishing the ending…",
  "Almost there, the script writer is busy today…",
];

export function CreateForm() {
  const router = useRouter();
  const [niche, setNiche] = useState<NicheId>("scary");
  const [style, setStyle] = useState<StyleId>("cinematic");
  const [voice, setVoice] = useState<VoiceId>(getNiche("scary").voice);
  const [voiceTouched, setVoiceTouched] = useState(false);
  const [length, setLength] = useState<LengthSec>(30);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [waitIdx, setWaitIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    api<{ visitor: number; global: number }>("/api/limits")
      .then((r) => setLimitReached(r.visitor === 0 || r.global === 0))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setWaitIdx((i) => Math.min(i + 1, WAIT_MESSAGES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [busy]);

  function pickNiche(id: NicheId) {
    setNiche(id);
    if (!voiceTouched) setVoice(getNiche(id).voice);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setWaitIdx(0);
    try {
      const res = await api<{ job: PublicJob; ownerToken: string }>("/api/jobs", {
        method: "POST",
        body: JSON.stringify({ niche, style, voice, length, topic, visuals: "stock" }),
      });
      saveVideo({ id: res.job.id, token: res.ownerToken, createdAt: res.job.createdAt });
      router.push(`/v/${res.job.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "daily_limit") setLimitReached(true);
      else setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (limitReached) return <div className="mt-10"><LimitReached /></div>;

  const nicheData = getNiche(niche);

  return (
    <form onSubmit={submit} className="mt-10 space-y-10">
      <Field label="1. Niche">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {NICHES.map((n) => (
            <Choice key={n.id} selected={niche === n.id} onClick={() => pickNiche(n.id)}>
              <span className="text-2xl" aria-hidden="true">{n.emoji}</span>
              <span className="mt-2 block font-semibold">{n.label}</span>
            </Choice>
          ))}
        </div>
      </Field>

      <Field label="2. Look">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STYLES.map((s) => (
            <Choice key={s.id} selected={style === s.id} onClick={() => setStyle(s.id)} className="p-2">
              <span className="block aspect-[4/3] rounded-xl" style={{ background: s.swatch }} aria-hidden="true" />
              <span className="mt-2 block px-1 font-semibold">{s.label}</span>
              <span className="block px-1 pb-1 text-xs text-muted">{s.description}</span>
            </Choice>
          ))}
        </div>
      </Field>

      <Field label="3. Voice">
        <div className="grid gap-3 sm:grid-cols-2">
          {VOICES.map((v) => (
            <Choice
              key={v.id}
              selected={voice === v.id}
              onClick={() => {
                setVoice(v.id);
                setVoiceTouched(true);
              }}
              className="flex items-center justify-between gap-3"
            >
              <span>
                <span className="block font-semibold">{v.label}</span>
                <span className="block text-sm text-muted">{v.description}</span>
              </span>
              <VoicePreview id={v.id} label={v.label} />
            </Choice>
          ))}
        </div>
      </Field>

      <Field label="4. Topic" htmlFor="topic">
        <textarea
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={LIMITS.topicMaxLength}
          rows={2}
          required
          minLength={3}
          placeholder={nicheData.suggestions[0]}
          className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-base outline-none placeholder:text-muted/70 focus:border-primary"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {nicheData.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTopic(s)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">
            {topic.length}/{LIMITS.topicMaxLength}
          </span>
        </div>
      </Field>

      <Field label="Length">
        <div className="inline-flex rounded-full border border-border bg-surface p-1" role="radiogroup" aria-label="Video length">
          {LENGTHS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={length === l}
              onClick={() => setLength(l)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                length === l ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {l} seconds
            </button>
          ))}
        </div>
      </Field>

      {error && (
        <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-col items-start gap-3 border-t border-border pt-8 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={busy || topic.trim().length < 3}>
          {busy ? <Loader2 className="animate-spin" /> : null}
          {busy ? "Writing script…" : "Write my script"}
          {!busy && <ArrowRight />}
        </Button>
        <p className="text-sm text-muted" aria-live="polite">
          {busy ? WAIT_MESSAGES[waitIdx] : "Free during the demo. You can edit the script next."}
        </p>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="mb-3 block font-display text-lg font-bold">{label}</label>
      ) : (
        <legend className="mb-3 font-display text-lg font-bold">{label}</legend>
      )}
      {children}
    </fieldset>
  );
}

function Choice({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer rounded-2xl border bg-surface p-4 text-left transition-colors",
        selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-muted/50",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Plays a short pre-recorded sample of each Kokoro voice from public/voices. */
function VoicePreview({ id, label }: { id: VoiceId; label: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => audio.current?.pause(), []);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!audio.current) {
      audio.current = new Audio(`/voices/${id}.mp3`);
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audio.current.pause();
      audio.current.currentTime = 0;
      setPlaying(false);
    } else {
      void audio.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${playing ? "Stop" : "Play"} ${label} voice sample`}
      className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-2 text-foreground hover:border-primary"
    >
      {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
    </button>
  );
}
