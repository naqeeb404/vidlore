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

/**
 * Where scene visuals come from. The product uses "stock": every scene is a real filmed clip.
 * "auto" and "ai" (AI images animated by the 3D camera engine) remain for the CLI and old jobs.
 */
export const VISUALS = [
  { id: "stock", label: "Real footage", description: "A real filmed clip for every scene" },
  { id: "auto", label: "Mix", description: "Real footage where it fits, animated AI scenes elsewhere" },
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
    footage: ["dark hallway", "foggy forest night", "abandoned house", "flickering light", "dark staircase", "full moon clouds"],
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
    footage: ["ancient ruins", "old map", "medieval castle", "old book candle", "historic architecture", "old town street"],
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
    footage: ["running at sunrise", "city timelapse", "mountain summit", "gym workout", "walking on road", "ocean waves sunrise"],
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
    footage: ["nature close up", "underwater ocean", "stars night sky", "science laboratory", "city aerial", "macro insect"],
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
    footage: ["storm clouds lightning", "ancient temple", "marble statue", "fire flames", "stormy sea", "misty mountains"],
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
  /** Generic b-roll searches used when a scene's own searches find nothing. */
  footage: readonly string[];
  guidance: string;
  suggestions: readonly string[];
}>;

/**
 * Visual style = colour grade applied to the real footage (worker/vidlore_worker/render.py GRADES).
 * `prompt` is only used for AI scenes (CLI "ai" mode).
 */
export const STYLES = [
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Warm highlights, teal shadows",
    swatch: "linear-gradient(135deg,#123a4a,#2d5d6b 45%,#d9893f)",
    prompt: "cinematic film still, dramatic lighting, shallow depth of field, 35mm photography, rich color grading",
  },
  {
    id: "moody",
    label: "Dark & moody",
    description: "Deep shadows, muted colour",
    swatch: "linear-gradient(135deg,#050508,#1b2230 55%,#4a5568)",
    prompt: "dark moody photograph, low key lighting, muted colors, heavy shadows, atmospheric",
  },
  {
    id: "vintage",
    label: "Vintage film",
    description: "Faded tones and film grain",
    swatch: "linear-gradient(135deg,#5a4630,#a88b5f 55%,#e8d5a8)",
    prompt: "vintage film photograph, faded colors, film grain, 1970s look",
  },
  {
    id: "vivid",
    label: "Vivid",
    description: "Bright, punchy, clean",
    swatch: "linear-gradient(135deg,#ff5f6d,#ffc371 50%,#47e5bc)",
    prompt: "vibrant high detail photograph, punchy saturated colors, crisp lighting",
  },
] as const;

/** Styles from before footage-only videos, mapped to the closest grade. */
export const LEGACY_STYLES: Record<string, string> = { anime: "vivid", "dark-fantasy": "moody", comic: "vintage" };

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

/** Roughly 2.5 spoken words per second at Kokoro's default speed. Short scenes = a cut every 3-5 s. */
export function lengthPlan(seconds: LengthSec) {
  return seconds === 30
    ? { scenes: 8, minWords: 65, maxWords: 80 }
    : { scenes: 14, minWords: 130, maxWords: 155 };
}
