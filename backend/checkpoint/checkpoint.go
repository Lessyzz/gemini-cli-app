package checkpoint

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	shadowGitDir = ".ai_checkpoints"
)

const excludeContent = shadowGitDir + "/\n" +
	".ai_history.db\n" +
	".git/\n" +
	"node_modules/\n" +
	"bower_components/\n" +
	"vendor/\n" +
	"dist/\n" +
	"build/\n" +
	"out/\n" +
	".next/\n" +
	".nuxt/\n" +
	".svelte-kit/\n" +
	".turbo/\n" +
	".cache/\n" +
	".parcel-cache/\n" +
	"target/\n" +
	".gradle/\n" +
	"__pycache__/\n" +
	".venv/\n" +
	"venv/\n" +
	".mypy_cache/\n" +
	".pytest_cache/\n" +
	".DS_Store\n"

var excludeDirs = []string{
	"node_modules", "bower_components", "vendor", "dist", "build", "out",
	".next", ".nuxt", ".svelte-kit", ".turbo", ".cache", ".parcel-cache",
	"target", ".gradle", "__pycache__", ".venv", "venv",
	".mypy_cache", ".pytest_cache",
}

func gitArgs(projectDir string, rest ...string) []string {
	gitDir := filepath.Join(projectDir, shadowGitDir)
	base := []string{"--git-dir=" + gitDir, "--work-tree=" + projectDir}
	return append(base, rest...)
}

func run(projectDir string, args ...string) (string, error) {
	cmd := exec.Command("git", gitArgs(projectDir, args...)...)
	cmd.Dir = projectDir
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("git %s: %v (%s)", strings.Join(args, " "), err, strings.TrimSpace(string(out)))
	}
	return string(out), nil
}

func ensure(projectDir string) error {
	gitDir := filepath.Join(projectDir, shadowGitDir)
	fresh := false
	if _, err := os.Stat(gitDir); err != nil {

		if _, err := run(projectDir, "init"); err != nil {
			return err
		}

		_, _ = run(projectDir, "config", "user.email", "assistant@local")
		_, _ = run(projectDir, "config", "user.name", "AI Asistan")
		fresh = true
	}

	excludePath := filepath.Join(gitDir, "info", "exclude")
	current, _ := os.ReadFile(excludePath)
	if string(current) != excludeContent {
		_ = os.MkdirAll(filepath.Dir(excludePath), 0755)
		_ = os.WriteFile(excludePath, []byte(excludeContent), 0644)
		if !fresh {

			args := append([]string{"rm", "-r", "--cached", "--ignore-unmatch", "-q", "--"}, excludeDirs...)
			_, _ = run(projectDir, args...)
		}
	}

	return nil
}

func Snapshot(projectDir string) (string, error) {
	if err := ensure(projectDir); err != nil {
		return "", err
	}
	if _, err := run(projectDir, "add", "-A"); err != nil {
		return "", err
	}

	if _, err := run(projectDir, "commit", "--allow-empty", "-m", "checkpoint"); err != nil {
		return "", err
	}
	hash, err := run(projectDir, "rev-parse", "HEAD")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(hash), nil
}

type Change struct {
	Status	string	`json:"status"`
	Path	string	`json:"path"`
}

func Diff(projectDir, from, to string) ([]Change, error) {
	if from == "" {
		return nil, nil
	}
	if err := ensure(projectDir); err != nil {
		return nil, err
	}

	var out string
	var err error
	if to == "" {
		_, _ = run(projectDir, "add", "-A")
		out, err = run(projectDir, "diff", "--name-status", "--cached", from)
	} else {
		out, err = run(projectDir, "diff", "--name-status", from, to)
	}
	if err != nil {
		return nil, err
	}
	return parseNameStatus(out), nil
}

func FileDiff(projectDir, from, to, path string) (string, error) {
	if from == "" {
		return "", nil
	}
	if err := ensure(projectDir); err != nil {
		return "", err
	}
	if to == "" {
		_, _ = run(projectDir, "add", "-A")
		return run(projectDir, "diff", "--cached", from, "--", path)
	}
	return run(projectDir, "diff", from, to, "--", path)
}

func parseNameStatus(out string) []Change {
	var changes []Change
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		if line == "" {
			continue
		}
		fields := strings.Split(line, "\t")
		if len(fields) < 2 {
			continue
		}
		status := string(fields[0][0])

		path := fields[len(fields)-1]
		changes = append(changes, Change{Status: status, Path: path})
	}
	return changes
}

func Restore(projectDir, hash string) error {
	if hash == "" {
		return fmt.Errorf("invalid checkpoint")
	}
	if err := ensure(projectDir); err != nil {
		return err
	}

	if _, err := run(projectDir, "add", "-A"); err != nil {
		return err
	}
	if _, err := run(projectDir, "reset", "--hard", hash); err != nil {
		return err
	}
	return nil
}
