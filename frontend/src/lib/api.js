


async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}



async function streamSSE(path, body, { onTool, onToken, onStatus, onDone, onError } = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        let ev;
        try {
          ev = JSON.parse(json);
        } catch {
          continue;
        }
        if (ev.type === "tool") onTool?.(ev.name);
        else if (ev.type === "token") onToken?.(ev.text);
        else if (ev.type === "status") onStatus?.(ev.phase);
        else if (ev.type === "done") onDone?.(ev);
        else if (ev.type === "error") throw new Error(ev.error);
      }
    }
  }
}

export const api = {
  
  status: () => request("/api/status"),

  
  history: () => request("/api/chat"),

  
  chat: (message) =>
    request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  
  continue: (message = "") =>
    request("/api/continue", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  
  chatStream: (message, handlers) =>
    streamSSE("/api/chat/stream", { message }, handlers),

  
  continueStream: (message = "", handlers) =>
    streamSSE("/api/continue/stream", { message }, handlers),

  
  stop: () => request("/api/stop", { method: "POST" }),

  
  restore: (hash) =>
    request("/api/restore", {
      method: "POST",
      body: JSON.stringify({ hash }),
    }),

  
  state: () => request("/api/state"),

  
  project: () => request("/api/project"),

  
  setProject: (path) =>
    request("/api/project", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),

  
  projects: () => request("/api/projects"),

  
  deleteProject: (path) =>
    request(`/api/projects?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }),

  
  changes: (msgId) => request(`/api/changes?msg=${msgId}`),

  
  fileDiff: (msgId, path) =>
    request(`/api/diff?msg=${msgId}&path=${encodeURIComponent(path)}`),

  
  browse: (path = "", includeFiles = false) =>
    request(`/api/browse?path=${encodeURIComponent(path)}&files=${includeFiles}`),


  readFile: (path) => request(`/api/files?path=${encodeURIComponent(path)}`),


  writeFile: (path, content) =>
    request("/api/files", {
      method: "POST",
      body: JSON.stringify({ path, content }),
    }),

  
  renameFile: (oldPath, newPath) =>
    request("/api/files/rename", {
      method: "POST",
      body: JSON.stringify({ oldPath, newPath }),
    }),

  
  deleteFile: (path) =>
    request(`/api/files?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    }),

  
  quota: () => request("/api/quota"),

  
  getModel: () => request("/api/model"),

  
  setModel: (model) =>
    request("/api/model", {
      method: "POST",
      body: JSON.stringify({ model }),
    }),
};
