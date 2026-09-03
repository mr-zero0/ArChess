import { type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "icon" | "secondary";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const baseClasses = "transition-all duration-160";
  const variants = {
    primary: "min-h-[44px] px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-cyan-500/30",
    icon: "min-w-[44px] min-h-[44px] flex items-center justify-center border border-slate-700/50 rounded-xl bg-slate-900/70 text-slate-300 hover:text-white hover:border-cyan-500/50 hover:bg-slate-800",
    secondary: "min-h-[44px] px-4 py-2 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-300 hover:border-slate-700 transition-colors"
  };

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${className}`} 
      {...props} 
    />
  );
}
