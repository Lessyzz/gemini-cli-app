# Gemini CLI App

A powerful, local-first CLI tool and web UI for interacting with Google's Gemini AI, featuring workspace management, direct file system access, and project-based chat history.

## 🌟 Overview

**Gemini CLI App** is a standalone developer tool built with Go and React. It brings Google's Gemini AI directly into your local development environment. 

By running a single executable in any directory, it automatically spins up a local server and opens a rich web interface in your browser. It acts as a context-aware AI assistant that can read, write, and diff your local project files, while keeping track of your chat history on a per-project basis.

## ✨ Key Features

- 🚀 **Single Executable:** The React frontend is compiled and embedded directly into the Go binary. No complex setup or dependencies required at runtime.
- 📁 **Workspace-Aware:** Runs exactly where you need it. It understands your current working directory and can read/write files directly.
- 💬 **Project-Based History:** Keeps your AI conversations organized. Chat history is stored locally per project in a `.ai_history.db` file.
- 🛠️ **Direct File Operations:** Built-in API to read, write, rename, diff, and delete files directly from the chat UI.
- 🌐 **Auto-Launching Web UI:** Automatically opens a modern, responsive web interface in your default browser upon execution.
- 🔄 **Multi-Platform Support:** Easily build for Windows, macOS (Apple Silicon & Intel), and Linux.

## 🛠️ Tech Stack

- **Backend:** Go (Fiber web framework, embedded file system)
- **Frontend:** React, Node.js (embedded into the Go binary)
- **Database:** Local SQLite (`.ai_history.db`) for chat history

## 🚀 Getting Started

There are two ways to use **Gemini CLI App**: downloading a pre-built release or building it from source.

### Option 1: Using a Pre-built Release

If you download a pre-built release binary, you don't need to compile the Go backend or the React frontend. However, the application relies on the underlying `gemini` CLI to communicate with the AI.

**Prerequisites:**
- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/download/) & **npm** (Required to install the Gemini CLI)
- **Gemini CLI**: You must install the underlying Gemini CLI globally via npm:
  ```bash
  npm install -g @google/generative-ai-cli # (Update this with the exact package name if it's different)
  ```

### Option 2: Building from Source

If you want to compile the project yourself or contribute to the code, you will need the following tools installed on your system:

**Prerequisites:**
- [Git](https://git-scm.com/downloads) (to clone the repository)
- [Node.js](https://nodejs.org/en/download/) & **npm** (to build the frontend dependencies)
- [Go](https://golang.org/doc/install) (version 1.21 or newer recommended)

#### Build Instructions

A convenient `build.sh` script is provided to compile the frontend and build the Go binary. You can build for your current host machine or specify a target OS.

```bash
# Clone the repository
git clone https://github.com/yourusername/gemini-cli-app.git
cd gemini-cli-app

# Make the build script executable (if on Unix)
chmod +x build.sh

# Run the build script for your current system
./build.sh

# Or build for a specific platform:
# ./build.sh windows
# ./build.sh mac
# ./build.sh linux
```

This script will:
1. Install frontend dependencies and build the React app.
2. Embed the built React app into the Go application.
3. Compile the standalone executable into the `dist/` directory.

### Usage

1. Navigate to any project directory where you want to use the AI assistant:
   ```bash
   cd /path/to/your/project
   ```
2. Run the compiled executable from that directory:
   ```bash
   # Example for your current host platform
   /path/to/gemini-cli-app/dist/gemini-cli-app
   ```
3. The server will start on `http://localhost:8080`, and your default browser will automatically open the UI.

## ⚙️ How It Works

1. When you run the binary, it captures your current working directory.
2. It initializes a local `.ai_history.db` file in that directory to store project-specific chats.
3. It starts a Go Fiber server that serves both the API endpoints and the embedded React frontend.
4. You interact with the React UI, which communicates with the Go backend.
5. The backend safely executes file operations on your local system and communicates with the Gemini API based on your prompts.

## 📄 License

[MIT License](LICENSE)


<img width="1459" height="722" alt="image" src="https://github.com/user-attachments/assets/65d160c7-bb0e-4076-9f50-6a8d2dd573da" />

<img width="1461" height="721" alt="image" src="https://github.com/user-attachments/assets/1d1ab6ef-f977-4613-b2d1-f7cbee46478d" />


