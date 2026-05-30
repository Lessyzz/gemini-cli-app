import { useEffect, useState } from "react";
import { Folder, FolderUp, Check, X, Loader2, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";



export function ProjectPicker({ onSelect, onClose, initialPath = "" }) {
  const { language } = useLanguage();
  const [current, setCurrent] = useState(initialPath);
  const [parent, setParent] = useState("");
  const [dirs, setDirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async (path) => {
    setLoading(true);
    setError("");
    try {
      const d = await api.browse(path);
      setCurrent(d.current);
      setParent(d.parent || "");
      setDirs(d.dirs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(initialPath);
  }, []);

  const choose = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api.setProject(current);
      onSelect(res);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg border bg-card shadow-lg">
        {}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            <span className="font-semibold">{t("selectProject", language)}</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {}
        <div className="border-b px-4 py-2">
          <code className="block truncate text-xs text-muted-foreground" title={current}>
            {current || "/"}
          </code>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="space-y-0.5">
              {parent && (
                <li>
                  <button
                    onClick={() => load(parent)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <FolderUp className="h-4 w-4 text-muted-foreground" />
                    ..
                  </button>
                </li>
              )}
              {dirs.map((d) => (
                <li key={d.path}>
                  <button
                    onClick={() => load(d.path)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    {d.name}
                  </button>
                </li>
              ))}
              {dirs.length === 0 && !parent && (
                <li className="px-3 py-2 text-sm text-muted-foreground">
                  {t("noSubfolders", language)}
                </li>
              )}
            </ul>
          )}
        </div>

        {}
        {error && (
          <div className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <Button onClick={choose} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t("useThisFolder", language)}
          </Button>
        </div>
      </div>
    </div>
  );
}
