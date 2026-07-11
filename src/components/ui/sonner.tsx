import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

/* -------------------------------------------------------------------------
 * Icons (Phosphor, idênticos ao HTML original do welltrainer)
 * ---------------------------------------------------------------------- */
const WarningTriangle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" className="h-3 w-3">
    <path d="M240.26,186.1,152.81,34.23h0a28.74,28.74,0,0,0-49.62,0L15.74,186.1a27.45,27.45,0,0,0,0,27.71A28.31,28.31,0,0,0,40.55,228h174.9a28.31,28.31,0,0,0,24.79-14.19A27.45,27.45,0,0,0,240.26,186.1Zm-20.8,15.7a4.46,4.46,0,0,1-4,2.2H40.55a4.46,4.46,0,0,1-4-2.2,3.56,3.56,0,0,1,0-3.73L124,46.2a4.77,4.77,0,0,1,8,0l87.44,151.87A3.56,3.56,0,0,1,219.46,201.8ZM116,136V104a12,12,0,0,1,24,0v32a12,12,0,0,1-24,0Zm28,40a16,16,0,1,1-16-16A16,16,0,0,1,144,176Z" />
  </svg>
);
const CheckBold = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" className="h-3 w-3">
    <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
  </svg>
);
const XCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" className="h-3 w-3">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm37.66,130.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  </svg>
);
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" className="h-3 w-3">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-4,48a12,12,0,1,1-12,12A12,12,0,0,1,124,72Zm12,112a16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40a8,8,0,0,1,0,16Z" />
  </svg>
);
const SpinnerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" className="h-3 w-3 animate-spin">
    <path d="M136,32V64a8,8,0,0,1-16,0V32a8,8,0,0,1,16,0Zm37.25,58.75a8,8,0,0,0,5.66-2.35l22.63-22.62a8,8,0,0,0-11.32-11.32L167.6,77.09a8,8,0,0,0,5.65,13.66ZM224,120H192a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16Zm-45.09,47.6a8,8,0,0,0-11.31,11.31l22.62,22.63a8,8,0,0,0,11.32-11.32ZM128,184a8,8,0,0,0-8,8v32a8,8,0,0,0,16,0V192A8,8,0,0,0,128,184ZM77.09,167.6,54.46,190.22a8,8,0,0,0,11.32,11.32L88.4,178.91A8,8,0,0,0,77.09,167.6ZM72,128a8,8,0,0,0-8-8H32a8,8,0,0,0,0,16H64A8,8,0,0,0,72,128ZM65.78,54.46A8,8,0,0,0,54.46,65.78L77.09,88.4A8,8,0,0,0,88.4,77.09Z" />
  </svg>
);
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" className="h-4 w-4">
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  </svg>
);

/* -------------------------------------------------------------------------
 * Store
 * ---------------------------------------------------------------------- */
type ToastType = "default" | "success" | "warning" | "error" | "info" | "loading";
type ToastOptions = {
  id?: string | number;
  description?: React.ReactNode;
  duration?: number;
  action?: { label: string; onClick: () => void };
  cancel?: { label: string; onClick?: () => void };
};
type ToastItem = {
  id: string;
  type: ToastType;
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration: number;
  action?: ToastOptions["action"];
  cancel?: ToastOptions["cancel"];
  custom?: (id: string) => React.ReactNode;
};

const DEFAULT_DURATION = 4000;
const listeners = new Set<(items: ToastItem[]) => void>();
let items: ToastItem[] = [];
let seq = 0;

function emit() {
  for (const l of listeners) l([...items]);
}
function upsert(next: ToastItem) {
  const idx = items.findIndex((i) => i.id === next.id);
  if (idx >= 0) items[idx] = next;
  else items = [...items, next];
  emit();
}
function remove(id: string) {
  items = items.filter((i) => i.id !== id);
  emit();
}
function nextId() {
  seq += 1;
  return `t-${Date.now()}-${seq}`;
}

function normalize(type: ToastType, message: React.ReactNode, opts?: ToastOptions): string {
  const id = opts?.id != null ? String(opts.id) : nextId();
  upsert({
    id,
    type,
    title: message,
    description: opts?.description,
    duration: opts?.duration ?? DEFAULT_DURATION,
    action: opts?.action,
    cancel: opts?.cancel,
  });
  return id;
}

