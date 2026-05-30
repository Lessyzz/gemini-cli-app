package acp

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const binaryName = "gemini"

const startTimeout = 90 * time.Second

const primeDirective = "Permanent system directive: From now on, execute all my requests directly without asking for confirmation. " +
	"Do not ask questions like \"Should I do it\", \"Should I create it\", \"Should I continue\" and do not wait by presenting a plan; " +
	"perform the necessary file creation, editing and commands yourself, then briefly summarize what you did. " +
	"Reply to this message with just \"OK\"."

func Available() bool {
	_, err := exec.LookPath(binaryName)
	return err == nil
}

type Update struct {
	Kind string
	Text string
	Tool string
}

type rpcMsg struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      *int            `json:"id,omitempty"`
	Method  string          `json:"method,omitempty"`
	Params  json.RawMessage `json:"params,omitempty"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func (e *rpcError) Error() string { return e.Message }

type session struct {
	dir   string
	model string

	cmd   *exec.Cmd
	stdin io.Writer

	writeMu  sync.Mutex
	promptMu sync.Mutex

	nextID    int64
	pendingMu sync.Mutex
	pending   map[int]chan rpcMsg

	acpSession string

	updMu    sync.Mutex
	onUpdate func(Update)

	dead int32
}

func (s *session) alive() bool { return atomic.LoadInt32(&s.dead) == 0 }

func (s *session) sendRaw(v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	s.writeMu.Lock()
	defer s.writeMu.Unlock()
	_, err = s.stdin.Write(append(b, '\n'))
	return err
}

func (s *session) call(ctx context.Context, method string, params any) (json.RawMessage, error) {
	id := int(atomic.AddInt64(&s.nextID, 1))
	ch := make(chan rpcMsg, 1)
	s.pendingMu.Lock()
	s.pending[id] = ch
	s.pendingMu.Unlock()
	defer func() {
		s.pendingMu.Lock()
		delete(s.pending, id)
		s.pendingMu.Unlock()
	}()

	req := map[string]any{"jsonrpc": "2.0", "id": id, "method": method}
	if params != nil {
		req["params"] = params
	}
	if err := s.sendRaw(req); err != nil {
		return nil, err
	}

	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case m, ok := <-ch:
		if !ok {

			return nil, fmt.Errorf("gemini session closed unexpectedly")
		}
		if m.Error != nil {
			return nil, fmt.Errorf("acp %s: %s", method, m.Error.Message)
		}
		return m.Result, nil
	}
}

func (s *session) setOnUpdate(fn func(Update)) {
	s.updMu.Lock()
	s.onUpdate = fn
	s.updMu.Unlock()
}

func (s *session) emit(u Update) {
	s.updMu.Lock()
	fn := s.onUpdate
	s.updMu.Unlock()
	if fn != nil {
		fn(u)
	}
}

func (s *session) readLoop(stdout io.Reader) {
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 1024*1024), 64*1024*1024)
	for scanner.Scan() {
		var m rpcMsg
		if err := json.Unmarshal(scanner.Bytes(), &m); err != nil {
			continue
		}
		switch {
		case m.ID != nil && m.Method != "":
			s.handleRequest(m)
		case m.ID != nil:
			s.pendingMu.Lock()
			ch := s.pending[*m.ID]
			s.pendingMu.Unlock()
			if ch != nil {
				ch <- m
			}
		case m.Method != "":
			s.handleNotification(m)
		}
	}
	atomic.StoreInt32(&s.dead, 1)

	s.pendingMu.Lock()
	for id, ch := range s.pending {
		close(ch)
		delete(s.pending, id)
	}
	s.pendingMu.Unlock()
}

func (s *session) handleRequest(m rpcMsg) {
	switch m.Method {
	case "session/request_permission":

		var p struct {
			Options []struct {
				OptionID string `json:"optionId"`
				Kind     string `json:"kind"`
			} `json:"options"`
		}
		_ = json.Unmarshal(m.Params, &p)
		optID := ""
		for _, o := range p.Options {
			k := strings.ToLower(o.Kind + o.OptionID)
			if strings.Contains(k, "allow_always") {
				optID = o.OptionID
				break
			}
		}
		if optID == "" {
			for _, o := range p.Options {
				if strings.Contains(strings.ToLower(o.Kind+o.OptionID), "allow") {
					optID = o.OptionID
					break
				}
			}
		}
		if optID == "" && len(p.Options) > 0 {
			optID = p.Options[0].OptionID
		}
		_ = s.sendRaw(map[string]any{
			"jsonrpc": "2.0", "id": *m.ID,
			"result": map[string]any{
				"outcome": map[string]any{"outcome": "selected", "optionId": optID},
			},
		})
	case "fs/read_text_file":
		var p struct {
			Path  string `json:"path"`
			Line  *int   `json:"line"`
			Limit *int   `json:"limit"`
		}
		_ = json.Unmarshal(m.Params, &p)
		data, err := os.ReadFile(p.Path)
		if err != nil {
			_ = s.sendRaw(map[string]any{"jsonrpc": "2.0", "id": *m.ID,
				"error": map[string]any{"code": -32603, "message": err.Error()}})
			return
		}
		content := string(data)
		if p.Line != nil || p.Limit != nil {
			lines := strings.Split(content, "\n")
			start := 0
			if p.Line != nil && *p.Line > 0 {
				start = *p.Line - 1
			}
			if start > len(lines) {
				start = len(lines)
			}
			end := len(lines)
			if p.Limit != nil && start+*p.Limit < end {
				end = start + *p.Limit
			}
			content = strings.Join(lines[start:end], "\n")
		}
		_ = s.sendRaw(map[string]any{"jsonrpc": "2.0", "id": *m.ID,
			"result": map[string]any{"content": content}})
	case "fs/write_text_file":
		var p struct {
			Path    string `json:"path"`
			Content string `json:"content"`
		}
		_ = json.Unmarshal(m.Params, &p)
		_ = os.MkdirAll(filepath.Dir(p.Path), 0755)
		if err := os.WriteFile(p.Path, []byte(p.Content), 0644); err != nil {
			_ = s.sendRaw(map[string]any{"jsonrpc": "2.0", "id": *m.ID,
				"error": map[string]any{"code": -32603, "message": err.Error()}})
			return
		}
		_ = s.sendRaw(map[string]any{"jsonrpc": "2.0", "id": *m.ID, "result": nil})
	default:

		_ = s.sendRaw(map[string]any{
			"jsonrpc": "2.0", "id": *m.ID,
			"error": map[string]any{"code": -32601, "message": "method not supported by client"},
		})
	}
}

func (s *session) handleNotification(m rpcMsg) {
	if m.Method != "session/update" {
		return
	}
	var p struct {
		Update struct {
			SessionUpdate string `json:"sessionUpdate"`
			Content       struct {
				Text string `json:"text"`
			} `json:"content"`
			Title string `json:"title"`
			Kind  string `json:"kind"`
		} `json:"update"`
	}
	if err := json.Unmarshal(m.Params, &p); err != nil {
		return
	}
	u := p.Update
	switch u.SessionUpdate {
	case "agent_message_chunk":
		if u.Content.Text != "" {
			s.emit(Update{Kind: "token", Text: u.Content.Text})
		}
	case "tool_call":
		name := u.Title
		if name == "" {
			name = u.Kind
		}
		s.emit(Update{Kind: "tool", Tool: name})
	case "agent_thought_chunk":

	}
}

func (s *session) prompt(ctx context.Context, text string, onUpdate func(Update)) (string, error) {
	s.promptMu.Lock()
	defer s.promptMu.Unlock()

	var sb strings.Builder
	s.setOnUpdate(func(u Update) {
		if u.Kind == "token" {
			sb.WriteString(u.Text)
		}
		if onUpdate != nil {
			onUpdate(u)
		}
	})
	defer s.setOnUpdate(nil)

	_, err := s.call(ctx, "session/prompt", map[string]any{
		"sessionId": s.acpSession,
		"prompt":    []map[string]any{{"type": "text", "text": text}},
	})
	if err != nil {
		out := strings.TrimSpace(sb.String())
		if out != "" {
			return out, nil
		}
		return "", err
	}
	return strings.TrimSpace(sb.String()), nil
}

func (s *session) cancel() {
	_ = s.sendRaw(map[string]any{
		"jsonrpc": "2.0", "method": "session/cancel",
		"params": map[string]any{"sessionId": s.acpSession},
	})
}

func (s *session) close() {
	if s.cmd != nil && s.cmd.Process != nil {
		_ = s.cmd.Process.Kill()
		go func() { _ = s.cmd.Wait() }()
	}
	atomic.StoreInt32(&s.dead, 1)
}

func startSession(dir, model string) (*session, error) {
	args := []string{"--acp", "--skip-trust", "-y"}
	if model != "" {
		args = append(args, "-m", model)
	}
	cmd := exec.Command(binaryName, args...)
	cmd.Dir = dir

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}

	stderr, _ := cmd.StderrPipe()
	if stderr != nil {
		go func() { _, _ = io.Copy(io.Discard, stderr) }()
	}

	if err := cmd.Start(); err != nil {
		return nil, err
	}

	s := &session{
		dir:     dir,
		model:   model,
		cmd:     cmd,
		stdin:   stdin,
		pending: make(map[int]chan rpcMsg),
	}
	go s.readLoop(stdout)

	ctx, cancel := context.WithTimeout(context.Background(), startTimeout)
	defer cancel()

	if _, err := s.call(ctx, "initialize", map[string]any{
		"protocolVersion":    1,
		"clientCapabilities": map[string]any{"fs": map[string]any{"readTextFile": true, "writeTextFile": true}},
	}); err != nil {
		s.close()
		return nil, fmt.Errorf("acp initialize: %w", err)
	}

	res, err := s.call(ctx, "session/new", map[string]any{
		"cwd":        dir,
		"mcpServers": []any{},
	})
	if err != nil {
		s.close()
		return nil, fmt.Errorf("acp session/new: %w", err)
	}
	var nr struct {
		SessionID string `json:"sessionId"`
	}
	if err := json.Unmarshal(res, &nr); err != nil || nr.SessionID == "" {
		s.close()
		return nil, fmt.Errorf("acp session/new: could not get sessionId")
	}
	s.acpSession = nr.SessionID

	_, _ = s.call(ctx, "session/prompt", map[string]any{
		"sessionId": s.acpSession,
		"prompt":    []map[string]any{{"type": "text", "text": primeDirective}},
	})

	return s, nil
}

type Manager struct {
	mu       sync.Mutex
	sessions map[string]*session
}

func NewManager() *Manager {
	return &Manager{sessions: make(map[string]*session)}
}

var Default = NewManager()

func (m *Manager) HasWarm(dir, model string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := m.sessions[dir]
	return s != nil && s.alive() && s.model == model
}

func (m *Manager) ensure(dir, model string) (*session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s := m.sessions[dir]; s != nil {
		if s.alive() && s.model == model {
			return s, nil
		}
		s.close()
		delete(m.sessions, dir)
	}
	s, err := startSession(dir, model)
	if err != nil {
		return nil, err
	}
	m.sessions[dir] = s
	return s, nil
}

func (m *Manager) Prompt(ctx context.Context, dir, model, text string, onUpdate func(Update)) (string, error) {
	s, err := m.ensure(dir, model)
	if err != nil {
		return "", err
	}
	return s.prompt(ctx, text, onUpdate)
}

func (m *Manager) Cancel(dir string) {
	m.mu.Lock()
	s := m.sessions[dir]
	m.mu.Unlock()
	if s != nil {
		s.cancel()
	}
}

func (m *Manager) Close(dir string) {
	m.mu.Lock()
	s := m.sessions[dir]
	delete(m.sessions, dir)
	m.mu.Unlock()
	if s != nil {
		s.close()
	}
}

func (m *Manager) CloseAll() {
	m.mu.Lock()
	all := m.sessions
	m.sessions = make(map[string]*session)
	m.mu.Unlock()
	for _, s := range all {
		s.close()
	}
}
