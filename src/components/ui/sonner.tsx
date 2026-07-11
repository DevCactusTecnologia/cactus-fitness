import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// SVGs (Phosphor-style) idênticos ao HTML original
const WarningTriangle = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="currentColor"
    viewBox="0 0 256 256"
    className="h-3 w-3"
  >
    <path d="M240.26,186.1,152.81,34.23h0a28.74,28.74,0,0,0-49.62,0L15.74,186.1a27.45,27.45,0,0,0,0,27.71A28.31,28.31,0,0,0,40.55,228h174.9a28.31,28.31,0,0,0,24.79-14.19A27.45,27.45,0,0,0,240.26,186.1Zm-20.8,15.7a4.46,4.46,0,0,1-4,2.2H40.55a4.46,4.46,0,0,1-4-2.2,3.56,3.56,0,0,1,0-3.73L124,46.2a4.77,4.77,0,0,1,8,0l87.44,151.87A3.56,3.56,0,0,1,219.46,201.8ZM116,136V104a12,12,0,0,1,24,0v32a12,12,0,0,1-24,0Zm28,40a16,16,0,1,1-16-16A16,16,0,0,1,144,176Z" />
  </svg>
);
const CheckBold = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="currentColor"
    viewBox="0 0 256 256"
    className="h-3 w-3"
  >
    <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
  </svg>
);
const XCircleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="currentColor"
    viewBox="0 0 256 256"
    className="h-3 w-3"
  >
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  </svg>
);
const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="currentColor"
    viewBox="0 0 256 256"
    className="h-3 w-3"
  >
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-4,48a12,12,0,1,1-12,12A12,12,0,0,1,124,72Zm12,112a16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40a8,8,0,0,1,0,16Z" />
  </svg>
);
const SpinnerIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="currentColor"
    viewBox="0 0 256 256"
    className="h-3 w-3 animate-spin"
  >
    <path d="M136,32V64a8,8,0,0,1-16,0V32a8,8,0,0,1,16,0Zm37.25,58.75a8,8,0,0,0,5.66-2.35l22.63-22.62a8,8,0,0,0-11.32-11.32L167.6,77.09a8,8,0,0,0,5.65,13.66ZM224,120H192a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm-45.09,47.6a8,8,0,0,0-11.31,11.31l22.62,22.63a8,8,0,0,0,11.32-11.32ZM128,184a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V192A8,8,0,0,0,128,184ZM77.09,167.6,54.46,190.22a8,8,0,0,0,11.32,11.32L88.4,178.91A8,8,0,0,0,77.09,167.6ZM72,128a8,8,0,0,0-8-8H32a8,8,0,0,0,0,16H64A8,8,0,0,0,72,128ZM65.78,54.46A8,8,0,0,0,54.46,65.78L77.09,88.4A8,8,0,0,0,88.4,77.09Z" />
  </svg>
);

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      visibleToasts={4}
      duration={4000}
      icons={{
        success: <CheckBold />,
        error: <XCircleIcon />,
        warning: <WarningTriangle />,
        info: <InfoIcon />,
        loading: <SpinnerIcon />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: [
            // Estrutura do <li> Radix Toast original
            "group toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden",
            "rounded-lg border border-border p-4 pr-8 shadow-lg",
            "bg-[hsl(var(--surface-1))] text-foreground",
            // barra de progresso inferior (estado default = primary)
            "after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:rounded-tr-sm",
            "after:bg-[hsl(var(--primary))]",
            "after:w-full after:[animation:toast-progress_4s_linear_forwards]",
            // variação por tipo
            "data-[type=success]:after:bg-[hsl(var(--success))]",
            "data-[type=warning]:after:bg-[hsl(var(--warning))]",
            "data-[type=error]:after:bg-destructive",
            "data-[type=info]:after:bg-[hsl(var(--primary))]",
          ].join(" "),
          title: "text-[13px] font-semibold leading-tight",
          description: "text-xs text-fg-muted mt-0.5",
          // Wrapper do ícone (círculo colorido) — cor mudada por data-type
          icon: [
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5 m-0",
            "bg-[var(--warning-dim)] text-[hsl(var(--warning))]",
            "group-data-[type=success]:bg-[var(--success-dim)] group-data-[type=success]:text-[hsl(var(--success))]",
            "group-data-[type=warning]:bg-[var(--warning-dim)] group-data-[type=warning]:text-[hsl(var(--warning))]",
            "group-data-[type=error]:bg-[var(--destructive-dim)] group-data-[type=error]:text-destructive",
            "group-data-[type=info]:bg-[hsl(var(--primary)/0.15)] group-data-[type=info]:text-[hsl(var(--primary))]",
            "group-data-[type=loading]:bg-[hsl(var(--primary)/0.15)] group-data-[type=loading]:text-[hsl(var(--primary))]",
          ].join(" "),
          content: "grid gap-0.5 flex-1",
          actionButton:
            "!bg-primary !text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium hover:!bg-primary/90 transition-colors",
          cancelButton:
            "!bg-white/5 !text-fg-muted rounded-md px-3 py-1.5 text-xs font-medium hover:!bg-white/10 transition-colors",
          closeButton:
            "!bg-transparent !border-0 !text-foreground/50 hover:!text-foreground !left-auto !right-2 !top-2 !translate-x-0 !translate-y-0 !h-6 !w-6 rounded-md",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
