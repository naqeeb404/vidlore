import type { Metadata } from "next";
import { CreateForm } from "./create-form";

export const metadata: Metadata = {
  title: "Create a video",
  description: "Pick a niche, style and voice, type a topic and get a finished faceless short video.",
};

export default function CreatePage() {
  return (
    <div className="glow">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Create a video</h1>
        <p className="mt-2 text-muted">A few quick choices. You'll review the script before anything is rendered.</p>
        <CreateForm />
      </div>
    </div>
  );
}
