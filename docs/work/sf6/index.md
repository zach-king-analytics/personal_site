# Street Fighter 6 Matchup Lab

Outside of my family and my work I try to get some video games in a few times per week after the kids are asleep. Once or twice a month I'll even go to the arcade and play in person.

My latest obsession has been fighting games, and in this case **Street Fighter VI**. I've built a headless webscraper to obtain match history for all my local Street Fighter colleagues and they can come here to get an update on some stats.

I've outlined the architecture and explained it more within, but it comes down to wanting to highlight how data can be valuable in your pursuit to improve at almost anything. Fighting games are extremely competitive, and anything you can work in to build that edge is worth it.

<div class="sf6-cta-row" markdown>
[Open the Matchup Report →](matchup-report.md){ .md-button .md-button--primary }
[Architecture →](architecture.md){ .md-button }
</div>

---

## What you can do here

- Generate a **player-specific report** from offline-computed ranked data
- See **top 5 / bottom 5 matchups** (no scroll tables)
- Get a coaching-style takeaway: **“If you fixed one matchup…”**
- Explore Plotly charts (cumulative matchup curves, baseline at 50%)

> **CFN** = Capcom Fighter Network ID. Tip: After generating a report, you can share it by copying the page URL—it includes `?cfn=` so your friend gets the same results.

---

## Why it’s built this way

**Static, deterministic, lightning-fast** – Reports ship as JSON. No compute on load, always consistent, easy to deploy and cache.

**Python handles the heavy lifting** – All calculations auditable in code. The browser's job is simple: fetch → render → visualize.

**Always fresh** – Reports regenerate periodically from the latest match history; check the timestamp in your report.

---

## Technical architecture (at a glance)

```mermaid
flowchart LR
  A[(PostgreSQL<br/>Normalized match data)] --> B[Python report generator<br/>tools/generate_sf6_reports.py]
  B --> C[Static JSON reports<br/>docs/assets/data/sf6-reports/<cfn>.json]
  C --> D[MkDocs Material site]
  D --> E[Browser renderer<br/>sf6-report.js + Plotly]
```