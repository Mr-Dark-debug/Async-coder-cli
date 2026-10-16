import type { ReactNode } from "react";

/** Serif heading block shared by sections: small eyebrow, large title with italic accent and organic handwriting note. */
export function SectionHead({
  eyebrow,
  title,
  accent,
  note,
  children,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  accent?: ReactNode;
  note?: string;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center mx-auto max-w-3xl" : "max-w-3xl"}>
      {eyebrow && (
        <div
          className={`flex items-center gap-2 mb-3.5 ${align === "center" ? "justify-center" : ""}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-lavender-deep" />
          <p className="text-[11.5px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            {eyebrow}
          </p>
        </div>
      )}
      <h2 className="font-serif-display text-[clamp(2.3rem,4.8vw,3.8rem)] leading-[1.04] text-foreground tracking-tight">
        {title}
        {accent && (
          <>
            {" "}
            <em className="italic text-lavender-deep font-normal">{accent}</em>
          </>
        )}
      </h2>
      {note && (
        <p
          className={`font-handwriting text-xl text-lavender-deep mt-2 ${align === "center" ? "text-center" : ""}`}
        >
          {note}
        </p>
      )}
      {children && (
        <p className="mt-4 text-[16px] md:text-[17px] leading-relaxed text-muted-foreground font-normal">
          {children}
        </p>
      )}
    </div>
  );
}
