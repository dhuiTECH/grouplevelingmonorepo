import type { ReactNode } from "react";

export default function PhoneFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-[min(300px,92vw)] shrink-0 overflow-hidden rounded-[3.5rem] border-[10px] border-gl-outline bg-gl-surface-lowest shadow-2xl ring-4 ring-gl-primary/5 gl-glow-primary ${className}`}
    >
      <div className="absolute top-0 z-40 flex h-8 w-full justify-center bg-[#1d3557] pt-2">
        <div className="h-5 w-28 rounded-full bg-black" aria-hidden />
      </div>
      <div className="flex h-[min(620px,78svh)] min-h-[480px] flex-col pt-8">
        {children}
      </div>
    </div>
  );
}
