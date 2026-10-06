/** Planned plans, shown as a preview only. There is no payment flow during the demo. */
export const PLANS = [
  {
    name: "Starter",
    price: 19,
    videos: 12,
    popular: false,
    features: ["12 videos per month", "All niches, styles and voices", "1080×1920 MP4 downloads", "No watermark"],
  },
  {
    name: "Creator",
    price: 39,
    videos: 30,
    popular: true,
    features: ["30 videos per month", "Everything in Starter", "Priority rendering", "Custom background music"],
  },
  {
    name: "Pro",
    price: 69,
    videos: 60,
    popular: false,
    features: ["60 videos per month", "Everything in Creator", "Series & scheduling (soon)", "Auto-post to socials (soon)"],
  },
] as const;
