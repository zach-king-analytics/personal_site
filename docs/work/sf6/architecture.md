---
hide:
  - navigation
---

# Architecture

A static-first, Python-driven pipeline for competitive analysis.

---

## The Idea

Rather than compute reports on-demand, we generate them offline and ship JSON. This keeps the site **fast**, **cacheable**, and **predictable** — no backend required.

---

## Data Flow

```mermaid
graph LR
  A["🎮 Buckler<br/>Headless Browser"]
  B["🗄️ PostgreSQL<br/>Match History"]
  C["⚙️ Python<br/>Report Generator"]
  D["📦 Static JSON<br/>Reports"]
  E["🎨 Browser<br/>Plotly Charts"]
  
  A -->|Scrape CFN| B
  B -->|SQL queries| C
  C -->|Offline transforms| D
  D -->|On load| E
  
  classDef stage fill:#2c8c89,stroke:#1a5653,stroke-width:2px,color:#fff
  class A,B,C,D,E stage
```

---

## Key Decisions

| What | Why |
|------|-----|
| **Offline reports (not live API)** | Pre-computed JSON is fast, cache-friendly, and immune to backend outages. |
| **Ranked MR filtering** | Analysis is scoped to meaningful ranked matches. No noise from casual or invalid data. |
| **Plotly charts** | Interactive, responsive, and renders beautifully without extra dependencies. |
| **Python + SQL** | Full control over calculations. All math is auditable in source code. |

---

## What's Next?

- **Opponent tagging**: Auto-categorize matchups by regional player / skill tier
- **Trend detection**: Highlight improving and declining characters
- **Export as PDF**: Share reports offline
