import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      expand
      visibleToasts={4}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-primary" strokeWidth={2.2} />,
        error: <XCircle className="h-5 w-5 text-rose-400" strokeWidth={2.2} />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-400" strokeWidth={2.2} />,
        info: <Info className="h-5 w-5 text-primary" strokeWidth={2.2} />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={2.2} />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: [
            "group toast relative flex items-center gap-3 overflow-hidden",
            "rounded-2xl border border-white/10 bg-[hsl(0_0%_6%/0.92)] px-4 py-3.5 pr-10",
            "text-foreground shadow-[0_20px_60px_-15px_rgba(0,0,0,0.75)]",
            "backdrop-blur-2xl backdrop-saturate-150",
            // subtle inner sheen
            "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl",
            "before:bg-gradient-to-br before:from-white/[0.04] before:via-transparent before:to-white/[0.01]",
            // bottom accent bar (lime/primary by default) matching reference
            "after:pointer-events-none after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full",
            "after:bg-primary after:shadow-[0_0_16px_hsl(var(--primary)/0.6)]",
            "data-[type=error]:after:bg-rose-400 data-[type=error]:after:shadow-[0_0_16px_rgba(251,113,133,0.5)]",
            "data-[type=warning]:after:bg-amber-400 data-[type=warning]:after:shadow-[0_0_16px_rgba(251,191,36,0.5)]",
          ].join(" "),
          title: "text-sm font-semibold tracking-tight text-foreground",
          description: "text-xs text-muted-foreground",
          icon: "flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/10 shrink-0",
          actionButton:
            "!bg-primary !text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm hover:!bg-primary/90 transition-colors",
          cancelButton:
            "!bg-white/5 !text-muted-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:!bg-white/10 transition-colors",
          closeButton:
            "!bg-transparent !border-0 !text-muted-foreground hover:!text-foreground hover:!bg-white/10 !left-auto !right-3 !top-1/2 !-translate-y-1/2 !translate-x-0 !h-6 !w-6",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
