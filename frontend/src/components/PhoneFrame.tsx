import type { ReactNode } from "react";

interface PhoneFrameProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Bordered, phone-proportioned card that every page renders its content into — the
 * "clear frame" look requested to sit on top of the persistent photo backdrop. Header/body/
 * footer are a flex column with `overflow-hidden` on the frame itself, so a footer (composer,
 * CTA) can never visually spill past the rounded border — it's always laid out inside.
 */
export function PhoneFrame({ header, footer, children }: PhoneFrameProps) {
  return (
    <div className="flex h-[85vh] max-h-[840px] min-h-[560px] w-full max-w-[440px] flex-col overflow-hidden rounded-card border-2 border-card bg-surface-card shadow-card">
      {header && <div className="shrink-0 border-b border-hairline">{header}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-hairline">{footer}</div>}
    </div>
  );
}
