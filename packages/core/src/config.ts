/**
 * Product configuration shared by the web app, CLI and render worker contract.
 * Safe to import from client code: contains no secrets.
 */

export const BRAND = {
  name: "Vidlore",
  tagline: "Stories that tell themselves.",
  domain: "vidlore.app",
} as const;

export const LIMITS = {
  perUserDaily: 2,
  globalDaily: 15,
  topicMaxLength: 200,
  scriptMaxChars: 1400,
} as const;

export type MusicMood = "dark" | "uplift" | "mystery" | "warm";

/** Moving overlays the render worker can add on AI scenes (worker/vidlore_worker/motion.py). */
export const EFFECTS = ["none", "fog", "dust", "embers", "rain", "snow"] as const;
export type Effect = (typeof EFFECTS)[number];
export type Atmosphere = Effect | "grain" | "flicker";

/** Where scene visuals come from. "auto" = real stock footage when a scene can be filmed, else AI art. */
export const VISUALS = [
  { id: "auto", label: "Mix", description: "Real footage where it fits, animated AI scenes elsewhere" },
  { id: "stock", label: "Real footage", description: "Filmed stock clips for every scene we can match" },
  { id: "ai", label: "AI scenes", description: "Painted scenes brought to life with 3D camera motion" },
] as const;
export type VisualsId = (typeof VISUALS)[number]["id"];
export const VISUALS_IDS = VISUALS.map((v) => v.id) as [VisualsId, ...VisualsId[]];

export const NICHES = [
  {
    id: "scary",
    label: "Scary stories",
    emoji: "🕯️",
    music: "dark",
    voice: "am_fenrir",
    atmosphere: ["fog", "dust", "flicker", "grain"],
    guidance:
      "A short first-person or campfire-style horror story with a creeping build-up and a chilling twist at the end. Unsettling, never gory.",
    suggestions: [
      "The night shift at an empty hospital",
      "A voicemail from my own phone number",
      "The neighbor who only comes out at 3 AM",
    ],
  },
  {
    id: "history",
    label: "History",
    emoji: "🏛️",
    music: "mystery",
    voice: "am_michael",
    atmosphere: ["dust", "grain"],
    guidance:
      "A gripping, accurate mini-documentary about a real historical event or person. Lead with the most surprising fact. Avoid made-up details.",
    suggestions: [
      "The dancing plague of 1518",
      "How Cleopatra really lived",
      "The great emu war",
    ],
  },
  {
    id: "motivation",
    label: "Motivation",
    emoji: "🔥",
    music: "uplift",
    voice: "am_michael",
    atmosphere: ["dust"],
    guidance:
      "An energetic, second-person motivational piece with one clear idea, a vivid example and a strong call to action.",
    suggestions: [
      "Why discipline beats motivation",
      "The 1% rule that changes everything",
      "Start before you feel ready",
    ],
  },
  {
    id: "facts",
    label: "Fun facts",
    emoji: "🧠",
    music: "warm",
    voice: "af_heart",
    atmosphere: ["dust"],
    guidance:
      "A fast-paced list of surprising, true facts around one theme. Each fact punchy and easy to picture.",
    suggestions: [
      "Weird facts about octopuses",
      "Things you didn't know about space",
      "Strange laws that still exist",
    ],
  },
  {
    id: "mythology",
    label: "Mythology",
    emoji: "⚡",
    music: "mystery",
    voice: "bf_emma",
    atmosphere: ["embers", "fog", "grain"],
    guidance:
      "An epic retelling of a myth or legend with vivid imagery and a clear moral or ending.",
    suggestions: [
      "How Medusa became a monster",
      "Thor and the giant's cat",
      "The legend of the Wendigo",
    ],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  emoji: string;
  music: MusicMood;
  voice: string;
  atmosphere: readonly Atmosphere[];
  guidance: string;
  suggestions: readonly string[];
}>;

export const STYLES = [
  {
    id: "cinematic",
    label: "Cinematic",
    prompt:
      "cinematic film still, dramatic lighting, shallow depth of field, 35mm photography, rich color grading, highly detailed",
  },
  {
    id: "anime",
    label: "Anime",
    prompt:
      "anime key visual, studio quality cel shading, vibrant colors, detailed background art, expressive lighting",
  },
  {
    id: "dark-fantasy",
    label: "Dark fantasy",
    prompt:
      "dark fantasy digital painting, moody atmosphere, volumetric fog, painterly brush strokes, muted palette with glowing highlights",
  },
  {
    id: "comic",
    label: "Comic ink",
    prompt:
      "graphic novel illustration, bold ink lines, halftone shading, dramatic comic panel composition, limited color palette",
  },
] as const;

export const VOICES = [
  { id: "am_fenrir", label: "Fenrir", description: "Deep and dramatic", lang: "en-us" },
  { id: "am_michael", label: "Michael", description: "Clear narrator", lang: "en-us" },
  { id: "af_heart", label: "Heart", description: "Warm and friendly", lang: "en-us" },
  { id: "bf_emma", label: "Emma", description: "British storyteller", lang: "en-gb" },
] as const;

export const LENGTHS = [30, 60] as const;

export type NicheId = (typeof NICHES)[number]["id"];
export type StyleId = (typeof STYLES)[number]["id"];
export type VoiceId = (typeof VOICES)[number]["id"];
export type LengthSec = (typeof LENGTHS)[number];

export const NICHE_IDS = NICHES.map((n) => n.id) as [NicheId, ...NicheId[]];
export const STYLE_IDS = STYLES.map((s) => s.id) as [StyleId, ...StyleId[]];
export const VOICE_IDS = VOICES.map((v) => v.id) as [VoiceId, ...VoiceId[]];

export function getNiche(id: NicheId) {
  return NICHES.find((n) => n.id === id)!;
}
export function getStyle(id: StyleId) {
  return STYLES.find((s) => s.id === id)!;
}
export function getVoice(id: VoiceId) {
  return VOICES.find((v) => v.id === id)!;
}

/** Roughly 2.5 spoken words per second at Kokoro's default speed. */
export function lengthPlan(seconds: LengthSec) {
  return seconds === 30
    ? { scenes: 6, minWords: 65, maxWords: 80 }
    : { scenes: 10, minWords: 130, maxWords: 155 };
}
