<p align="center">
  <img src="assets/jarvis-hero.png" alt="Jarvis by kr8tiv" width="700" />
</p>

<h1 align="center">MSW Protocol</h1>

<p align="center">
  <strong>Make Shit Work</strong> — The autonomous bridge between NotebookLM and your coding agent.
</p>

<p align="center">
  <a href="https://x.com/kr8tivai"><img src="https://img.shields.io/badge/kr8tiv-000?style=for-the-badge&logo=x&logoColor=white" alt="kr8tiv" /></a>
  <a href="https://www.jarvislife.io"><img src="https://img.shields.io/badge/Jarvis_Life_OS-0ff?style=for-the-badge&logo=data:image/svg+xml;base64,&logoColor=black" alt="Jarvis" /></a>
  <a href="https://github.com/glittercowboy/get-shit-done"><img src="https://img.shields.io/badge/Powered_by_GSD-ff6b6b?style=for-the-badge" alt="GSD" /></a>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## A [kr8tiv](https://x.com/kr8tivai) Project

<img src="assets/jarvis-bot.png" alt="Jarvis Bot" width="80" align="right" />

Built by **kr8tiv** while shipping [Jarvis Life OS](https://www.jarvislife.io) — a project so complex it forced us to find better ways to work with AI agents.

We discovered the manual copy-paste loop between NotebookLM and coding agents was tedious but *incredibly effective*. We got tired of being the middleman. **MSW automates that workflow.**

> *This is a side quest born from necessity. We're sharing it because if it's helping us ship Jarvis faster, it might help you too.*

| Platform | Link |
|----------|------|
| Website | [jarvislife.io](https://www.jarvislife.io) |
| Twitter/X | [@Jarvis_lifeos](https://x.com/Jarvis_lifeos) |
| Token | [View on DexScreener](https://dexscreener.com/solana/GNFeekyLr79S7jkBipPznLkiVm1UFqmPNbqS96mXmGqq) |

---

## The Problem

```
You:     *copies error from Claude Code*
You:     *pastes into NotebookLM*
You:     *gets perfect grounded answer*
You:     *pastes back into Claude Code*
You:     *agent succeeds*
You:     *repeats 50 times a day*
You:     "there has to be a better way"
```

Meanwhile, NotebookLM suggests follow-up questions that most people ignore. Those suggestions are often *exactly what you need* — and nobody clicks them.

---

## The Solution

<p align="center">
  <img src="assets/kr8tiv-brain.png" alt="kr8tiv Brain" width="280" />
</p>

MSW creates an **Auto-Conversation Engine** that:

- **Auto-expands topics** — Clicks ALL suggested questions in NotebookLM, scores relevance, keeps going 10+ levels deep
- **Bidirectional comms** — Injects agent errors INTO NotebookLM, gets grounded answers, feeds them back
- **Persistent knowledge** — Compiles everything into markdown and git commits it
- **Zero manual intervention** — The whole loop runs autonomously

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        MSW MCP SERVER                            │
│                                                                  │
│   ┌────────────────────────────────────────────────────────┐    │
│   │              Auto-Conversation Engine                   │    │
│   │                                                        │    │
│   │  1. Detect suggested topics in NotebookLM              │    │
│   │  2. Score relevance (string-similarity, 0-100)         │    │
│   │  3. Click high-scoring topics automatically            │    │
│   │  4. Recurse until convergence (10+ levels)             │    │
│   │  5. Inject agent errors → get grounded answers         │    │
│   │  6. Compile & git commit all findings                  │    │
│   └────────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  GSD Planner │   │ Ralph Runner │   │Browser Driver│       │
│   └──────────────┘   └──────────────┘   └──────────────┘       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
   ┌──────────┐      ┌──────────────┐      ┌──────────────┐
   │ .msw/    │      │  NotebookLM  │      │   Chrome +   │
   │ state    │      │  (browser)   │      │  Playwright  │
   └──────────┘      └──────────────┘      └──────────────┘
```

### Built On

| Foundation | Role | Link |
|------------|------|------|
| **GSD Protocol** | Spec-driven planning & verification | [GitHub](https://github.com/glittercowboy/get-shit-done) |
| **Ralph Wiggum Loop** | Continuous iteration until convergence | [Anthropic](https://github.com/anthropics/claude-code) |
| **NotebookLM MCP** | Agent-to-NotebookLM bridge | [GitHub](https://github.com/PleasePrompto/notebooklm-mcp) |

---

## Quick Start

### Automated Install (Recommended)

**Windows (PowerShell)**:
```powershell
git clone https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW.git
cd kr8tiv-MSW
.\setup.ps1
```

**Linux/macOS (Bash)**:
```bash
git clone https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW.git
cd kr8tiv-MSW
chmod +x setup.sh && ./setup.sh
```

The setup script will:
- ✅ Install dependencies
- ✅ Build TypeScript
- ✅ Configure MCP for Claude Code/Cursor/Windsurf
- ✅ Set up authentication flow

Then **restart your IDE** and the MSW tools will appear automatically.

### Manual Install

See [SETUP.md](./SETUP.md) for detailed installation and authentication instructions.

---

## MCP Tools

| Tool | What It Does |
|------|-------------|
| `msw_init` | Initialize `.msw/` with **Google authentication** and config |
| `msw_status` | Check job progress, config, or run **health check** (`msw doctor`) |
| `msw_notebook_add` | Link a NotebookLM notebook URL to the project |
| `msw_research` | Auto-conversation engine — extract deep knowledge from NotebookLM |
| `msw_plan` | Generate PRD grounded in research findings |
| `msw_execute` | Run Ralph loop with NotebookLM feedback injection |
| `msw_verify` | Validate implementation against requirements |

**New**: `msw_init` now handles authentication automatically. Run `msw_status` with `runHealthCheck: true` for diagnostics.

---

## Documentation

### Setup & Troubleshooting

| Document | Description |
|----------|-------------|
| **[SETUP.md](./SETUP.md)** | Complete installation and authentication guide |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Common issues and solutions |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Development guidelines and PR process |

### Examples & Workflows

| Example | Description | Time |
|---------|-------------|------|
| **[VPS Debugging](./examples/01-vps-debugging.md)** | Fix bot crashes using NotebookLM knowledge | 10 min |
| **[Feature Planning](./examples/02-feature-planning.md)** | Research → PRD → Execute with GSD + Ralph | 20 min |

### Design & Architecture

All design documents, research reports, and reference material live in [`docs/`](./docs/):

| Document | Description |
|----------|-------------|
| [MSW_PRD.md](docs/MSW_PRD.md) | Full product requirements |
| [MSW_PROTOCOL_ARCHITECTURE.md](docs/MSW_PROTOCOL_ARCHITECTURE.md) | Technical architecture |
| [Architectural Blueprint](docs/architectural-blueprint.md) | Research report on system design |
| [Guide: Implementing MSW](docs/guide-implementing-msw.md) | Step-by-step implementation guide |
| [Ralph Loop & MCP](docs/ralph-loop-and-mcp.md) | Advanced agentic orchestration |
| [Strategic Playbook](docs/strategic-playbook.md) | Go-to-market strategy |
| [GSD Ralph Prompt](docs/GSD_RALPH_PROMPT.md) | GSD + Ralph integration prompt |

---

## Acknowledgements

### GSD Protocol

MSW would not exist without **GSD (Get Shit Done)** by [@official_taches](https://x.com/official_taches). The spec-driven approach, phase planning, and verification loops changed how we build software with AI agents.

| Resource | Link |
|----------|------|
| GitHub | [glittercowboy/get-shit-done](https://github.com/glittercowboy/get-shit-done) |
| Twitter/X | [@official_taches](https://x.com/official_taches) |

---

## Philosophy

No more fuckery. No more endless loops. No more manual copy-paste.

**Just make shit work.**

---

<p align="center">
  <sub>MIT License</sub><br/>
  <a href="https://x.com/kr8tivai"><strong>@kr8tivai</strong></a> · <a href="https://www.jarvislife.io"><strong>jarvislife.io</strong></a> · <a href="https://x.com/Jarvis_lifeos"><strong>@Jarvis_lifeos</strong></a>
</p>
