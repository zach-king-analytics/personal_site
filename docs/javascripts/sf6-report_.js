// docs/javascripts/sf6-report.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("[sf6-report] DOMContentLoaded");

  // Core elements
  const input    = document.getElementById("sf6-cfn-input");
  const button   = document.getElementById("sf6-cfn-submit");
  const copyBtn  = document.getElementById("sf6-copy-link");
  const status   = document.getElementById("sf6-report-status");
  const chartDiv = document.getElementById("sf6-report-chart");

  // Snapshot fields
  const snapMainChar   = document.getElementById("sf6-main-character");
  const snapRange      = document.getElementById("sf6-data-range");
  const snapMatches    = document.getElementById("sf6-matches-analyzed");
  const snapOverallWR  = document.getElementById("sf6-overall-winrate");
  const snapAvgMr      = document.getElementById("sf6-average-mr");
  const snapAvgOppMr   = document.getElementById("sf6-average-opponent-mr");
  const snapMostPlayed = document.getElementById("sf6-most-played-matchup");
  const snapBest       = document.getElementById("sf6-best-matchup");
  const snapWorst      = document.getElementById("sf6-worst-matchup");

  // Character banner
  const charBannerContent = document.getElementById("sf6-character-banner-content");

  // Insight text
  const fixOneText = document.getElementById("sf6-fix-one-matchup-text");

  // Matchup overview card bodies
  const bestBody  = document.getElementById("sf6-matchup-best-body");
  const worstBody = document.getElementById("sf6-matchup-worst-body");

  if (!input || !button || !status || !chartDiv) {
    console.log("[sf6-report] Required core elements not found on this page, skipping.");
    return;
  }

  // Visibility toggle: add/remove a class on <body>
  function setReportVisible(hasReport) {
    const cls = "sf6-has-report";
    if (hasReport) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
  }

  // Start hidden
  setReportVisible(false);

  // -----------------------------
  // Helpers
  // -----------------------------

  function setText(el, value, fallback = "—") {
    if (!el) return;
    if (value === null || value === undefined || value === "") {
      el.textContent = fallback;
    } else {
      el.textContent = value;
    }
  }

  function formatPct(n, decimals = 1) {
    if (typeof n !== "number" || isNaN(n)) return "—";
    return `${n.toFixed(decimals)}%`;
  }

  function formatMr(n) {
    if (typeof n !== "number" || isNaN(n)) return "—";
    return Math.round(n).toString();
  }

  function formatDateRange(start, end) {
    if (!start && !end) return "—";
    if (start && !end) return `${start} → ?`;
    if (!start && end) return `? → ${end}`;
    if (start === end) return start;
    return `${start} → ${end}`;
  }

  // -----------------------------
  // Snapshot
  // -----------------------------

  function renderSnapshot(data) {
    const s = data.summary || {};

    setText(snapMainChar, s.main_character);
    setText(snapRange, formatDateRange(s.dataset_start, s.dataset_end));
    setText(
      snapMatches,
      typeof s.matches_analyzed === "number" ? s.matches_analyzed.toString() : null
    );

    // overall win rate
    let overallLabel = "—";
    if (typeof s.overall_winrate_pct === "number") {
      overallLabel = formatPct(s.overall_winrate_pct, 1);
    } else if (typeof s.overall_winrate === "number") {
      overallLabel = formatPct(s.overall_winrate * 100, 1);
    }
    setText(snapOverallWR, overallLabel);

    // MR
    setText(snapAvgMr, formatMr(s.avg_mr));
    setText(snapAvgOppMr, formatMr(s.avg_opponent_mr));

    // Matchup profile
    if (snapMostPlayed) {
      const mp = s.most_played_matchup || {};
      if (mp.opponent) {
        setText(
          snapMostPlayed,
          `${mp.opponent} · ${mp.games ?? "—"} games · ${formatPct(mp.winrate_pct ?? NaN)}`
        );
      } else {
        setText(snapMostPlayed, "—");
      }
    }

    if (snapBest) {
      const b = s.best_matchup || {};
      if (b.opponent) {
        setText(
          snapBest,
          `${b.opponent} · ${b.games ?? "—"} games · ${formatPct(b.winrate_pct ?? NaN)}`
        );
      } else {
        setText(snapBest, "—");
      }
    }

    if (snapWorst) {
      const w = s.worst_matchup || {};
      if (w.opponent) {
        setText(
          snapWorst,
          `${w.opponent} · ${w.games ?? "—"} games · ${formatPct(w.winrate_pct ?? NaN)}`
        );
      } else {
        setText(snapWorst, "—");
      }
    }
  }

  function clearSnapshot() {
    renderSnapshot({ summary: {} });
  }

  // -----------------------------
  // Character banner
  // -----------------------------

  function renderCharacterBanner(summary) {
    if (!charBannerContent) return;

    const breakdown = (summary && summary.character_breakdown) || [];
    charBannerContent.innerHTML = "";

    if (!Array.isArray(breakdown) || breakdown.length === 0) {
      return;
    }

    const prefix = document.createElement("span");
    prefix.className = "sf6-char-banner-prefix";

    if (breakdown.length === 1) {
      const c = breakdown[0];
      prefix.textContent = `All ranked games in this report are on ${c.character} (${c.games} matches).`;
      charBannerContent.appendChild(prefix);
      return;
    }

    prefix.textContent = "Characters played (ranked matches):";
    charBannerContent.appendChild(prefix);

    breakdown.forEach((c) => {
      const pill = document.createElement("span");
      pill.className = "sf6-char-pill";
      const share =
        typeof c.share_pct === "number" ? ` · ${c.share_pct.toFixed(1)}%` : "";
      pill.textContent = `${c.character} · ${c.games}${share}`;
      charBannerContent.appendChild(pill);
    });
  }

  function clearCharacterBanner() {
    if (charBannerContent) {
      charBannerContent.innerHTML = "";
    }
  }

  // -----------------------------
  // Insight: "If you fixed one matchup…"
  // -----------------------------

  function renderFixOneMatchup(summary) {
    if (!fixOneText) return;

    const f = (summary && summary.fix_one_matchup) || null;
    if (!f || !f.opponent) {
      fixOneText.textContent =
        "Load a report to see which matchup would move your overall win rate the most if you brought it up to 50%.";
      return;
    }

    const opp        = f.opponent;
    const games      = f.games;
    const current    = typeof f.current_winrate_pct === "number" ? f.current_winrate_pct : NaN;
    const simulated  = typeof f.simulated_winrate_pct === "number" ? f.simulated_winrate_pct : 50.0;
    const overall    = typeof f.overall_winrate_pct === "number" ? f.overall_winrate_pct : NaN;
    const newOverall =
      typeof f.new_overall_winrate_pct === "number" ? f.new_overall_winrate_pct : NaN;

    const gamesBit =
      Number.isFinite(games) && games > 0 ? ` (${games} ranked games so far)` : "";

    fixOneText.textContent =
      `Right now your best place to level up is the ${opp} matchup${gamesBit}. ` +
      `You're winning about ${formatPct(current)} there. ` +
      `If you could bring that up to a solid ${formatPct(simulated)}, ` +
      `your overall win rate would move from around ${formatPct(overall)} ` +
      `to about ${formatPct(newOverall)}. That’s one of the quickest ways to shift your results.`;
  }

  function clearFixOneMatchup() {
    if (!fixOneText) return;
    fixOneText.textContent =
      "Load a report to see which matchup would move your overall win rate the most if you brought it up to 50%.";
  }

  // -----------------------------
  // Matchup overview cards (top / bottom 5)
  // -----------------------------

  function clearMatchupCards() {
    if (bestBody) bestBody.innerHTML = "";
    if (worstBody) worstBody.innerHTML = "";
  }

  function appendMatchupRow(tbody, row) {
    if (!tbody) return;
    const tr = document.createElement("tr");

    const tdOpp   = document.createElement("td");
    const tdGames = document.createElement("td");
    const tdWr    = document.createElement("td");
    const tdMr    = document.createElement("td");

    tdOpp.textContent   = row.opponent ?? "—";
    tdGames.textContent = row.games != null ? row.games : "—";
    tdWr.textContent    = formatPct(row.winrate_pct ?? NaN);
    tdMr.textContent    = formatMr(row.avg_opponent_mr);

    tr.appendChild(tdOpp);
    tr.appendChild(tdGames);
    tr.appendChild(tdWr);
    tr.appendChild(tdMr);

    tbody.appendChild(tr);
  }

  function renderMatchupCards(summary) {
    if (!bestBody && !worstBody) {
      return;
    }

    clearMatchupCards();

    const rows = (summary && summary.matchup_table) || [];
    const minStable =
      summary && typeof summary.min_games_for_stable === "number"
        ? summary.min_games_for_stable
        : 10;

    const stable = rows.filter((r) => {
      const g = typeof r.games === "number" ? r.games : 0;
      return g >= minStable;
    });

    if (!stable.length) {
      if (bestBody) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.textContent = "No stable matchups yet at this games-played threshold.";
        tr.appendChild(td);
        bestBody.appendChild(tr);
      }
      if (worstBody) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.textContent = "No stable matchups yet at this games-played threshold.";
        tr.appendChild(td);
        worstBody.appendChild(tr);
      }
      return;
    }

    const sorted = stable.slice().sort((a, b) => {
      const aw = typeof a.winrate_pct === "number" ? a.winrate_pct : 0;
      const bw = typeof b.winrate_pct === "number" ? b.winrate_pct : 0;
      return bw - aw; // descending
    });

    const topBest = sorted.slice(0, 5);
    const topWorst = sorted.slice(-5).reverse(); // lowest winrates

    topBest.forEach((row) => appendMatchupRow(bestBody, row));
    topWorst.forEach((row) => appendMatchupRow(worstBody, row));
  }

  // -----------------------------
  // Plotly chart
  // -----------------------------

  function renderChart(data) {
    const matchups = data.matchups || [];
    if (!matchups.length) {
      status.textContent = `No matchup data for "${data.player_cfn}".`;
      Plotly.purge(chartDiv);
      return;
    }

    const traces = matchups.map((m) => ({
      name: m.opponent,
      x: m.games,
      y: (m.cum_winrate || []).map((v) => v * 100),
      mode: "lines+markers",
      type: "scatter",
      line: { shape: "spline", width: 2 },
      marker: { size: 4 },
      hovertemplate:
        `${m.opponent}<br>` +
        "Game %{x}<br>" +
        "Winrate %{y:.1f}%<extra></extra>",
    }));

    const layout = {
      paper_bgcolor: "#050816",
      plot_bgcolor: "#050816",
      font: { color: "#E5E7EB" },
      margin: { t: 60, r: 160, b: 60, l: 60 },
      title: {
        text:
          `Matchup performance for ${data.player_cfn}<br>` +
          `<span style="font-size:0.8em;">Baseline ${data.baseline_n} games · cumulative winrate</span>`,
        x: 0,
        xanchor: "left",
      },
      xaxis: {
        title: "Games played vs character",
        zeroline: false,
        gridcolor: "#1F2933",
        tickmode: "auto",
        dtick: 5,
      },
      yaxis: {
        title: "Cumulative win rate (%)",
        range: [0, 100],
        tickformat: ".0f",
        ticksuffix: "%",
        gridcolor: "#1F2933",
      },
      legend: {
        x: 1.02,
        xanchor: "left",
        y: 0.5,
        bgcolor: "#111827",
        bordercolor: "#4B5563",
        borderwidth: 1,
        font: { size: 10 },
      },
      shapes: [
        {
          type: "line",
          xref: "paper",
          x0: 0,
          x1: 1,
          y0: 50,
          y1: 50,
          line: { color: "#6B7280", width: 1, dash: "dash" },
        },
      ],
    };

    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "toggleSpikelines"],
    };

    console.log("[sf6-report] Rendering Plotly chart");
    Plotly.newPlot(chartDiv, traces, layout, config);
  }

  // -----------------------------
  // Clear everything
  // -----------------------------

  function clearAll() {
    clearSnapshot();
    clearCharacterBanner();
    clearFixOneMatchup();
    clearMatchupCards();
    Plotly.purge(chartDiv);
    setReportVisible(false);
  }

  // -----------------------------
  // Load a report
  // -----------------------------

  async function loadReport(fromAuto = false) {
    const raw = (input.value || "").trim();
    if (!raw) {
      status.textContent = "Enter a CFN.";
      clearAll();
      return;
    }

    const cfn = raw.toLowerCase();
    const url = `/assets/data/sf6-reports/${encodeURIComponent(cfn)}.json`;

    console.log("[sf6-report] Fetching", url, fromAuto ? "(auto)" : "");
    status.textContent = "Loading…";

    try {
      const res = await fetch(url);
      if (!res.ok) {
        status.textContent = `No report found for "${raw}".`;
        clearAll();
        return;
      }

      const data = await res.json();
      console.log("[sf6-report] Loaded report", data);

      status.textContent = `Report for ${data.player_cfn}`;

      const summary = data.summary || {};

      // Snapshot + banner + insights + matchup cards
      renderSnapshot(data);
      renderCharacterBanner(summary);
      renderFixOneMatchup(summary);
      renderMatchupCards(summary);

      // Chart
      renderChart(data);

      // Show sections
      setReportVisible(true);

      // Shareable URL
      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set("cfn", (data.player_cfn || "").toLowerCase());
        window.history.replaceState({}, "", currentUrl);
        console.log("[sf6-report] Updated URL for sharing:", currentUrl.toString());
      } catch (err) {
        console.warn("[sf6-report] Could not update URL:", err);
      }
    } catch (err) {
      console.error("[sf6-report] Error", err);
      status.textContent = "Error loading report (check console).";
      clearAll();
    }
  }

  // -----------------------------
  // Events
  // -----------------------------

  button.addEventListener("click", () => loadReport(false));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadReport(false);
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const existingCfn = currentUrl.searchParams.get("cfn");
        if (!existingCfn && input.value.trim()) {
          currentUrl.searchParams.set("cfn", input.value.trim().toLowerCase());
        }
        await navigator.clipboard.writeText(currentUrl.toString());
        copyBtn.textContent = "Link copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy shareable link";
        }, 2000);
      } catch (err) {
        console.error("[sf6-report] Clipboard error", err);
      }
    });
  }

  // Auto-load from ?cfn=
  try {
    const params = new URLSearchParams(window.location.search);
    const paramCfn = params.get("cfn");
    if (paramCfn) {
      console.log("[sf6-report] Found ?cfn= in URL:", paramCfn);
      input.value = paramCfn;
      loadReport(true);
    }
  } catch (err) {
    console.warn("[sf6-report] Failed to parse query params:", err);
  }
});
