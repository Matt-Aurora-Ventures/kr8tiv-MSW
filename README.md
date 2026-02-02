# MSW Protocol

**Make Shit Work** — An autonomous coding system that bridges NotebookLM and coding agents through an automated conversation engine.

---

## A [kr8tiv](https://x.com/kr8tivai) Project

This protocol is being developed by **kr8tiv** as part of our work building [Jarvis Life OS](https://www.jarvislife.io) — a complex, ambitious project that pushed us to find better ways to work with AI agents.

While building Jarvis, we discovered that the manual copy-paste loop between NotebookLM and coding agents was tedious but *incredibly effective* at fixing errors. We got tired of being the middleman. MSW automates that workflow.

**This is a side quest born from necessity.** We're sharing it because if it's helping us ship Jarvis faster, it might help you too.

### Follow Jarvis Life OS

| Platform | Link |
|----------|------|
| Website | [jarvislife.io](https://www.jarvislife.io) |
| Twitter/X | [@Jarvis_lifeos](https://x.com/Jarvis_lifeos) |

### Support Our Work

If you find value in what we're building, you can support us by checking out the Jarvis token:

[View on DexScreener](https://dexscreener.com/solana/GNFeekyLr79S7jkBipPznLkiVm1UFqmPNbqS96mXmGqq)

---

## Acknowledgements

### GSD Protocol — Thank You

MSW would not exist without the **GSD (Get Shit Done) Protocol** by [@official_taches](https://x.com/official_taches).

When we were struggling to structure our development workflow for Jarvis, GSD gave us the foundation we needed. The spec-driven approach, the phase planning, the verification loops — it changed how we build software with AI agents.

**Thank you for creating GSD. It's genuinely helped us ship faster and with fewer headaches.**

| Resource | Link |
|----------|------|
| GitHub | [glittercowboy/get-shit-done](https://github.com/glittercowboy/get-shit-done) |
| Twitter/X | [@official_taches](https://x.com/official_taches) |

---

## The Problem

We kept doing the same thing over and over:

1. Agent hits an error
2. Copy the error to NotebookLM
3. Get a grounded, documentation-backed answer
4. Paste it back to the agent
5. Agent succeeds
6. Repeat 50 times a day

It worked *incredibly well*. We just got tired of being the middleman.

Meanwhile, NotebookLM suggests follow-up questions that most people ignore. Those suggestions are often exactly what you need.

---

## The Solution

MSW Protocol creates an **Auto-Conversation Engine** that:

- **Auto-expands topics**: Clicks ALL suggested questions in NotebookLM (not just 1-2), evaluates relevance, and keeps going 10+ levels deep
- **Bidirectional communication**: Injects agent errors INTO NotebookLM, gets grounded answers, feeds them back to the agent
- **Persistent knowledge**: Compiles everything into markdown and git commits it
- **No more manual copy-paste**: The whole loop runs automatically

### Built On

| Foundation | Role | Link |
|------------|------|------|
| **GSD Protocol** | Spec-driven planning | [GitHub](https://github.com/glittercowboy/get-shit-done) |
| **Ralph Wiggum Loop** | Continuous iteration | [Anthropic](https://github.com/anthropics/claude-code) |
| **NotebookLM MCP** | Agent-to-NotebookLM bridge | [GitHub](https://github.com/PleasePrompto/notebooklm-mcp) |

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     MSW MCP SERVER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Auto-Conversation Engine                                  │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ 1. Detect suggested topics in NotebookLM            │  │
│   │ 2. Score relevance (0-100) with local LLM           │  │
│   │ 3. Click high-scoring topics automatically          │  │
│   │ 4. Repeat until no new relevant topics (10+ levels) │  │
│   │ 5. Inject agent errors, get grounded answers        │  │
│   │ 6. Compile and git commit all findings              │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│   │ GSD Planner   │  │ Ralph Runner  │  │ Browser Driver│  │
│   └───────────────┘  └───────────────┘  └───────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   NotebookLM    │
                    └─────────────────┘
```

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW.git
cd kr8tiv-MSW

# Install dependencies
npm install

# Configure your NotebookLM notebook URL
cp config/default.yaml config/local.yaml
# Edit config/local.yaml with your notebook URL

# Run the MCP server
node server.js
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `msw_init` | Initialize MSW for a project |
| `msw_research` | Run auto-conversation to extract NotebookLM knowledge |
| `msw_plan` | Generate PRD with research grounding |
| `msw_execute` | Run Ralph loop with NotebookLM feedback |
| `msw_verify` | Verify completion criteria |
| `msw_status` | Check progress |

---

## Documentation

| Document | Description |
|----------|-------------|
| [MSW_PRD.md](./MSW_PRD.md) | Full product requirements |
| [MSW_PROTOCOL_ARCHITECTURE.md](./MSW_PROTOCOL_ARCHITECTURE.md) | Technical architecture |
| [Research Report](./Research%20Report_%20Architectural%20Blueprint%20for%20the%20MSW%20Protocol.md) | Architectural blueprint |

---

## Status

**Currently in development.** We're building this alongside Jarvis and will release when stable.

Follow [@kr8tivai](https://x.com/kr8tivai) for updates.

---

## Philosophy

No more fuckery. No more endless loops. No more manual copy-paste.

**Just make shit work.**

---

## License

MIT

---

## Connect

| | Link |
|---|------|
| **kr8tiv** | [@kr8tivai](https://x.com/kr8tivai) |
| **Jarvis Life OS** | [jarvislife.io](https://www.jarvislife.io) / [@Jarvis_lifeos](https://x.com/Jarvis_lifeos) |
| **GSD Protocol** | [GitHub](https://github.com/glittercowboy/get-shit-done) / [@official_taches](https://x.com/official_taches) |
