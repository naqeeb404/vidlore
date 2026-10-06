import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Captions,
  Check,
  Clapperboard,
  Download,
  Film,
  Mic,
  Sparkles,
  Wand2,
} from "lucide-react";
import { NICHES } from "@vidlore/core";
import { ExampleCard } from "@/components/example-card";
import { PhoneFrame } from "@/components/phone-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EXAMPLES, examplePoster } from "@/content/examples";
import { PLANS } from "@/content/pricing";

const STEPS = [
  { icon: Wand2, title: "Pick a niche and topic", body: "Scary stories, history, motivation, fun facts or mythology. Type a topic or tap a suggestion." },
  { icon: Mic, title: "Choose a style and voice", body: "Four art styles and four natural voices. Review and edit the script before anything is rendered." },
  { icon: Download, title: "Get your video", body: "In a few minutes you get a vertical MP4 with motion, captions and music, ready to post." },
];

const FEATURES = [
  { icon: Film, title: "Motion on every scene", body: "Slow cinematic zooms and pans bring each AI-painted scene to life, with smooth crossfades between them." },
  { icon: Captions, title: "Word-by-word captions", body: "Bold captions timed to the voice, with the spoken word highlighted, so viewers keep watching with the sound off." },
  { icon: AudioLines, title: "Natural voices + music", body: "Expressive narration with background music that automatically dips under the voice." },
  { icon: Clapperboard, title: "Ready for every platform", body: "1080×1920 MP4 (H.264 + AAC), 30 or 60 seconds. Upload as-is to TikTok, Instagram Reels and YouTube Shorts." },
];

const FAQ = [
  {
    q: "What does Vidlore do?",
    a: "You give it a topic. It writes a short script, paints a scene for every line, records a voiceover, syncs word-by-word captions, adds music and renders a vertical video you can download.",
  },
  {
    q: "Is it free?",
    a: "Yes. During the demo every video is free, with a small daily limit per visitor so everyone gets a turn. The plans above are a preview of future pricing; there is no payment step.",
  },
  {
    q: "Who owns the videos?",
    a: "You do. Use the videos you create however you like, including on monetized channels. You are responsible for checking that your topic and script don't infringe anyone else's rights.",
  },
  {
    q: "Which platforms does it work with?",
    a: "Videos are 1080×1920 MP4 files with H.264 video and AAC audio, the format TikTok, Instagram Reels and YouTube Shorts recommend. No conversion needed.",
  },
  {
    q: "Do I need to disclose that the video is AI-generated?",
    a: "The script, images and voice are AI-generated. TikTok, Instagram and YouTube ask creators to label realistic AI content, so we recommend turning on each platform's AI-generated label when you post.",
  },
  {
    q: "Do I need an account?",
    a: "No. Your videos are remembered in this browser under My videos. Save the download if you want to keep a video, since demo videos may be cleaned up after a while.",
  },
];

export default function Home() {
  const hero = EXAMPLES[0];
  return (
    <>
      {/* Hero */}
      <section className="glow relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-20 md:pb-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted">
              <Sparkles className="size-3.5 text-accent" /> Free during the demo · no sign-up
            </p>
            <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn any topic into a <span className="text-gradient">viral-ready short</span> in minutes.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Vidlore writes the script, paints the scenes, records the voiceover and syncs the captions. You just pick the
              topic.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/create">
                  Create a free video <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#examples">See examples</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {["1080×1920 MP4", "Synced captions", "30 or 60 seconds"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-accent" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-[290px]">
            <PhoneFrame>
              <video
                className="h-full w-full object-cover"
                src="/examples/hero.mp4"
                poster={examplePoster(hero.slug)}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                aria-label={`Sample video: ${hero.title}`}
              />
            </PhoneFrame>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="How it works" title="Three steps. No editing skills." />
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary">
                      <step.icon className="size-5" />
                    </span>
                    <span className="font-display text-sm text-muted">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 text-muted">{step.body}</p>
                </Card>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {NICHES.map((n) => (
              <span key={n.id} className="rounded-full border border-border bg-surface px-4 py-2 text-sm">
                {n.emoji} {n.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="scroll-mt-20 border-t border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="Examples" title="Made with Vidlore, start to finish" sub="Every one of these was generated from a single topic. Tap to play with sound." />
          <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <ExampleCard key={ex.slug} example={ex} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="Features" title="Everything a short needs to hold attention" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <Card key={f.title} className="flex gap-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
                  <f.icon className="size-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-muted">{f.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 border-t border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="Pricing" title="Simple plans when we launch" sub="Everything is free during the demo. These plans are a preview." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={plan.popular ? "relative border-primary bg-surface shadow-[0_20px_60px_-30px_var(--primary)]" : "relative"}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted">/mo</span>
                </p>
                <p className="mt-1 text-sm text-muted">{plan.videos} videos per month</p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" /> {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 mb-3 text-center text-xs font-semibold tracking-wide text-accent uppercase">Free during the demo</p>
                <Button asChild variant={plan.popular ? "primary" : "outline"} className="w-full">
                  <Link href="/create">Try it free</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-10 divide-y divide-border rounded-3xl border border-border bg-surface">
            {FAQ.map((item) => (
              <details key={item.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {item.q}
                  <span className="text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="glow border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Your next short is one topic away.</h2>
          <p className="mt-4 text-muted">No account, no editing, no cost during the demo.</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/create">
              Create a free video <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-muted">{sub}</p>}
    </div>
  );
}
