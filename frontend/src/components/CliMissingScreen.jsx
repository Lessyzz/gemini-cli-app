import { Terminal, FolderOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export function CliMissingScreen({ project, onOpenPicker, onRetry, onShowRegister }) {
  const { language } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Terminal className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">{t("cliMissingTitle", language)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("cliMissingText", language, { command: <code key="cmd" className="rounded bg-muted px-1 py-0.5 text-xs">gemini</code> })}
          </p>
        </div>

        <pre className="mb-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">
          npm install -g @google/gemini-cli
        </pre>

        <p className="mb-6 text-center text-xs text-muted-foreground">
          {t("cliLoginText", language, { command: <code key="cmd" className="rounded bg-muted px-1 py-0.5 text-xs">gemini</code> })}
        </p>

        {}
        <div className="mb-4 rounded-md border bg-muted/40 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("projectFolder", language)}
            </span>
            <button
              type="button"
              onClick={onOpenPicker}
              className="flex items-center gap-1 text-xs underline underline-offset-2"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {t("change", language)}
            </button>
          </div>
          <code className="block truncate text-xs" title={project}>
            {project || t("notSelected", language)}
          </code>
        </div>

        
        <Button variant="outline" onClick={onShowRegister} className="w-full mb-2">
          {t("createAccount", language)}
        </Button>
        <Button onClick={onRetry} className="w-full">
          <RefreshCw className="h-4 w-4" />
          {t("retry", language)}
        </Button>
      </div>
    </div>
  );
}
