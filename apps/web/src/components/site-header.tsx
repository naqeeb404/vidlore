import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/#examples", label: "Examples" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/videos", label: "My videos" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Vidlore home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/videos" className="px-1 text-sm whitespace-nowrap text-muted hover:text-foreground md:hidden">
            My videos
          </Link>
          <Button asChild size="sm">
            <Link href="/create">
              <Sparkles /> Create video
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
