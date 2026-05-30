import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Bot, User, RotateCcw, ArrowRight, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useLanguage } from "@/lib/useLanguage";


function toolLabel(name, language) {
  switch (name) {
    case "write_file":
      return t("toolWriting", language);
    case "replace":
    case "edit":
      return t("toolEditing", language);
    case "read_file":
      return t("toolReading", language);
    case "list_directory":
      return t("toolListing", language);
    case "run_shell_command":
      return t("toolRunning", language);
    default:
      return t("toolWorking", language);
  }
}

export function MessageBubble({
  role,
  content,
  clickable,
  selected,
  onClick,
  reverted,
  awaitingConfirmation,
  onContinue,
  streaming,
  tool,
  status,
  onStop,
}) {
  const { language } = useLanguage();
  const isUser = role === "user";
  
  const showStatus = !isUser && streaming && !content;
  const statusText = status === "starting"
    ? t("startingGemini", language)
    : tool
      ? toolLabel(tool, language)
      : t("thinkingShort", language);

  return (
    <div className={cn("flex gap-3 transition-opacity duration-300", isUser && "flex-row-reverse", reverted && "opacity-40")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-muted border border-border/50" : "bg-muted"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="max-w-[80%]">
        <div
          onClick={clickable ? onClick : undefined}
          title={reverted ? t("stepReverted", language) : (clickable ? t("showChanges", language) : undefined)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm transition-colors duration-200",
            isUser
              ? "bg-user-bubble text-foreground border border-border/40 hover:bg-user-bubble/80"
              : "bg-muted hover:bg-muted/80",
            clickable && "cursor-pointer"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : showStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{statusText}</span>
            </div>
          ) : (
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  if (inline || !match) {
                    return (
                      <code className="rounded bg-background/50 px-1 py-0.5 text-xs" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <SyntaxHighlighter
                      language={match[1]}
                      style={oneDark}
                      customStyle={{ borderRadius: "0.375rem", fontSize: "0.8rem" }}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  );
                },
              }}
            >
              {/* Akarken yanıp sönen imleç ekle */}
              {streaming && content ? content + " ▍" : content}
            </ReactMarkdown>
          )}
        </div>

        {/* Akış sırasında durdurma kontrolü */}
        {!isUser && streaming && onStop && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStop();
            }}
            className="mt-1.5 flex items-center gap-1 rounded-md border border-border/50 bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          >
            <X className="h-3 w-3" />
            {t("stop", language)}
          </button>
        )}

        {}
        {!isUser && awaitingConfirmation && onContinue && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContinue();
            }}
            className="mt-2 flex items-center gap-1.5 rounded-md border border-border/50 bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80"
            title={t("continueTitle", language)}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {t("continueYes", language)}
          </button>
        )}
      </div>
    </div>
  );
}
