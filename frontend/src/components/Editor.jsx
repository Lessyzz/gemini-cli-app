import { Save, X, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export function Editor({ file, setFile, onSave, onClose }) {
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const isDirty = file.content !== file.originalContent;

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, onSave]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, onClose]);

  const fileName = file.path.split("/").pop();
  const isMac = typeof window !== "undefined" && /Mac|iPhone|iPod|iPad/.test(navigator.userAgent);
  const saveShortcut = isMac ? "⌘S" : "Ctrl+S";

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-sm font-medium truncate" title={file.path}>
            {fileName}
            {isDirty && <span className="ml-1 text-primary">*</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            title={`${t("save", language)} (${saveShortcut})`}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t("save", language)}
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted"
            title={`${t("close", language)} (Esc)`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {}
      <div className="flex-1 overflow-auto p-4">
        <textarea
          value={file.content}
          onChange={(e) => setFile({ ...file, content: e.target.value })}
          spellCheck={false}
          className="h-full w-full resize-none bg-transparent font-mono text-sm outline-none"
          placeholder={t("typeSomething", language)}
        />
      </div>
    </div>
  );
}
