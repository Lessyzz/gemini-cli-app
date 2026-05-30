import { useEffect, useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";
import { DropdownPortal } from "@/components/DropdownPortal";

function formatReset(resetTime, language) {
  if (!resetTime) return "";
  const d = new Date(resetTime);
  const now = new Date();
  const diffMs = d - now;
  if (diffMs <= 0) return t("quotaResetSoon", language);
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (h > 0) return t("quotaResetIn", language, { h: String(h), m: String(m) });
  return t("quotaResetInMin", language, { m: String(m) });
}

export function QuotaBadge() {
  const { language } = useLanguage();
  const [quota, setQuota] = useState(null);
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const load = () => {
    api.quota().then(setQuota).catch(() => {});
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!quota || !quota.available) return null;

  const pct = Math.round(quota.used_pct);
  const color =
    pct >= 90 ? "text-destructive" : pct >= 70 ? "text-yellow-500" : "text-muted-foreground";
  const barColor =
    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-yellow-500" : "bg-primary";

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted",
          color
        )}
        title={t("quotaTitle", language)}
      >
        <Gauge className="h-3.5 w-3.5" />
        <span>{t("quotaUsed", language, { pct: String(pct) })}</span>
      </button>

      <DropdownPortal triggerRef={btnRef} open={open} onClose={() => setOpen(false)} align="right">
        <div className="w-72 rounded-lg border bg-card text-card-foreground p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{t("quotaDaily", language)}</span>
            <span className={cn("text-xs font-medium", color)}>{t("quotaUsed", language, { pct: String(pct) })}</span>
          </div>

          {}
          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>

          {}
          <div className="space-y-1.5">
            {quota.buckets?.map((b) => {
              const bPct = Math.round((1 - b.remaining_fraction) * 100);
              const bColor =
                bPct >= 90 ? "bg-destructive" : bPct >= 70 ? "bg-yellow-500" : "bg-primary/60";
              return (
                <div key={b.model_id}>
                  <div className="mb-0.5 flex justify-between text-xs text-muted-foreground">
                    <span className="max-w-[180px] truncate">{b.model_id}</span>
                    <span>{bPct}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", bColor)}
                      style={{ width: `${Math.min(bPct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-2 text-right text-xs text-muted-foreground">
            {formatReset(quota.reset_time, language)}
          </p>
        </div>
      </DropdownPortal>
    </>
  );
}
