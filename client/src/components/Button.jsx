export function Button({ children, icon: Icon, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-ahmc-navy text-white hover:bg-ahmc-blue",
    secondary: "bg-white text-ahmc-navy border border-slate-300 hover:bg-slate-50",
    ghost: "text-ahmc-navy hover:bg-white"
  };

  return (
    <button
      className={`focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
