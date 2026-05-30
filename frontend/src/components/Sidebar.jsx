import { MessageSquare, Plus, Moon, Sun, FolderGit2, X, Trash2, Loader2, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { FileTree } from "./FileTree";
import { useLanguage } from "@/lib/useLanguage";
import { languages, t } from "@/lib/i18n";

function folderName(path) {
  if (!path) return "—";
  const parts = path.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || path;
}

function ProjectExplorer({ path, onFileClick }) {
  const { language } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.browse(path, true)
      .then(res => {
        if (active) {
          setEntries(res.entries || []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("loading", language)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-2 text-[10px] text-destructive italic">
        {t("error", language)}: {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-6 py-2 text-[10px] text-muted-foreground italic">
        {t("empty", language)}
      </div>
    );
  }

  return (
    <div className="py-1">
      {entries.map((entry) => (
        <FileTree
          key={entry.path}
          name={entry.name}
          path={entry.path}
          isDir={entry.is_dir}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}

export function Sidebar({
  open,
  width,
  resizing,
  onClose,
  projects,
  activeProject,
  onSelectProject,
  onDeleteProject,
  onNewChat,
  onFileClick,
  theme,
  onToggleTheme,
}) {
  const { language, setLanguage } = useLanguage();

  return (
    <>
      {}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        style={{ width: open ? (window.innerWidth < 768 ? '100%' : `${width}px`) : '0px' }}
        className={cn(
          "z-40 flex h-full shrink-0 flex-col border-r bg-card",
          !resizing && "transition-all duration-200",
          "fixed md:static",
          open ? "left-0" : "-left-64 md:left-0 md:overflow-hidden md:border-r-0"
        )}
      >
        {}
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <FolderGit2 className="h-5 w-5" />
            {t("chats", language)}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted md:hidden"
            title={t("cancel", language)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {}
        <div className="px-2">
          <button
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            {t("newChat", language)}
          </button>
        </div>

        {}
        <nav className="mt-2 flex-1 overflow-y-auto px-2">
          {projects.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {t("noFolders", language)}
            </p>
          )}
          <ul className="space-y-0.5">
            {projects.map((p) => {
              const active = p.path === activeProject;
              return (
                <li key={p.path} className="group relative">
                  <button
                    onClick={() => onSelectProject(p.path)}
                    title={p.path}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md py-2 pl-3 pr-9 text-left text-sm",
                      active ? "bg-muted font-medium" : "hover:bg-muted"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.name || folderName(p.path)}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(p);
                    }}
                    title={t("deleteChat", language)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {active && (
                    <div className="ml-4 border-l border-muted/50">
                      <ProjectExplorer path={p.path} onFileClick={onFileClick} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="text-center text-[12px] text-muted-foreground mb-3">by lessy'</div>
        {}
        <div className="border-t p-2">
          <div className="flex items-center gap-2 px-3 py-2 text-sm">
            <Languages className="h-4 w-4" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent outline-none cursor-pointer w-full"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-card">
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {}
        <div className="border-t p-2">
          <button
            onClick={onToggleTheme}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === "dark" ? t("lightTheme", language) : t("darkTheme", language)}
          </button>
        </div>
      </aside>
    </>
  );
}
