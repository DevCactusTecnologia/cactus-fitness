import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      expand
      visibleToasts={4}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-400" strokeWidth={2.2} />,
        error: <XCircle className="h-5 w-5 text-rose-400" strokeWidth={2.2} />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-400" strokeWidth={2.2} />,
        info: <Info className="h-5 w-5 text-sky-400" strokeWidth={2.2} />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={2.2} />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: [
            "group toast relative flex items-center gap-3 overflow-hidden",
            "rounded-2xl border border-white/10 bg-background/70 px-4 py-3.5 pr-10",
            "text-foreground shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)]",
            "backdrop-blur-2xl backdrop-saturate-150",
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl",
            "before:bg-gradient-to-br before:from-white/8 before:via-transparent before:to-white/[0.02]",
            "after:pointer-events-none after:absolute after:left-0 after:top-0 after:h-full after:w-[3px]",
            "after:bg-gradient-to-b after:from-primary after:via-primary/70 after:to-primary/30",
            "data-[type=success]:after:from-emerald-400 data-[type=success]:after:via-emerald-400/70 data-[type=success]:after:to-emerald-400/20",
            "data-[type=error]:after:from-rose-400 data-[type=error]:after:via-rose-400/70 data-[type=error]:after:to-rose-400/20",
            "data-[type=warning]:after:from-amber-400 data-[type=warning]:after:via-amber-400/70 data-[type=warning]:after:to-amber-400/20",
            "data-[type=info]:after:from-sky-400 data-[type=info]:after:via-sky-400/70 data-[type=info]:after:to-sky-400/20",
          ].join(" "),
          title: "text-sm font-semibold tracking-tight",
          description: "text-xs text-muted-foreground",
          icon: "flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 shrink-0",
          actionButton:
            "!bg-primary !text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm hover:!bg-primary/90 transition-colors",
          cancelButton:
            "!bg-white/5 !text-muted-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:!bg-white/10 transition-colors",
          closeButton:
            "!bg-white/5 !border-white/10 !text-muted-foreground hover:!text-foreground hover:!bg-white/10 !left-auto !right-2 !top-1/2 !-translate-y-1/2 !translate-x-0",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
