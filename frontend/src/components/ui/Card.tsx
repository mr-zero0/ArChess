import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-950/40 p-6 shadow-2xl ${className}`}>
      {children}
    </div>
  );
}
