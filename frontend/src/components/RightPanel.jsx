import { useEffect, useState } from "react";
import {
  FileDiff,
  History,
  Loader2,
  ChevronRight,
  ChevronDown,
  X,
  Circle,
  CheckCircle2,
  FlagTriangleRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

const getStatusLabel = (status, lang) => {
  const labels = {
    A: t("statusAdded", lang),
    M: t("statusModified", lang),
    D: t("statusDeleted", lang),
    R: t("statusRenamed", lang),
  };
  return labels[status] || status;
};

const STATUS_COLOR = {
  A: "text-emerald-500",
  M: "text-amber-500",
  D: "text-red-500",
  R: "text-blue-500",
};

function DiffView({ text }) {
  const { language } = useLanguage();
  if (!text) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">{t("diffNone", language)}</p>;
  }
  return (
    <pre className="overflow-x-auto px-3 py-2 text-[11px] leading-relaxed">
      {text.split("\n").map((line, i) => {
        let color = "text-muted-foreground";
        if (line.startsWith("+") && !line.startsWith("+++")) color = "text-emerald-500";
        else if (line.startsWith("-") && !line.startsWith("---")) color = "text-red-500";
        else if (line.startsWith("@@")) color = "text-blue-400";
        return (
          <div key={i} className={color}>
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}

function ChangesView({ msgId, refreshKey }) {
  const { language } = useLanguage();
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [diffs, setDiffs] = useState({});

  useEffect(() => {
    setExpanded(null);
    setDiffs({});
    if (!msgId) {
      setChanges([]);
      return;
    }
    setLoading(true);
    api
      .changes(msgId)
      .then((d) => setChanges(d.changes || []))
      .catch(() => setChanges([]))
      .finally(() => setLoading(false));
  }, [msgId, refreshKey]);

  const toggle = async (path) => {
    if (expanded === path) {
      setExpanded(null);
      return;
    }
    setExpanded(path);
    if (diffs[path] === undefined) {
      try {
        const d = await api.fileDiff(msgId, path);
        setDiffs((m) => ({ ...m, [path]: d.diff || "" }));
      } catch {
        setDiffs((m) => ({ ...m, [path]: "" }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (changes.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {t("noFilesChanged", language)}
      </p>
    );
  }
  return (
    <ul className="py-1">
      {changes.map((ch) => (
        <li key={ch.path}>
          <button
            onClick={() => toggle(ch.path)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
          >
            {expanded === ch.path ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn("w-4 shrink-0 text-center font-mono text-xs", STATUS_COLOR[ch.status])}
              title={getStatusLabel(ch.status, language)}
            >
              {ch.status}
            </span>
            <span className="truncate">{ch.path}</span>
          </button>
          {expanded === ch.path && (
            <div className="border-y bg-background/50">
              {diffs[ch.path] === undefined ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <DiffView text={diffs[ch.path]} />
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function TimelineView({ timeline, currentHash, currentTimelineIndex, onRestore }) {
  const { language } = useLanguage();
  if (timeline.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        {t("diffNone", language)}
      </p>
    );
  }
  return (
    <ul className="py-1">
      {timeline.map((pt, index) => {
        const isCurrent = pt.hash === currentHash;
        const isFuture = currentTimelineIndex !== -1 && index > currentTimelineIndex;
        return (
          <li key={pt.hash}>
            <button
              onClick={() => !isCurrent && onRestore(pt.hash)}
              disabled={isCurrent}
              title={isCurrent ? t("youAreHere", language) : (isFuture ? t("futureStep", language) : t("backToPoint", language))}
              className={cn(
                "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-opacity duration-300",
                isCurrent ? "bg-muted" : "hover:bg-muted",
                isFuture && "opacity-40"
              )}
            >
              <span className="mt-0.5 shrink-0">
                {pt.kind === "initial" ? (
                  <FlagTriangleRight className="h-4 w-4 text-muted-foreground" />
                ) : isCurrent ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate", isCurrent && "font-medium")}>
                  {pt.label}
                </span>
                {isCurrent && (
                  <span className="text-xs text-primary">{t("currentStatus", language)}</span>
                )}
                {isFuture && (
                  <span className="text-xs text-muted-foreground italic">
                    {t("revertedTag", language)}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function RightPanel({
  open,
  width,
  resizing,
  onClose,
  msgId,
  refreshKey,
  timeline,
  currentHash,
  currentTimelineIndex,
  onRestore,
}) {
  const { language } = useLanguage();
  const [tab, setTab] = useState("changes");

  return (
    <aside 
      style={{ width: open ? `${width}px` : '0px' }}
      className={cn(
        "flex h-full shrink-0 flex-col border-l bg-card overflow-hidden",
        !resizing && "transition-all duration-200",
        !open && "border-l-0"
      )}
    >
      <div className="flex min-w-[320px] items-center justify-between border-b px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("changes")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm",
              tab === "changes" ? "bg-muted font-medium" : "hover:bg-muted"
            )}
          >
            <FileDiff className="h-4 w-4" />
            {t("changes", language)}
          </button>
          <button
            onClick={() => setTab("timeline")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm",
              tab === "timeline" ? "bg-muted font-medium" : "hover:bg-muted"
            )}
          >
            <History className="h-4 w-4" />
            {t("timeline", language)}
          </button>
        </div>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted" title={t("cancel", language)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "changes" ? (
          <ChangesView msgId={msgId} refreshKey={refreshKey} />
        ) : (
          <TimelineView 
            timeline={timeline} 
            currentHash={currentHash} 
            currentTimelineIndex={currentTimelineIndex} 
            onRestore={onRestore} 
          />
        )}
      </div>
    </aside>
  );
}
