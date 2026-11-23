# SideNoteBook

> A **Windows 7 Sticky Notes–inspired** floating browser notepad, research context capturer, and **Tab Folder Session Manager** for Chromium browsers — with **serverless Gmail + AES-256-GCM encrypted Google Drive sync**.

Built for deep browser-based research (reading dense articles, papers, documentation, and technical video lectures) without losing your notes when switching tabs or leaving your main workstation.

---

## Key Features

### 1. Windows 7–Style Floating Sticky Note Overlay
- **Move Freely Anywhere on Screen**: Smooth 60fps pointer dragging across the viewport with automatic boundary clamping so notes never get lost off-screen.
- **Multi-Edge Resizing**: Resize from the right edge, bottom edge, or classic bottom-right diagonal grip.
- **Classic Controls**:
  - **`+` New Note & Switcher (`1/N ▾`)**: Create and switch between multiple notes directly from the sticky header.
  - **Window-Shade Collapse (`—` or double-click header)**: Collapse the note body into a compact floating title bar when reading behind it.
  - **Pin / Lock (`📌`)**: Lock the sticky note position while typing.
  - **Transparency Cycling (`98%` / `85%` / `68%`)**: Read charts or text underneath your note.
  - **6 Color Palettes**: Classic Yellow, Sky Blue, Mint Green, Rose Pink, Lavender, and Charcoal Dark.
- **Isolated Shadow DOM**: Webpage styles never bleed into your sticky note, and your note never breaks host pages.
- **Global Shortcut**: Press **`Alt+N`** anytime to show/hide the floating sticky note.

### 2. Research-Focused Markdown Editor & Smart Context Capture
- **Markdown Toolbar & Shortcuts**: Headings (`#`), Bold (`Ctrl+B`), Italic (`Ctrl+I`), bullet lists (`-`), task checkboxes (`- [ ]`), inline code (`` `code` ``), smart `Enter` list continuation, and `Tab` indentation.
- **Interactive View Mode (`👁 View`)**: Renders clean Markdown with clickable links and interactive checkboxes.
- **1-Click Citations & YouTube Timestamps (`📎 Cite` / `⏱ mm:ss`)**:
  - On regular articles, inserts `[Page Title](URL)`.
  - On **YouTube**, automatically detects the current video playback timestamp (`⏱ 14:22`) and inserts a timestamped link. Clicking that link in View mode while on the same video seeks straight to that moment without reloading.
- **Quote Capture (`❝ Quote` & Right-Click Menu)**:
  - Highlight text on any page and click **`❝ Quote`** (or right-click -> **Add quote to SideNoteBook**) to append a formatted blockquote with source link.

### 3. Tab Folder & Research Session Manager
Save dozens of open research tabs into named folders and reopen them days later:
- **Save Open Tabs into a Named Folder**: Accessible from the **`📁`** icon inside the floating sticky note, the toolbar popup, the Side Panel, or the detached **`❐ Popout`** window.
- **Selective Tab Saving**: Pick all tabs or specific tabs via checkboxes.
- **Chrome Bookmarks Bar Mirroring**: Optionally creates a matching folder directly on your Chrome Bookmarks Bar.
- **Declutter Toggle**: Optionally closes saved tabs after storing them safely.
- **Flexible Restoration**:
  - **Open Tab Group**: Reopens all saved tabs inside a colored, labeled **Chrome Tab Group** matching your folder name and color.
  - **New Win**: Launches all saved tabs in a dedicated new browser window.
  - **Single Tab Pick & `+ Tab`**: Expand a folder to open one link or append your active tab to an existing folder.
- **Linked Sticky Notes**: Link a research note to a Tab Folder so reopening the folder automatically brings up its matching note.

### 4. Full Workspace Side Panel, Popout & Export
- **Chrome Side Panel (`◫ Panel`) & Detached Popout (`❐ Popout`)**: Full workspace with global search across all notes, quotes, folder names, and saved URLs — works seamlessly even on restricted pages (`chrome://`, PDFs, Chrome Web Store).
- **Export & Backup**:
  - Download any note as `.md` (including linked tab URLs) or copy Markdown to clipboard (`📋`).
  - Export all notes as `.md` or export/import a full `.json` backup.

### 5. Serverless Gmail Auth & Encrypted Google Drive Sync
Take your notes and tab folders to any browser or workstation with **zero backend servers**:
- **Client-Side Encryption (`AES-256-GCM`)**: Data is encrypted locally in your browser using the Web Crypto API (`PBKDF2` SHA-256, 150,000 iterations) before upload.
- **Two Unlock Modes**:
  - **Auto by Gmail**: Automatically decrypts and extracts your Drive vault (`sidenotebook.vault.enc`) upon signing in with the same Gmail address on another browser.
  - **Master Passphrase**: Extra zero-knowledge passphrase lock.
- **Google Drive Storage**: Stores `/SideNoteBook/sidenotebook.vault.enc` inside your personal Google Drive and smart-merges notes/folders by `updatedAt` timestamp.
- **Offline `.vault.enc` Verification**: Test encrypted export/decryption locally even before configuring Google OAuth.

