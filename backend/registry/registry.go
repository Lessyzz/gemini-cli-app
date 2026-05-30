package registry

import (
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const historyFile = ".ai_history.db"

var scanSkip = map[string]bool{
	"node_modules":	true,
	"Library":	true,
	"vendor":	true,
	"dist":		true,
	"build":	true,
	".Trash":	true,
}

type Project struct {
	Path		string		`json:"path"`
	Name		string		`json:"name"`
	LastOpened	time.Time	`json:"last_opened"`
}

var mu sync.Mutex

func file() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	dir := filepath.Join(home, ".gemini-cli-app")
	_ = os.MkdirAll(dir, 0755)
	return filepath.Join(dir, "projects.json")
}

func read() []Project {
	data, err := os.ReadFile(file())
	if err != nil {
		return nil
	}
	var list []Project
	if err := json.Unmarshal(data, &list); err != nil {
		return nil
	}
	return list
}

func write(list []Project) {
	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(file(), data, 0644)
}

func List() []Project {
	mu.Lock()
	defer mu.Unlock()
	list := read()
	sort.Slice(list, func(i, j int) bool {
		return list[i].LastOpened.After(list[j].LastOpened)
	})
	return list
}

func Touch(path string) {
	mu.Lock()
	defer mu.Unlock()
	upsert(read(), path, time.Now(), true)
}

func Register(path string) {
	mu.Lock()
	defer mu.Unlock()
	upsert(read(), path, time.Now(), false)
}

func Remove(path string) {
	mu.Lock()
	defer mu.Unlock()
	list := read()
	out := list[:0]
	for _, p := range list {
		if p.Path != path {
			out = append(out, p)
		}
	}
	write(out)
}

func Import(root string) {
	found := map[string]time.Time{}

	maxDepth := strings.Count(filepath.Clean(root), string(os.PathSeparator)) + 6

	_ = filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			name := d.Name()
			if path != root {
				if scanSkip[name] || strings.HasPrefix(name, ".") {
					return filepath.SkipDir
				}
			}
			if strings.Count(path, string(os.PathSeparator)) > maxDepth {
				return filepath.SkipDir
			}
			return nil
		}
		if d.Name() == historyFile {
			dir := filepath.Dir(path)
			t := time.Time{}
			if info, e := d.Info(); e == nil {
				t = info.ModTime()
			}
			found[dir] = t
		}
		return nil
	})

	if len(found) == 0 {
		return
	}

	mu.Lock()
	defer mu.Unlock()
	list := read()
	for dir, t := range found {
		list = upsert(list, dir, t, false)
	}
	write(list)
}

func upsert(list []Project, path string, t time.Time, bump bool) []Project {
	for i := range list {
		if list[i].Path == path {
			if bump {
				list[i].LastOpened = t
				list[i].Name = filepath.Base(path)
			}
			if !bump {
				return list
			}
			write(list)
			return list
		}
	}
	list = append(list, Project{
		Path:		path,
		Name:		filepath.Base(path),
		LastOpened:	t,
	})
	if bump {
		write(list)
	}
	return list
}
