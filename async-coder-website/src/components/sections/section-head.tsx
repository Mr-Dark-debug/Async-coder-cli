import type { ReactNode } from "react";

/** Serif heading block shared by the home sections: small eyebrow, large title with one italic accent. */
export function SectionHead({
  eyebrow,
  title,
  accent,
  children,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  accent?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-3xl" : "max-w-3xl"}>
      {eyebrow && (
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-muted-foreground mb-4">
          {eyebrow}
        </p>
      )}
      <h2 className="font-serif-display text-[clamp(2.1rem,4.6vw,3.6rem)]">
        {title}
        {accent && (
          <>
            {" "}
            <em className="italic text-lavender-deep">{accent}</em>
          </>
        )}
      </h2>
      {children && (
        <p className="mt-5 text-[16.5px] leading-relaxed text-muted-foreground">{children}</p>
      )}
    </div>
  );
}