---

## Tech Stack

- **Extension Platform**: Chromium Manifest V3
- **Language & UI**: TypeScript, React 18 (`.tsx`), Tailwind CSS
- **Bundler**: Vite (`vite.config.ts` for Popup/Side Panel/Service Worker + `vite.content.config.ts` IIFE bundle for Shadow DOM Content Script)
- **Browser APIs**: `chrome.storage.local` (`unlimitedStorage`), `chrome.tabs`, `chrome.tabGroups`, `chrome.bookmarks`, `chrome.sidePanel`, `chrome.contextMenus`, `chrome.identity`, Web Crypto API (`crypto.subtle`)

---

## Project Structure

```text
SideNoteBook/
├── public/
│   ├── icons/                     # Extension icons (16, 48, 128)
│   └── manifest.json              # Manifest V3 permissions & entrypoints
├── src/
│   ├── components/
│   │   ├── sticky/                # StickyWindow, StickyHeader, NoteEditor, MarkdownPreview, themeConfig
│   │   ├── sync/                  # CloudSyncPanel (Gmail + Encrypted Drive Sync UI)
│   │   └── tabs/                  # SaveTabsModal, FolderList
│   ├── entrypoints/
│   │   ├── background.ts          # MV3 Service Worker (tab bridge, context menus, shortcuts)
│   │   ├── content/               # Shadow DOM floating sticky note injector
│   │   ├── popup/                 # Toolbar popup UI
│   │   └── sidepanel/             # Full Side Panel / Popout workspace
│   ├── hooks/
│   │   ├── useDraggableWindow.ts  # 60fps pointer dragging, resizing & viewport clamping
│   │   └── useSyncedStorage.ts    # Real-time cross-tab chrome.storage.local listener
│   ├── services/
│   │   ├── contextCapture.ts      # Selection quote & YouTube timestamp extractor/seeker
│   │   ├── cryptoService.ts       # Web Crypto AES-256-GCM + PBKDF2 vault encryption
│   │   ├── driveSyncService.ts    # Google OAuth2 + Google Drive REST API v3 sync
│   │   ├── exportService.ts       # Markdown & JSON backup export/import
│   │   ├── storageService.ts      # Persistent state manager
│   │   └── tabFolderService.ts    # Tab capture, Tab Groups, & Bookmarks Bar sync
│   ├── styles/global.css
│   └── types/index.ts
├── package.json
├── vite.config.ts
└── vite.content.config.ts
```

---

## Getting Started (Build & Load in Chrome)

### Prerequisites
- **Node.js** (v18+ recommended) and **npm**
- **Google Chrome** (or any Chromium-based browser such as Edge or Brave)

### 1. Install Dependencies & Build
```bash
npm install
npm run build
```

This runs TypeScript typechecking (`tsc --noEmit`) and outputs the ready-to-load extension into `dist/`.

### 2. Load Unpacked in Chrome
1. Open Chrome and go to `chrome://extensions`.
2. Toggle **Developer mode** ON (top right).
3. Click **Load unpacked** and select the `dist/` folder inside this repository.
4. Pin **SideNoteBook** to your Chrome toolbar for quick access.

### Available NPM Scripts
- `npm run typecheck` — Run `tsc --noEmit`
- `npm run build:ui` — Build Popup, Side Panel, and Background Service Worker to `dist/`
- `npm run build:content` — Build the Shadow DOM Content Script (`dist/content.js`)
- `npm run build` — Run full typecheck + UI/background + content script build

---

## Setting Up Serverless Gmail & Google Drive Sync

Because SideNoteBook has no backend server, each user can connect their own free Google Cloud OAuth 2.0 Client ID:

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a free project.
2. Enable the **Google Drive API**.
3. Configure the **OAuth consent screen**:
   - Add scopes `https://www.googleapis.com/auth/userinfo.email` and `https://www.googleapis.com/auth/drive.file`.
   - Add your Gmail address under **Test users**.
4. Create **Credentials -> OAuth client ID -> Web application**:
   - In SideNoteBook, open **`◫ Panel` -> `☁ Cloud` -> `Setup Guide`** and copy your extension's exact Chrome Redirect URI (`https://<extension-id>.chromiumapp.org/`).
   - Paste it under **Authorized redirect URIs** in Google Cloud Console.
5. Copy the generated Client ID (`xxxx.apps.googleusercontent.com`), paste it into **`Google OAuth Client ID`** in the `☁ Cloud` tab, click **Save**, and click **Sign In with Gmail**.

> **Tip:** You can also test encryption immediately offline using **Export `.vault.enc`** / **Decrypt `.vault.enc`** inside the `☁ Cloud` tab.

---

## Privacy & Security
- All notes, quotes, and saved tab folders stay locally in `chrome.storage.local` until you explicitly sync.
- Cloud sync payloads are encrypted client-side with **AES-256-GCM** before being uploaded to your own Google Drive.
- No third-party analytics, tracking, or intermediate servers are used.
