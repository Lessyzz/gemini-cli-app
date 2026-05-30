import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Cpu } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { DropdownPortal } from "@/components/DropdownPortal";


const MODELS = [
  { id: "",                      label: "Auto",                  descKey: "modelAuto" },
  { id: "gemini-2.5-pro",        label: "Gemini 2.5 Pro",        descKey: "modelStrongest" },
  { id: "gemini-2.5-flash",      label: "Gemini 2.5 Flash",      descKey: "modelFastEfficient" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", descKey: "modelFastest" },
  { id: "gemini-3-pro-preview",  label: "Gemini 3 Pro ✨",        descKey: "modelPreview" },
  { id: "gemini-3-flash-preview",label: "Gemini 3 Flash ✨",      descKey: "modelPreview" },
];

export function ModelPicker() {
  const { language } = useLanguage();
  const [current, setCurrent] = useState("");
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    api.getModel().then((r) => setCurrent(r.model || "")).catch(() => {});
  }, []);

  const select = async (id) => {
    setOpen(false);
    setCurrent(id);
    await api.setModel(id).catch(() => setCurrent(current));
  };

  const activeModel = MODELS.find((m) => m.id === current) ?? MODELS[0];

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        title={t("modelSelect", language)}
      >
        <Cpu className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate">{activeModel.label}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      <DropdownPortal triggerRef={btnRef} open={open} onClose={() => setOpen(false)} align="right">
        <div className="w-52 rounded-lg border bg-card text-card-foreground shadow-xl">
          <p className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
            {t("modelSelect", language)}
          </p>
          <ul className="py-1">
            {MODELS.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => select(m.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      current === m.id ? "text-primary" : "invisible"
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{m.label}</div>
                    <div className="text-xs text-muted-foreground">{t(m.descKey, language)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DropdownPortal>
    </>
  );
}
