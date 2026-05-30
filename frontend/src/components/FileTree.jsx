import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";

export function FileTree({ name, path, isDir = true, level = 0, onFileClick }) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const toggle = async (e) => {
    e.stopPropagation();
    if (!isDir) {
      if (onFileClick) onFileClick(path);
      return;
    }
    
    if (!isOpen && !loaded) {
      setLoading(true);
      try {
        const res = await api.browse(path, true);
        setEntries(res.entries || []);
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load directory:", err);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", path);
    e.dataTransfer.effectAllowed = "copy";
  };

  if (!isDir) {
    return (
      <div 
        draggable
        onDragStart={handleDragStart}
        onClick={() => onFileClick && onFileClick(path)}
        className="flex items-center gap-1.5 py-1 pl-6 pr-2 text-xs text-muted-foreground hover:bg-muted/50 rounded-sm cursor-pointer active:bg-muted"
      >
        <File className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{name}</span>
      </div>
    );
  }

  return (
    <div className="select-none">
      <button
        draggable
        onDragStart={handleDragStart}
        onClick={toggle}
        className="flex w-full items-center gap-1.5 py-1 pl-2 pr-2 hover:bg-muted/50 rounded-sm text-xs text-left cursor-default"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <Folder className="h-3.5 w-3.5 shrink-0 text-blue-500/70" />
        <span className="truncate font-medium">{name}</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
      </button>

      {isOpen && (
        <div className="ml-3 border-l border-muted/50 pl-1">
          {entries.map((entry) => (
            <FileTree 
              key={entry.path} 
              name={entry.name} 
              path={entry.path} 
              isDir={entry.is_dir} 
              level={level + 1} 
              onFileClick={onFileClick}
            />
          ))}
          {loaded && entries.length === 0 && (
            <div className="py-1 pl-6 text-[10px] text-muted-foreground italic">
              {t("empty", language)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
