<div align="center">
  <h1>🏃‍♂️ LeetChaser</h1>
  <p><b>Quick navigation, friend-tracking, and competitive LeetCoding right from your keyboard.</b></p>
  
  [![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/pixelpair214/Leetchaser/releases)
  [![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![WXT](https://img.shields.io/badge/WXT-67d55e?style=flat&logo=webextension&logoColor=white)](https://wxt.dev/)
</div>

<br />

A powerful browser extension designed to bring the competitive spirit directly to your browser. Whether you want to instantly jump into a LeetCode problem, see what your friends are solving, or race them in real-time, **LeetChaser** has you covered. Never lose momentum during your coding practice again!

---

## ✨ Why LeetChaser?

- 🏎️ **Chase Mode**: Race up to 3 LeetCode friends with real-time telemetry using the `@chase` command.
- 👯 **Friend Suggestions**: Stuck? See questions recently solved by the users you follow and get curated recommendations (`/suggestion`).
- ⚡ **Instant Search**: Search 3000+ LeetCode problems instantly by number or title—cached locally for lightning-fast lookups.
- ⌨️ **Keyboard-Driven**: Use `Alt+L` anywhere on the web to open the launcher. Your hands never have to leave the keyboard.

## 🚀 Quick Start

### Installation

#### 🛍️ From Chrome Web Store
*(Coming Soon! Stay tuned.)*

#### 🛠️ Manual Installation (Development)

1. Download the latest release from [GitHub Releases](https://github.com/pixelpair214/Leetchaser/releases)
2. Open Chrome and navigate to `chrome://extensions/`
3. Toggle on **Developer mode** in the top right.
4. Click **Load unpacked** and select the downloaded folder.
5. The extension will automatically sync LeetCode problems on its first run!

---

## 🕹️ Usage & Commands

**1. Summon the Launcher**: Press `Alt+L` on any webpage.  
**2. Search**: Type to search for problems (e.g. `"1"` for Two Sum or `"binary"` for binary search problems).  
**3. Navigate & Go**: Use the `↑` and `↓` arrow keys to navigate, and hit `Enter` to jump into a problem.

### ⚡ Slash Commands

Use `@` or `/` followed by a command for advanced actions:

| Command | Aliases | Description |
| :--- | :--- | :--- |
| **`@chase`** | `@target`, `@race` | 🏎️ Enter Chase Mode: 1v1 telemetry & race up to 3 members! |
| **`/suggestion`**| `/suggestions`, `/recommend` | 💡 See questions recently solved by friends & recommendations. |
| **`/random`** | - | 🎲 Open a random LeetCode problem. |
| **`/history`** | `/recent` | 🕒 View your last 10 opened problems. |
| **`/theme`** | `/dark`, `/light` | 🌗 Toggle between dark and light themes. |
| **`/help`** | `/commands` | 🆘 Show all available commands. |

---

## 💻 Development

### Prerequisites

- **Node.js 18+**
- **Bun** (Recommended package manager)
- **Chrome/Firefox/Edge** for testing

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/pixelpair214/Leetchaser.git
cd Leetchaser

# 2. Install dependencies
npm install

# 3. Start development mode
npm dev
```

*The extension uses WXT and will auto-reload as you make changes!*

### Build Commands

```bash
npm dev       # Start development mode with hot-reload
npm run build # Build for production
```

---

## 🏗️ Architecture & Tech Stack

LeetChaser is built for speed and reliability, leveraging modern web technologies:

- **[WXT](https://wxt.dev/)**: Next-gen web extension framework.
- **React 18 & TypeScript**: Robust, type-safe, and modular UI.
- **Tailwind CSS**: Utility-first, responsive styling.
- **IndexedDB (idb)**: Caches 3000+ problems locally for instant offline-ready access.
- **Shadow DOM**: Injects the UI cleanly into any host website without CSS conflicts.
- **Background Workers**: Handles LeetCode API communications and background syncs smoothly.

---

## 🛡️ Privacy & Security

Your data stays yours.
- 🚫 **No Tracking:** We do not collect analytics or telemetry.
- 🔒 **Local Storage:** Problems and history are cached locally in your browser.
- 🌐 **Direct API Calls:** LeetChaser communicates *only* with the official LeetCode API.
- 👻 **Isolated UI:** Shadow DOM ensures no layout breakage on other websites.

---

## 🤝 Contributing

We welcome contributions of all kinds!

1. **Fork** the repository.
2. **Branch**: `git checkout -b feature/amazing-feature`
3. **Commit**: `git commit -m "feat: add amazing feature"`
4. **Push & PR**: Open a pull request!

---

## 💬 Support & Community

- 🐛 **Found a bug?** [Open an Issue](https://github.com/pixelpair214/Leetchaser/issues)
- ✨ **Have an idea?** [Request a Feature](https://github.com/pixelpair214/Leetchaser/issues)


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/pixelpair214/Leetchaser/blob/master/LICENSE) file for details.

---
<div align="center">
  <i>If LeetChaser helped you land that offer or win a race, give this repository a ⭐!</i>
</div>
