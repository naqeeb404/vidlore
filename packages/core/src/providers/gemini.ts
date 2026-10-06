import { EFFECTS, getNiche, getStyle, lengthPlan } from "../config";
import { script as scriptSchema, type Script } from "../schemas";
import { requireEnv } from "./env";
import type { WriteScript } from "./types";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    scenes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          narration: { type: "STRING" },
          stockQueries: { type: "ARRAY", items: { type: "STRING" } },
          imagePrompt: { type: "STRING" },
          effect: { type: "STRING", enum: [...EFFECTS] },
        },
        required: ["narration", "stockQueries", "imagePrompt", "effect"],
      },
    },
  },
  required: ["title", "scenes"],
};

export const geminiWriteScript: WriteScript = async ({ topic, niche, style, length }) => {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest",
  ];
  const n = getNiche(niche);
  const s = getStyle(style);
  const plan = lengthPlan(length);

  const prompt = `You write scripts for faceless vertical short videos (TikTok, Reels, Shorts).

Niche: ${n.label}. ${n.guidance}
Topic: ${JSON.stringify(topic)}
Target length: ${length} seconds of narration, ${plan.minWords}-${plan.maxWords} words in total.
Split it into exactly ${plan.scenes} scenes of about ${Math.round(plan.minWords / plan.scenes)}-${Math.round(plan.maxWords / plan.scenes)} words each.

Rules:
- Scene 1 is a hook that grabs attention in the first 2 seconds.
- Narration is plain spoken English with normal punctuation (commas, full stops), which the voice uses for pacing. No emojis, hashtags, stage directions, speaker labels or markdown.
- Write numbers and abbreviations the way they should be spoken.
- The last scene lands the ending (twist, takeaway or call to action).
- The video is cut from REAL filmed stock footage (Pexels/Pixabay), one clip per scene. Write each scene so it can be shown with real b-roll: places, nature, weather, objects, hands, silhouettes, people seen from behind, crowds, cities, ruins, documents, light and shadow. For things no camera can film (monsters, gods, specific historical people), show them indirectly: a shadow in a doorway, storm clouds, an old statue, a candle-lit manuscript.
- stockQueries: exactly 3 searches for that scene's clip, most specific first, broadest last. 2-4 plain English words each, naming what is visible on screen, e.g. ["flashlight dark hospital corridor", "empty hospital hallway", "dark corridor"]. No names of people or brands, no abstract words like "fear" or "success" on their own.
- imagePrompt: one sentence describing the same shot as a still image (backup only).
- effect: "none" unless rain, snow or fog is clearly part of the scene ("rain", "snow", "fog").
- title is a short catchy video title (max 60 characters).
- Keep it suitable for a general audience: no graphic violence, sexual content, hate or real-person defamation.`;

  /** One generateContent call with backoff + model fallback. Returns the raw JSON text. */
  async function request(promptText: string): Promise<string> {
    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
      safetySettings: [
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
      ].map((category) => ({ category, threshold: "BLOCK_MEDIUM_AND_ABOVE" })),
    });

    // Free-tier models are often briefly overloaded (429/503): back off, then fall back to the lite model.
    let res: Response | undefined;
    let lastError = "";
    outer: for (const model of models) {
      for (const delay of [0, 2000, 5000]) {
        if (delay) await new Promise((r) => setTimeout(r, delay));
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: requestBody },
        );
        if (res.ok) break outer;
        lastError = `${model} ${res.status}: ${(await res.text()).slice(0, 200)}`;
        if (![429, 500, 503].includes(res.status)) break outer;
      }
    }
    if (!res?.ok) throw new Error(`Gemini request failed (${lastError})`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };
    if (data.promptFeedback?.blockReason) {
      throw new Error("This topic can't be used. Please try a different one.");
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text) throw new Error(`Gemini returned no script (${data.candidates?.[0]?.finishReason ?? "unknown"})`);
    return text;
  }

  const countWords = (sc: Script) => sc.scenes.map((x) => x.narration).join(" ").split(/\s+/).filter(Boolean).length;
  let parsed = scriptSchema.parse(JSON.parse(await request(prompt)));
  // Flash sometimes under-writes; a too-short script makes a too-short video. Ask once more.
  if (countWords(parsed) < plan.minWords * 0.85) {
    const retry = `${prompt}

IMPORTANT: a previous draft had only ${countWords(parsed)} words, which is too short. Write the full ${plan.minWords}-${plan.maxWords} words, about ${Math.round(plan.minWords / plan.scenes)}-${Math.round(plan.maxWords / plan.scenes)} words per scene.`;
    try {
      const second = scriptSchema.parse(JSON.parse(await request(retry)));
      if (countWords(second) > countWords(parsed)) parsed = second;
    } catch {
      // Keep the first draft.
    }
  }
  // Append the visual style here so the model can't drift from it.
  return {
    ...parsed,
    scenes: parsed.scenes.map((sc) => ({
      ...sc,
      imagePrompt: `${sc.imagePrompt}, ${s.prompt}, vertical composition`,
    })),
  };
};
