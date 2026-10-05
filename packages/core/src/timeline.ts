import { getNiche, getVoice, type NicheId, type VoiceId } from "./config";
import type { Script, Timeline } from "./schemas";
import { keys } from "./storage";

export function buildTimeline(opts: {
  jobId: string;
  script: Script;
  niche: NicheId;
  voice: VoiceId;
  callbackUrl?: string;
}): Timeline {
  const { jobId, script, niche, voice } = opts;
  return {
    version: 1,
    jobId,
    title: script.title,
    voice,
    lang: getVoice(voice).lang,
    speed: 1,
    music: getNiche(niche).music,
    scenes: script.scenes.map((s, i) => ({ narration: s.narration, image: keys.scene(jobId, i) })),
    output: { video: keys.video(jobId), thumbnail: keys.thumbnail(jobId), workPrefix: keys.work(jobId) },
    ...(opts.callbackUrl ? { callback: { url: opts.callbackUrl } } : {}),
  };
}
