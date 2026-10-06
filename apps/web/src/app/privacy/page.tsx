import type { Metadata } from "next";
import { BRAND } from "@vidlore/core";
import { ProsePage } from "@/components/prose-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy policy" updated="October 2026">
      <p>{BRAND.name} is built to collect as little as possible. There are no accounts, ads or tracking cookies.</p>
      <h2>What we store</h2>
      <p>
        The choices and topic you submit, the generated script, images, audio and video, and a salted one-way hash of
        your IP address used only to enforce the daily demo limit. We never store your raw IP address.
      </p>
      <h2>In your browser</h2>
      <p>
        Your browser's local storage keeps the list of videos you created and a private token that lets you edit or delete
        them. Clearing your browser data removes this list.
      </p>
      <h2>Service providers</h2>
      <p>
        Your topic and script are sent to Google Gemini to write the script and to Cloudflare Workers AI to paint the
        scenes, and short search phrases are sent to Pexels to find stock footage. Files are stored with Cloudflare R2 and the site is hosted on Netlify. Voice, captions and rendering run
        on our own open-source pipeline.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        You can delete a video at any time from My videos. Demo videos may also be removed automatically after some
        time.
      </p>
      <h2>Contact</h2>
      <p>Questions about privacy? Contact the site owner through {BRAND.domain}.</p>
    </ProsePage>
  );
}
