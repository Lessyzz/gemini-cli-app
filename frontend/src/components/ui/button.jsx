import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-primary text-primary-foreground hover:opacity-90",
  outline:
    "border border-input bg-transparent hover:bg-muted",
  ghost: "hover:bg-muted",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-90",
};

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  icon: "h-10 w-10",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
