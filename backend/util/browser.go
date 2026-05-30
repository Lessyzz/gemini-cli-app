package util

import (
	"log"
	"os/exec"
	"runtime"
)

func OpenBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":

		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}

	if err := cmd.Start(); err != nil {
		log.Printf("warning: could not open browser automatically (%v). Please open manually: %s", err, url)
	}
}
