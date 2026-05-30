import { RegisterScreen } from "@/components/RegisterScreen";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { CliMissingScreen } from "@/components/CliMissingScreen";
import { ChatScreen } from "@/components/ChatScreen";
import { ProjectPicker } from "@/components/ProjectPicker";
import { Sidebar } from "@/components/Sidebar";
import { Editor } from "@/components/Editor";
import { RightPanel } from "@/components/RightPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/useTheme";
import { useLanguage } from "@/lib/useLanguage";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function App() {
  const { theme, toggle } = useTheme();
  const { language } = useLanguage();
  const [view, setView] = useState("app");
  const [info, setInfo] = useState(null); 
  const [projects, setProjects] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(320);

  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingSidebar) {
        const newWidth = e.clientX;
        if (newWidth > 150 && newWidth < 500) {
          setSidebarWidth(newWidth);
        }
      }
      if (isResizingRight) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < 600) {
          setRightWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingRight(false);
    };

    if (isResizingSidebar || isResizingRight) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.cursor = "default";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar, isResizingRight]);

  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentHash, setCurrentHash] = useState("");
  const [confirm, setConfirm] = useState(null);


  const [activeFile, setActiveFile] = useState(null);

  const openFile = async (path) => {
    try {
      const res = await api.readFile(path);
      setActiveFile({
        path: res.path,
        content: res.content,
        originalContent: res.content,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const saveFile = async () => {
    if (!activeFile) return;
    try {
      await api.writeFile(activeFile.path, activeFile.content);
      setActiveFile({
        ...activeFile,
        originalContent: activeFile.content,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const loadProjects = () => api.projects().then(setProjects).catch(() => {});
  const loadState = () => api.state().then((s) => setCurrentHash(s.current_hash || "")).catch(() => {});

  const loadHistory = async () => {
    try {
      const m = await api.history();
      setMessages(m);
      setSelectedMsgId(null);
      await loadState();
    } catch (e) {
      setError(e.message);
    }
  };

  const refresh = () => {
    api
      .project()
      .then((res) => {
        setInfo(res);
        if (res.cli_available) loadHistory();
      })
      .catch(() => setInfo({ project: "", cli_available: false }));
    loadProjects();
  };

  useEffect(refresh, []);


  const latestModelId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "model" && typeof messages[i].id === "number") {
        return messages[i].id;
      }
    }
    return null;
  }, [messages]);

  const panelMsgId = selectedMsgId ?? latestModelId;

  
  const timeline = useMemo(() => {
    const modelMsgs = messages.filter(
      (m) => m.role === "model" && typeof m.id === "number"
    );
    if (modelMsgs.length === 0) return [];
    const rows = [];
    const first = modelMsgs[0];
    if (first.checkpoint_before) {
      rows.push({ hash: first.checkpoint_before, label: t("start", language), kind: "initial" });
    }
    modelMsgs.forEach((m) => {
      if (!m.checkpoint_after) return;
      const idx = messages.findIndex((x) => x.id === m.id);
      const prevUser = [...messages.slice(0, idx)].reverse().find((x) => x.role === "user");
      rows.push({
        hash: m.checkpoint_after,
        label: prevUser?.content || m.content,
        kind: "turn",
        msgId: m.id,
      });
    });
    return rows;
  }, [messages, language]);

  const currentTimelineIndex = useMemo(() => {
    return timeline.findIndex((pt) => pt.hash === currentHash);
  }, [timeline, currentHash]);

  const lastActiveMsgId = useMemo(() => {
    if (currentTimelineIndex === -1) return Infinity;
    const pt = timeline[currentTimelineIndex];
    if (pt.kind === "initial") return -1;
    return pt.msgId ?? Infinity;
  }, [timeline, currentTimelineIndex]);

  const restore = async (hash) => {
    if (!hash) return;
    setError("");
    try {
      const res = await api.restore(hash);
      setCurrentHash(res.current_hash || hash);
      setRefreshKey((k) => k + 1);
      await loadHistory();
    } catch (e) {
      setError(e.message);
    }
  };

  const requestRestore = (hash) => {
    setConfirm({
      title: t("restoreConfirmTitle", language),
      message: t("restoreConfirmMessage", language),
      confirmLabel: t("restore", language),
      onConfirm: () => {
        setConfirm(null);
        restore(hash);
      },
    });
  };

  const switchProject = async (path) => {
    setError("");
    try {
      const res = await api.setProject(path);
      setInfo(res);
      setMessages([]);
      setSelectedMsgId(null);
      setCurrentHash("");
      if (res.cli_available) await loadHistory();
      await loadProjects();
    } catch (e) {
      setError(e.message);
    }
  };

  const requestDeleteProject = (p) => {
    if (p.path === info?.project) {
      setError(t("activeProjectDeleteError", language));
      return;
    }
    setConfirm({
      title: t("deleteProjectTitle", language),
      message: t("deleteProjectMessage", language, { name: p.name || p.path }),
      confirmLabel: t("delete", language),
      onConfirm: async () => {
        setConfirm(null);
        setError("");
        try {
          await api.deleteProject(p.path);
          await loadProjects();
        } catch (e) {
          setError(e.message);
        }
      },
    });
  };

  const onProjectSelected = (res) => {
    setInfo(res);
    setMessages([]);
    setSelectedMsgId(null);
    setCurrentHash("");
    setPickerOpen(false);
    if (res.cli_available) loadHistory();
    loadProjects();
  };

  const stop = async () => {
    try {
      await api.stop();
    } catch (e) {
      console.error("Stop error:", e);
    }
  };



  const runStreamingTurn = async (text, useContinue) => {
    if (sending) return;
    setError("");
    setSending(true);
    const tmpUser = `tmp-u-${Date.now()}`;
    const tmpModel = `tmp-m-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: tmpUser, role: "user", content: text },
      { id: tmpModel, role: "model", content: "", streaming: true, tool: null },
    ]);

    const handlers = {
      onToken: (t) =>
        setMessages((m) =>
          m.map((x) => (x.id === tmpModel ? { ...x, content: x.content + t, tool: null, status: null } : x))
        ),
      onTool: (name) =>
        setMessages((m) => m.map((x) => (x.id === tmpModel ? { ...x, tool: name, status: null } : x))),
      onStatus: (phase) =>
        setMessages((m) => m.map((x) => (x.id === tmpModel ? { ...x, status: phase } : x))),
      onDone: (ev) =>
        setMessages((m) => [
          ...m.filter((x) => x.id !== tmpUser && x.id !== tmpModel),
          ev.user,
          ev.model,
        ]),
    };

    try {
      if (useContinue) await api.continueStream("", handlers);
      else await api.chatStream(text, handlers);
      setSelectedMsgId(null);
      setRefreshKey((k) => k + 1);
      await loadState();
      await loadProjects();
    } catch (err) {
      setError(err.message);
      setMessages((m) => m.filter((x) => typeof x.id !== "string"));
    } finally {
      setSending(false);
    }
  };

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    await runStreamingTurn(text, false);
  };


  
  const continueTurn = () => runStreamingTurn("Evet, devam et.", true);

  
  if (view === "register") {
    return (
      <RegisterScreen
        onRegister={() => setView("app")}
        onSwitchToLogin={() => setView("app")}
      />
    );
  }

  if (info === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!info.cli_available) {
    return (
      <>
        <CliMissingScreen onShowRegister={() => setView("register")}
          project={info.project}
          onOpenPicker={() => setPickerOpen(true)}
          onRetry={refresh}
        />
        {pickerOpen && (
          <ProjectPicker
            initialPath={info.project}
            onSelect={onProjectSelected}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className={cn("flex h-screen overflow-hidden", (isResizingSidebar || isResizingRight) && "select-none")}>
      <Sidebar
        open={sidebarOpen}
        width={sidebarWidth}
        resizing={isResizingSidebar}
        onClose={() => setSidebarOpen(false)}
        projects={projects}
        activeProject={info.project}
        onSelectProject={switchProject}
        onDeleteProject={requestDeleteProject}
        onNewChat={() => setPickerOpen(true)}
        onFileClick={openFile}
        theme={theme}
        onToggleTheme={toggle}
      />

      {sidebarOpen && (
        <div
          className="hidden md:flex w-1 shrink-0 cursor-col-resize items-center justify-center hover:bg-primary/30 transition-colors z-50 group relative"
          onMouseDown={() => setIsResizingSidebar(true)}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}

      {activeFile ? (
        <Editor
          file={activeFile}
          setFile={setActiveFile}
          onSave={saveFile}
          onClose={() => setActiveFile(null)}
        />
      ) : (
        <ChatScreen
          project={info.project}
          messages={messages}
          sending={sending}
          error={error}
          input={input}
          setInput={setInput}
          onSend={send}
          onStop={stop}
          onContinue={continueTurn}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onToggleRight={() => setRightOpen((v) => !v)}
          onOpenPicker={() => setPickerOpen(true)}
          selectedMsgId={panelMsgId}
          onSelectMessage={(id) => {
            setSelectedMsgId(id);
            setRightOpen(true);
          }}
          lastActiveMsgId={lastActiveMsgId}
        />
      )}

      {rightOpen && (
        <div
          className="hidden md:flex w-1 shrink-0 cursor-col-resize items-center justify-center hover:bg-primary/30 transition-colors z-50 group relative"
          onMouseDown={() => setIsResizingRight(true)}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>
      )}

      <RightPanel
        open={rightOpen}
        width={rightWidth}
        resizing={isResizingRight}
        onClose={() => setRightOpen(false)}
        msgId={panelMsgId}
        refreshKey={refreshKey}
        timeline={timeline}
        currentHash={currentHash}
        currentTimelineIndex={currentTimelineIndex}
        onRestore={requestRestore}
      />

      {pickerOpen && (
        <ProjectPicker
          initialPath={info.project}
          onSelect={onProjectSelected}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
