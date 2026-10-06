import type { Metadata } from "next";
import { VideoJob } from "./video-job";

export const metadata: Metadata = {
  title: "Your video",
  robots: { index: false },
};

export default async function VideoPage(props: PageProps<"/v/[id]">) {
  const { id } = await props.params;
  return (
    <div className="glow min-h-[70vh]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
        <VideoJob id={id} />
      </div>
    </div>
  );
}
