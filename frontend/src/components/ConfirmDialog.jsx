import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }) {
  const { language } = useLanguage();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="font-semibold">{title}</h2>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {t("vazgec", language)}
          </Button>
          <Button size="sm" onClick={onConfirm}>
            {confirmLabel || "OK"}
          </Button>
        </div>
      </div>
    </div>
  );
}
