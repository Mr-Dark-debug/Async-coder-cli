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
    <section className="relative pt-10 md:pt-16 pb-12 md:pb-16 border-b border-border">
      <div className="relative mx-auto max-w-7xl px-4 md:px-6">
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground mb-4">
          {eyebrow}
        </p>
        <h1 className="font-serif-display text-[clamp(2.4rem,6vw,4.6rem)] text-foreground max-w-4xl">
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
