import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  saving?: boolean;
}

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageSrc;
  });
  const size = Math.min(area.width, area.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob error"))), "image/jpeg", 0.92),
  );
}

export function AvatarCropDialog({ open, imageSrc, onCancel, onConfirm, saving }: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setArea(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const handleConfirm = async () => {
    if (!imageSrc || !area) return;
    const blob = await getCroppedBlob(imageSrc, area);
    onConfirm(blob);
  };

  if (!open || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <div className="relative flex items-center justify-center border-b border-white/10 px-4 py-4">
        <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" />
        <div className="text-center">
          <h2 className="font-display text-base font-bold text-white">Ajustar foto</h2>
          <p className="text-xs text-white/60">Arraste e use o zoom para enquadrar</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="flex items-center gap-3 px-6 pt-4">
        <ZoomOut className="h-4 w-4 text-white/60" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1 accent-primary"
          aria-label="Zoom"
        />
        <ZoomIn className="h-4 w-4 text-white/60" />
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 pb-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-12 rounded-full border border-white/15 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || !area}
          className="h-12 rounded-full bg-primary text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
