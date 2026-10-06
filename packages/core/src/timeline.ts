import { getNiche, getVoice, type NicheId, type StyleId, type VoiceId } from "./config";
import type { Script, Timeline } from "./schemas";
import { keys } from "./storage";

export function buildTimeline(opts: {
  jobId: string;
  script: Script;
  niche: NicheId;
  voice: VoiceId;
  style: StyleId;
  /** Per scene: the stored image or video key (see sceneMedia). */
  media: ({ image?: string; video?: string; videoUrl?: string } | null)[];
  callbackUrl?: string;
}): Timeline {
  const { jobId, script, niche, voice, media } = opts;
  return {
    version: 1,
    jobId,
    title: script.title,
    voice,
    lang: getVoice(voice).lang,
    speed: 1,
    music: getNiche(niche).music,
    atmosphere: [...getNiche(niche).atmosphere],
    grade: opts.style,
    scenes: script.scenes.map((s, i) => {
      const m = media[i];
      if (!m) throw new Error(`Scene ${i + 1} has no image or video yet`);
      return { narration: s.narration, effect: s.effect, ...m };
    }),
    output: { video: keys.video(jobId), thumbnail: keys.thumbnail(jobId), workPrefix: keys.work(jobId) },
    ...(opts.callbackUrl ? { callback: { url: opts.callbackUrl } } : {}),
  };
}
