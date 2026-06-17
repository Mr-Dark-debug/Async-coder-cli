import { type ReactNode } from "react";
import { SiteLayout } from "@/components/site-layout";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative pt-16 md:pt-24 pb-12 md:pb-16 overflow-hidden border-b border-border/60">
      <div className="absolute inset-0 hero-grid-bg opacity-70" aria-hidden />
      <div className="absolute inset-0 dot-grid opacity-20" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <div className="text-xs font-mono uppercase tracking-widest text-lavender mb-3">
          {eyebrow}
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.03em] text-foreground max-w-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

export function Page({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <SiteLayout>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-20">{children}</div>
    </SiteLayout>
  );
}
