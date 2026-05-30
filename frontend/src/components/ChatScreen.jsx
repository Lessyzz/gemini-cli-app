import { useEffect, useRef } from "react";
import { Send, Loader2, FolderOpen, Menu, PanelRight, X, Square } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageBubble } from "@/components/MessageBubble";
import { QuotaBadge } from "@/components/QuotaBadge";
import { ModelPicker } from "@/components/ModelPicker";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function folderName(path) {
  if (!path) return "—";
  const parts = path.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || path;
}

export function ChatScreen({
  project,
  messages,
  sending,
  error,
  input,
  setInput,
  onSend,
  onStop,
  onContinue,
  onToggleSidebar,
  onToggleRight,
  onOpenPicker,
  selectedMsgId,
  onSelectMessage,
  lastActiveMsgId,
}) {
  const { language } = useLanguage();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleDrop = (e) => {
    
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    let textToAppend = "";

    if (data) {
      textToAppend = data;
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      textToAppend = Array.from(e.dataTransfer.files).map(f => f.name).join(", ");
    }

    if (textToAppend) {
      setInput((prev) => {
        let newText = prev || "";
        if (newText && !newText.endsWith(" ")) {
          newText += " ";
        }
        return newText + textToAppend + " ";
      });

      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && input.trim()) {
        onSend(e);
      }
    }
  };

  return (
    <div 
      className="flex h-full min-w-0 flex-1 flex-col"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {}
      <header className="flex items-center justify-between border-b px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className="rounded-md p-1.5 hover:bg-muted"
            title={t("chats", language)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo className="h-5 w-5 shrink-0" />
          <span className="truncate font-semibold">Gemini CLI App</span>
          <button
            onClick={onOpenPicker}
            title={project}
            className="ml-1 flex shrink-0 items-center gap-1.5 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            {project ? folderName(project) : t("notSelected", language)}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ModelPicker />
          <QuotaBadge />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleRight}
            title={t("showChanges", language)}
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && !sending && (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <Logo className="mb-3 h-8 w-8 opacity-50" />
            <p className="text-sm">
              <span className="shine-effect">{t("placeholderExample", language).split(": ")[0]}</span><br />
              {t("placeholderExample", language).split(": ")[1]}
            </p>
          </div>
        )}
        {messages.map((m, idx) => {
          const isModel = m.role === "model" && typeof m.id === "number";
          const reverted = typeof m.id === "number" && m.id > lastActiveMsgId;
          
          const isLast = idx === messages.length - 1;
          const awaiting = isModel && isLast && m.awaiting_confirmation && !sending;
          return (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              clickable={isModel}
              selected={isModel && m.id === selectedMsgId}
              onClick={() => isModel && onSelectMessage(m.id)}
              reverted={reverted}
              awaitingConfirmation={awaiting}
              onContinue={onContinue}
              streaming={m.streaming}
              tool={m.tool}
              status={m.status}
              onStop={onStop}
            />
          );
        })}
        {}
        {sending && !messages.some((m) => m.streaming) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("thinking", language)}
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              className="ml-2 h-7 gap-1 px-2 text-xs hover:bg-muted"
            >
              <X className="h-3 w-3" />
              {t("stop", language)}
            </Button>
          </div>
        )}
      </div>

      {}
      {error && (
        <div className="border-t bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {}
      <form onSubmit={onSend} className="flex items-end gap-2 border-t px-4 py-3">
        <Textarea
          ref={inputRef}
          className="min-h-[40px] max-h-[200px] resize-none border-0 rounded-xl bg-muted/30 focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-muted/50 transition-colors duration-300 py-[10px]"
          placeholder={t("typeAMessage", language)}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          rows={1}
        />
        <Button 
          type={sending ? "button" : "submit"} 
          size="icon" 
          variant="ghost"
          disabled={!sending && !input.trim()} 
          onClick={sending ? onStop : undefined}
          className={cn(
            "h-10 w-10 shrink-0 rounded-xl transition-all duration-200 bg-muted text-foreground hover:bg-muted/80"
          )}
        >
          {sending ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