type ToastFn = ((message: React.ReactNode, opts?: ToastOptions) => string) & {
  success: (m: React.ReactNode, o?: ToastOptions) => string;
  error: (m: React.ReactNode, o?: ToastOptions) => string;
  warning: (m: React.ReactNode, o?: ToastOptions) => string;
  info: (m: React.ReactNode, o?: ToastOptions) => string;
  loading: (m: React.ReactNode, o?: ToastOptions) => string;
  custom: (render: (id: string) => React.ReactNode, o?: ToastOptions) => string;
  dismiss: (id?: string | number) => void;
};

const toastFn: ToastFn = ((m: React.ReactNode, o?: ToastOptions) => normalize("default", m, o)) as ToastFn;
toastFn.success = (m, o) => normalize("success", m, o);
toastFn.error = (m, o) => normalize("error", m, o);
toastFn.warning = (m, o) => normalize("warning", m, o);
toastFn.info = (m, o) => normalize("info", m, o);
toastFn.loading = (m, o) => normalize("loading", m, o);
toastFn.custom = (render, o) => {
  const id = o?.id != null ? String(o.id) : nextId();
  upsert({
    id,
    type: "default",
    duration: o?.duration ?? DEFAULT_DURATION,
    custom: render,
  });
  return id;
};
toastFn.dismiss = (id) => {
  if (id == null) {
    items = [];
    emit();
  } else {
    remove(String(id));
  }
};

export const toast = toastFn;

/* -------------------------------------------------------------------------
 * Toaster (Radix-based, replicando o HTML original do welltrainer)
 * ---------------------------------------------------------------------- */
function useStore() {
  const [state, setState] = React.useState<ToastItem[]>(items);
  React.useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);
  return state;
}

function iconFor(type: ToastType) {
  switch (type) {
    case "success": return <CheckBold />;
    case "error": return <XCircleIcon />;
    case "warning": return <WarningTriangle />;
    case "info": return <InfoIcon />;
    case "loading": return <SpinnerIcon />;
    default: return <InfoIcon />;
  }
}
function iconStyles(type: ToastType) {
  switch (type) {
    case "success":
      return "bg-[var(--success-dim)] text-[hsl(var(--success))]";
    case "warning":
      return "bg-[var(--warning-dim)] text-[hsl(var(--warning))]";
    case "error":
      return "bg-[var(--destructive-dim)] text-destructive";
    case "info":
    case "loading":
    default:
      return "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]";
  }
}
function barColor(type: ToastType) {
  switch (type) {
    case "success": return "bg-[hsl(var(--success))]";
    case "warning": return "bg-[hsl(var(--warning))]";
    case "error": return "bg-destructive";
    default: return "bg-[hsl(var(--primary))]";
  }
}

function ToastRow({ item }: { item: ToastItem }) {
  return (
    <ToastPrimitive.Root
      duration={item.duration}
      onOpenChange={(open) => {
        if (!open) remove(item.id);
      }}
      className="group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full border-border bg-[hsl(var(--surface-1))] text-foreground"
    >
      {item.custom ? (
        <div className="flex-1">{item.custom(item.id)}</div>
      ) : (
        <>
          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full mt-0.5 ${iconStyles(item.type)}`}>
            {iconFor(item.type)}
          </div>
          <div className="grid gap-0.5 flex-1">
            {item.title != null && (
              <ToastPrimitive.Title className="text-[13px] font-semibold">
                {item.title}
              </ToastPrimitive.Title>
            )}
            {item.description != null && (
              <ToastPrimitive.Description className="text-xs text-fg-muted">
                {item.description}
              </ToastPrimitive.Description>
            )}
          </div>
          {item.action && (
            <ToastPrimitive.Action
              altText={typeof item.title === "string" ? item.title : "Ação"}
              onClick={item.action.onClick}
              className="ml-2 shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {item.action.label}
            </ToastPrimitive.Action>
          )}
        </>
      )}
      <ToastPrimitive.Close
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none group-hover:opacity-100"
        aria-label="Fechar"
      >
        <CloseIcon />
      </ToastPrimitive.Close>
      {item.duration !== Infinity && !item.custom && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 rounded-tr-sm ${barColor(item.type)}`}
          style={{ animation: `toast-progress ${item.duration}ms linear forwards` }}
        />
      )}
    </ToastPrimitive.Root>
  );
}

export function Toaster() {
  const list = useStore();
  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={DEFAULT_DURATION}>
      {list.map((item) => (
        <ToastRow key={item.id} item={item} />
      ))}
      <ToastPrimitive.Viewport className="fixed top-0 z-[10020] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastPrimitive.Provider>
  );
}
