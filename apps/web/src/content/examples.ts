/**
 * Pre-made sample videos in public/examples, generated with `pnpm generate` and compressed for the web
 * (720×1280; downloads from the app are full 1080×1920).
 */
export const EXAMPLES = [
  { slug: "dancing-plague", title: "The Deadliest Dance in History", niche: "History", style: "Cinematic" },
  { slug: "voicemail", title: "The Voicemail From Me", niche: "Scary stories", style: "Dark fantasy" },
  { slug: "discipline", title: "Why Discipline Beats Motivation", niche: "Motivation", style: "Cinematic" },
  { slug: "octopus", title: "Weird Facts About Octopuses", niche: "Fun facts", style: "Anime" },
  { slug: "medusa", title: "The True Tragedy of Medusa", niche: "Mythology", style: "Dark fantasy" },
  // TODO: 6th example ("The neighbor who only comes out at 3 AM", scary/comic) once the image quota resets.
] as const;

export type Example = (typeof EXAMPLES)[number];

export const exampleVideo = (slug: string) => `/examples/${slug}.mp4`;
export const examplePoster = (slug: string) => `/examples/${slug}.jpg`;
