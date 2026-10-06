import type * as React from "react";

export function ProsePage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-8 space-y-4 leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground">
        {children}
      </div>
    </article>
  );
}
