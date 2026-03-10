import type { ReactNode } from "react";

interface GameViewportProps {
  title: string;
  children: ReactNode;
  forceDark?: boolean;
}

export default function GameViewport({
  title,
  children,
  forceDark,
}: GameViewportProps) {
  return (
    <section
      aria-label={title}
      className={`relative isolate flex h-full min-h-0 w-full ${forceDark ? "bg-[#0a0e1a]" : ""}`}
      {...(forceDark && { "data-theme": "dark" })}
    >
      <div className="gradient-mesh absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(0,240,255,0.16), transparent 28%), radial-gradient(circle at bottom left, rgba(255,184,0,0.14), transparent 24%)",
        }}
      />

      <div className="relative flex w-full min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 py-2 sm:px-6 lg:px-8 xl:px-10">
        {children}
      </div>
    </section>
  );
}
