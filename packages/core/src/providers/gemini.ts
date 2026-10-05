import { getNiche, getStyle, lengthPlan } from "../config";
import { script as scriptSchema } from "../schemas";
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
          imagePrompt: { type: "STRING" },
        },
        required: ["narration", "imagePrompt"],
      },
    },
  },
  required: ["title", "scenes"],
};

export const geminiWriteScript: WriteScript = async ({ topic, niche, style, length }) => {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const n = getNiche(niche);
  const s = getStyle(style);
  const plan = lengthPlan(length);

  const prompt = `You write scripts for faceless vertical short videos (TikTok, Reels, Shorts).

Niche: ${n.label}. ${n.guidance}
Topic: ${JSON.stringify(topic)}
Target length: ${length} seconds of narration, ${plan.minWords}-${plan.maxWords} words in total.
Split it into exactly ${plan.scenes} scenes.

Rules:
- Scene 1 is a hook that grabs attention in the first 2 seconds.
- Narration is plain spoken English: no emojis, hashtags, stage directions, speaker labels or markdown.
- Write numbers and abbreviations the way they should be spoken.
- The last scene lands the ending (twist, takeaway or call to action).
- imagePrompt describes ONE striking vertical (portrait 9:16) image for that scene: subject, setting, composition, lighting, mood. Keep characters consistent across scenes by repeating their key visual traits. No text, letters, logos or watermarks in the image. Do not name the art style; it is added separately.
- title is a short catchy video title (max 60 characters).
- Keep it suitable for a general audience: no graphic violence, sexual content, hate or real-person defamation.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
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
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (data.promptFeedback?.blockReason) {
    throw new Error("This topic can't be used. Please try a different one.");
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error(`Gemini returned no script (${data.candidates?.[0]?.finishReason ?? "unknown"})`);

  const parsed = scriptSchema.parse(JSON.parse(text));
  // Append the visual style here so the model can't drift from it.
  return {
    ...parsed,
    scenes: parsed.scenes.map((sc) => ({
      narration: sc.narration,
      imagePrompt: `${sc.imagePrompt}, ${s.prompt}, vertical composition`,
    })),
  };
};
