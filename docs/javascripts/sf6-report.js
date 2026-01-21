// docs/javascripts/sf6-report.js
(() => {
  const INIT_FLAG = "sf6ReportInit";

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  function buildReportUrl(cfnLower) {
    // Avoid optional chaining for maximum compatibility
    const meta = document.querySelector("meta[name='base']");
    const base = meta ? meta.getAttribute("content") : "/";
    const normalizedBase = base && base.endsWith("/") ? base : `${base || "/"}\/`;
    return `${normalizedBase}assets/data/sf6-reports/${encodeURIComponent(cfnLower)}.json`;
  }

  function safePurge(div) {
    if (!div) return;
    if (typeof Plotly !== "undefined" && Plotly && typeof Plotly.purge === "function") {
      Plotly.purge(div);
    }
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value == null ? "—" : value;
  }

  function formatPct(n, digits = 1) {
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(digits)}%`;
  }

  function formatMr(n) {
    if (!Number.isFinite(n)) return "—";
    return Math.round(n).toString();
  }

  function formatDateRange(startIso, endIso) {
    if (!startIso || !endIso) return "—";
    return `${startIso} \u2192 ${endIso}`;
  }

  function median(arr) {
    const xs = (arr || []).filter((x) => Number.isFinite(x)).slice().sort((a, b) => a - b);
    if (!xs.length) return null;
    const mid = Math.floor(xs.length / 2);
    return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  }

  function setReportVisible(hasReport) {
    const cls = "sf6-has-report";
    if (hasReport) document.body.classList.add(cls);
    else document.body.classList.remove(cls);

    // Show/hide report sections based on whether report is loaded
    const reportSections = document.getElementById("sf6-report-sections");
    if (reportSections) {
      if (hasReport) {
        reportSections.classList.add("sf6-visible");
      } else {
        reportSections.classList.remove("sf6-visible");
      }
    }
  }

  function maybeAutoLoadFromQuery(inputEl, loaderFn) {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramCfn = params.get("cfn");
      if (paramCfn) {
        inputEl.value = paramCfn;
        // Show sections immediately on page load if CFN in URL
        const reportSections = document.getElementById("sf6-report-sections");
        if (reportSections) {
          reportSections.classList.add("sf6-visible");
        }
        loaderFn(true);
      }
    } catch (err) {
      console.warn("[sf6-report] Failed to parse query params:", err);
    }
  }

  function initSf6Report() {
    console.log("[sf6-report] initSf6Report entered");

    const input = document.getElementById("sf6-cfn-input");
    const button = document.getElementById("sf6-cfn-submit");
    const copyBtn = document.getElementById("sf6-copy-link");

    // Optional:
    const status = document.getElementById("sf6-report-status");
    const chartDiv = document.getElementById("sf6-report-chart");

    // Only these are required for basic functionality
    if (!input || !button) return;

    const setStatus = (msg) => {
      if (status) status.textContent = msg;
      else console.log(`[sf6-report] status: ${msg}`);
    };

    // Prevent double-init across Material nav renders
    if (button.dataset[INIT_FLAG] === "1") {
      maybeAutoLoadFromQuery(input, loadReport);
      return;
    }
    button.dataset[INIT_FLAG] = "1";

    // Activity
    const activityChartDiv = document.getElementById("sf6-activity-chart");
    const activityText = document.getElementById("sf6-activity-text");

    // Snapshot fields
    const snapMainChar = document.getElementById("sf6-main-character");
    const snapRange = document.getElementById("sf6-data-range");
    const snapMatches = document.getElementById("sf6-matches-analyzed");
    const snapOverallWR = document.getElementById("sf6-overall-winrate");
    const snapAvgMr = document.getElementById("sf6-average-mr");
    const snapAvgOppMr = document.getElementById("sf6-average-opponent-mr");
    const snapMostPlayed = document.getElementById("sf6-most-played-matchup");
    const snapBest = document.getElementById("sf6-best-matchup");
    const snapWorst = document.getElementById("sf6-worst-matchup");

    // Character banner
    const charBannerContent = document.getElementById("sf6-character-banner-content");

    // Insight text
    const fixOneText = document.getElementById("sf6-fix-one-matchup-text");

    // Matchup overview card bodies (summary + full)
    const bestSummaryBody = document.getElementById("sf6-matchup-best-summary");
    const worstSummaryBody = document.getElementById("sf6-matchup-worst-summary");
    const bestFullBody = document.getElementById("sf6-matchup-best-full");
    const worstFullBody = document.getElementById("sf6-matchup-worst-full");

    // Start “resting” state hidden
    setReportVisible(false);

    // ------------------------------------------------------------
    // Clearers
    // ------------------------------------------------------------
    function clearSnapshot() {
      setText(snapMainChar, null);
      setText(snapRange, null);
      setText(snapMatches, null);
      setText(snapOverallWR, null);
      setText(snapAvgMr, null);
      setText(snapAvgOppMr, null);
      setText(snapMostPlayed, null);
      setText(snapBest, null);
      setText(snapWorst, null);
    }

    function clearCharacterBanner() {
      if (!charBannerContent) return;
      charBannerContent.innerHTML = "";
      charBannerContent.classList.add("sf6-muted");
    }

    function clearFixOne() {
      if (!fixOneText) return;
      fixOneText.textContent =
        "Load a report to see which matchup would move your overall win rate the most if you brought it up to 50%.";
      fixOneText.classList.add("sf6-muted");
    }

    function clearMatchupCards() {
      if (bestSummaryBody) bestSummaryBody.innerHTML = "";
      if (worstSummaryBody) worstSummaryBody.innerHTML = "";
      if (bestFullBody) bestFullBody.innerHTML = "";
      if (worstFullBody) worstFullBody.innerHTML = "";
    }

    function clearActivity() {
      if (activityText) {
        activityText.textContent = "Load a report to see your activity pattern.";
      }
      safePurge(activityChartDiv);
    }

    function clearAll() {
      clearSnapshot();
      clearCharacterBanner();
      clearFixOne();
      clearMatchupCards();
      clearActivity();
      safePurge(chartDiv); // OK if chartDiv is null
      
      // Clear report header styling
      const reportTitle = document.getElementById("sf6-report-status");
      if (reportTitle) {
        reportTitle.classList.remove("sf6-report-active");
        reportTitle.textContent = "Street Fighter 6 Matchup Lab";
      }
      const reportHeader = document.querySelector(".sf6-report-header");
      if (reportHeader) {
        reportHeader.classList.remove("sf6-report-loaded");
      }
      
      setReportVisible(false);
    }

    // ------------------------------------------------------------
    // Activity heatmap (weekly grid preferred)
    //   - Uses all-modes week grid when available
    //   - Ranked/MR filtering applies to other visuals (from Python)
    //   - NO MR filtering for this activity viz (you requested that)
    // ------------------------------------------------------------
    function renderActivityHeatmap(summaryLike) {
      if (!activityChartDiv && !activityText) return;

      const MAX_WEEKS = 12;

      const weeksFromPy =
        summaryLike && Array.isArray(summaryLike.activity_by_week) ? summaryLike.activity_by_week : null;

      const sourceLabel =
        summaryLike && summaryLike._label === "all_modes" ? " across all modes" : " (ranked only)";

      // Path A: activity_by_week
      if (weeksFromPy && weeksFromPy.length) {
        const activeWeeks = weeksFromPy.slice(Math.max(0, weeksFromPy.length - MAX_WEEKS));

        // Remove truly empty weeks
        const nonEmpty = activeWeeks.filter((w) => {
          if (!w) return false;
          if (Number.isFinite(w.matches)) return w.matches > 0;
          return true;
        });

        if (!nonEmpty.length) {
          if (activityText) activityText.textContent = "No activity found in the dataset window.";
          safePurge(activityChartDiv);
          return;
        }

        const numCols = nonEmpty.length;
        const yLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const z = Array.from({ length: 7 }, () => Array(numCols).fill(0));
        const hoverText = Array.from({ length: 7 }, () => Array(numCols).fill(""));

        const vals = [];

        for (let c = 0; c < numCols; c++) {
          const w = nonEmpty[c] || {};
          const days = Array.isArray(w.days) ? w.days : [];

          for (let r = 0; r < 7; r++) {
            const day = days[r] || {};
            const iso = day.date || "(unknown date)";
            const m = Number.isFinite(day.matches) ? day.matches : 0;

            z[r][c] = m;
            hoverText[r][c] = `${iso}<br>${m} match(es)`;

            if (m > 0) vals.push(m);
          }
        }

        if (vals.length < 3) {
          if (activityText) {
            activityText.textContent =
              "Not enough day-by-day activity yet. Play a few more days and this will light up.";
          }
          safePurge(activityChartDiv);
          return;
        }

        // Summary line
        const daysPlayed = vals.length;
        const daysPerWeek = numCols > 0 ? daysPlayed / numCols : 0;
        const typical = median(vals) || 0;

        // Best streak across shown window (consecutive active days)
        let streak = 0;
        let bestStreak = 0;
        for (let c = 0; c < numCols; c++) {
          const w = nonEmpty[c] || {};
          const days = Array.isArray(w.days) ? w.days : [];
          for (let r = 0; r < 7; r++) {
            const day = days[r] || {};
            const m = Number.isFinite(day.matches) ? day.matches : 0;
            if (m > 0) {
              streak += 1;
              bestStreak = Math.max(bestStreak, streak);
            } else {
              streak = 0;
            }
          }
        }

        if (activityText) {
          activityText.textContent =
            `Over the last ${numCols} active week${numCols === 1 ? "" : "s"}${sourceLabel}: ` +
            `~${daysPerWeek.toFixed(1)} days/week active, typically ~${Math.round(typical)} matches when active ` +
            `(best streak: ${bestStreak} day${bestStreak === 1 ? "" : "s"}).`;
        }

        // Clamp colors to p90
        const sortedVals = vals.slice().sort((a, b) => a - b);
        const quantile = (xs, q) => {
          if (!xs.length) return 1;
          const pos = (xs.length - 1) * q;
          const base = Math.floor(pos);
          const rest = pos - base;
          return xs[base + 1] !== undefined
            ? xs[base] + rest * (xs[base + 1] - xs[base])
            : xs[base];
        };
        const cap = Math.max(5, Math.round(quantile(sortedVals, 0.9)));
        const zColor = z.map((row) => row.map((v) => Math.min(v, cap)));

        const weekEndLabels = nonEmpty.map((w) => (w && w.week_end ? w.week_end : "(week end?)"));
        const tickvals = Array.from({ length: numCols }, (_, i) => i);
        const ticktext = weekEndLabels;

        const colorscale = [
          [0.0, "#0B1220"],
          [0.18, "#102A5C"],
          [0.38, "#165A8A"],
          [0.58, "#1E8E9B"],
          [0.78, "#7ED3A6"],
          [1.0, "#F7D06B"],
        ];

        const heat = {
          type: "heatmap",
          x: tickvals,
          y: yLabels,
          z: zColor,
          text: hoverText,
          hoverinfo: "text",
          xgap: 3,
          ygap: 3,
          showscale: true,
          zmin: 0,
          zmax: cap,
          colorscale,
          colorbar: {
            thickness: 12,
            len: 0.75,
            y: 0.5,
            yanchor: "middle",
            outlinewidth: 0,
            tickmode: "array",
            tickvals: [0, Math.round(cap / 2), cap],
            ticktext: ["0", `${Math.round(cap / 2)}`, `${cap}+`],
            title: { text: "Matches/day", side: "right", font: { size: 11 } },
          },
        };

        const layout = {
          paper_bgcolor: "#050816",
          plot_bgcolor: "#050816",
          font: { color: "#E5E7EB" },
          margin: { t: 10, r: 70, b: 55, l: 45 },
          xaxis: {
            title: "Week ending",
            showgrid: false,
            zeroline: false,
            ticks: "",
            fixedrange: true,
            tickmode: "array",
            tickvals,
            ticktext,
            tickangle: -30,
            tickfont: { size: 10 },
          },
          yaxis: {
            showgrid: false,
            zeroline: false,
            ticks: "",
            fixedrange: true,
            autorange: "reversed",
            tickfont: { size: 10 },
          },
        };

        const config = {
          responsive: true,
          displaylogo: false,
          displayModeBar: false,
        };

        safePurge(activityChartDiv);
        if (typeof Plotly !== "undefined" && activityChartDiv) {
          Plotly.newPlot(activityChartDiv, [heat], layout, config);
        }
        return;
      }

      // Path B: legacy daily (keep page alive)
      const rows = (summaryLike && summaryLike.activity_by_day) || [];
      if (!Array.isArray(rows) || rows.length < 3) {
        if (activityText) {
          activityText.textContent =
            "Not enough activity data yet. Generate a fresh report to enable the weekly heatmap.";
        }
        safePurge(activityChartDiv);
        return;
      }

      if (activityText) {
        activityText.textContent =
          "This report is using legacy daily aggregation. Rebuild reports to enable weekly (active-only) heatmap.";
      }
      safePurge(activityChartDiv);
    }

    // ------------------------------------------------------------
    // Snapshot (ranked/MR-filtered summary expected)
    // ------------------------------------------------------------
    function renderSnapshot(summary) {
      const s = summary || {};

      setText(snapMainChar, s.main_character);
      setText(snapRange, formatDateRange(s.dataset_start, s.dataset_end));
      setText(
        snapMatches,
        typeof s.matches_analyzed === "number" ? s.matches_analyzed.toString() : null
      );

      let overallLabel = "—";
      if (typeof s.overall_winrate_pct === "number") overallLabel = formatPct(s.overall_winrate_pct, 1);
      else if (typeof s.overall_winrate === "number") overallLabel = formatPct(s.overall_winrate * 100, 1);
      setText(snapOverallWR, overallLabel);

      setText(snapAvgMr, formatMr(s.avg_mr));
      setText(snapAvgOppMr, formatMr(s.avg_opponent_mr));

      if (snapMostPlayed) {
        const mp = s.most_played_matchup || {};
        if (mp.opponent) {
          setText(
            snapMostPlayed,
            `${mp.opponent} · ${mp.games != null ? mp.games : "—"} games · ${formatPct(mp.winrate_pct)}`
          );
        } else setText(snapMostPlayed, "—");
      }

      if (snapBest) {
        const b = s.best_matchup || {};
        if (b.opponent) {
          setText(snapBest, `${b.opponent} · ${b.games != null ? b.games : "—"} games · ${formatPct(b.winrate_pct)}`);
        } else setText(snapBest, "—");
      }

      if (snapWorst) {
        const w = s.worst_matchup || {};
        if (w.opponent) {
          setText(snapWorst, `${w.opponent} · ${w.games != null ? w.games : "—"} games · ${formatPct(w.winrate_pct)}`);
        } else setText(snapWorst, "—");
      }
    }

    // ------------------------------------------------------------
    // Character banner - admonition-style callout
    function renderCharacterBanner(rankedSummary, overallSummary, activityLabel) {
      if (!charBannerContent) return;

      const ranked = rankedSummary || {};
      const overall = overallSummary || {};
      const overallData = overall.overall || overall;

      charBannerContent.innerHTML = "";
      charBannerContent.classList.remove("sf6-muted");

      // Collect mode breakdown data
      const modeBreakdown = (overallData && overallData.mode_breakdown) || [];
      let rankedCount = 0;
      let nonRankedCount = 0;
      
      if (Array.isArray(modeBreakdown)) {
        modeBreakdown.forEach((m) => {
          const mode = (m.mode || "").toLowerCase();
          const matches = m.matches || 0;
          if (mode === "rank") {
            rankedCount = matches;
          } else {
            nonRankedCount += matches;
          }
        });
      }

      const totalMatches = rankedCount + nonRankedCount;
      const dateStart = ranked.dataset_start || "—";
      const dateEnd = ranked.dataset_end || "—";

      // Helper function for comma formatting
      const formatNumber = (n) => {
        if (typeof n === 'number') return n.toLocaleString('en-US');
        return n;
      };

      // Create admonition-style container
      const admon = document.createElement("div");
      admon.className = "admonition note";
      admon.style.marginBottom = "1.5rem";

      // Title
      const title = document.createElement("p");
      title.className = "admonition-title";
      title.textContent = "Dataset Overview";
      admon.appendChild(title);

      // Combined summary text with strategic bolding
      const summaryText = document.createElement("p");
      summaryText.style.marginBottom = "1.5rem";
      summaryText.style.marginTop = "0";
      summaryText.style.fontSize = "1rem";
      summaryText.style.lineHeight = "1.6";
      
      const activityText = activityLabel ? ` Activity charts include <strong>${activityLabel}</strong>.` : "";
      summaryText.innerHTML = `Dataset covers <strong>${dateStart} to ${dateEnd}</strong>.${activityText}`;
      admon.appendChild(summaryText);

      // Stats row - 3 column layout with Total on left
      const statsRow = document.createElement("div");
      statsRow.style.display = "flex";
      statsRow.style.justifyContent = "center";
      statsRow.style.alignItems = "center";
      statsRow.style.gap = "3rem";
      statsRow.style.marginBottom = "0";
      statsRow.style.marginTop = "0.5rem";

      // Total stat
      const totalDiv = document.createElement("div");
      totalDiv.style.textAlign = "center";
      totalDiv.innerHTML = `
        <div style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 0.5rem; font-weight: 500;">Total Matches</div>
        <div style="font-size: 2rem; font-weight: 700; color: #e0e0e0;">${formatNumber(totalMatches)}</div>
      `;
      statsRow.appendChild(totalDiv);

      // Divider 1
      const divider1 = document.createElement("div");
      divider1.style.width = "1px";
      divider1.style.height = "60px";
      divider1.style.background = "linear-gradient(to bottom, transparent, #4B5563 20%, #4B5563 80%, transparent)";
      statsRow.appendChild(divider1);

      // Ranked stat
      const rankDiv = document.createElement("div");
      rankDiv.style.textAlign = "center";
      rankDiv.innerHTML = `
        <div style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 0.5rem; font-weight: 500;">Ranked (MR)</div>
        <div style="font-size: 2rem; font-weight: 700; color: #2c8c89;">${formatNumber(rankedCount)}</div>
      `;
      statsRow.appendChild(rankDiv);

      // Divider 2
      const divider2 = document.createElement("div");
      divider2.style.width = "1px";
      divider2.style.height = "60px";
      divider2.style.background = "linear-gradient(to bottom, transparent, #4B5563 20%, #4B5563 80%, transparent)";
      statsRow.appendChild(divider2);

      // Non-Ranked stat
      const nonRankDiv = document.createElement("div");
      nonRankDiv.style.textAlign = "center";
      nonRankDiv.innerHTML = `
        <div style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 0.5rem; font-weight: 500;">Non-Ranked</div>
        <div style="font-size: 2rem; font-weight: 700; color: #888;">${formatNumber(nonRankedCount)}</div>
      `;
      statsRow.appendChild(nonRankDiv);

      admon.appendChild(statsRow);

      charBannerContent.appendChild(admon);

      // Create character & scope callout
      const charAdmon = document.createElement("div");
      charAdmon.className = "admonition warning";
      charAdmon.style.marginTop = "1.5rem";

      const charTitle = document.createElement("p");
      charTitle.className = "admonition-title";
      charTitle.textContent = "About This Report";
      charAdmon.appendChild(charTitle);

      const scopeNote = document.createElement("p");
      scopeNote.style.marginBottom = "0";
      scopeNote.style.fontSize = "0.95rem";
      scopeNote.style.lineHeight = "1.6";
      scopeNote.innerHTML = `All statistics below aggregate performance across your entire character pool and dataset. Individual character matchups may vary significantly from these aggregate trends.`;
      charAdmon.appendChild(scopeNote);

      charBannerContent.appendChild(charAdmon);
    }

    // ------------------------------------------------------------
    // Mode Distribution Chart
    // ------------------------------------------------------------
    function renderModeDistribution(summary) {
      const chartDiv = document.getElementById("sf6-mode-distribution-chart");
      const textDiv = document.getElementById("sf6-mode-distribution-text");
      
      if (!chartDiv || !textDiv) return;

      // Handle nested data structure: try direct mode_breakdown first, then dig deeper
      let modeBreakdown = (summary && summary.mode_breakdown) || [];
      if (!Array.isArray(modeBreakdown) || modeBreakdown.length === 0) {
        // Try to get from overall.overall if we have nested structure
        modeBreakdown = (summary && summary.overall && summary.overall.mode_breakdown) || [];
      }
      
      if (!Array.isArray(modeBreakdown) || modeBreakdown.length === 0) {
        safePurge(chartDiv);
        textDiv.classList.add("sf6-muted");
        textDiv.textContent = "Load a report to see mode distribution.";
        return;
      }

      // Sort by matches descending
      const sorted = modeBreakdown.slice().sort((a, b) => (b.matches || 0) - (a.matches || 0));
      
      // Create traces for horizontal stacked bar
      const traces = sorted.map((m) => {
        const mode = (m.mode || "unknown").toUpperCase();
        let color = "#888";
        if ((m.mode || "").toLowerCase() === "rank") color = "#2c8c89";
        if ((m.mode || "").toLowerCase() === "hub") color = "#5a9bd4";
        
        return {
          name: mode,
          x: [m.matches || 0],
          y: [""],
          type: "bar",
          orientation: "h",
          marker: { color },
          text: `${mode}<br>${m.matches} (${m.share_pct}%)`,
          textposition: "inside",
          textfont: { color: "#fff", size: 12 },
          hovertemplate: `${mode}: %{x} matches (%{customdata}%)<extra></extra>`,
          customdata: [m.share_pct],
          showlegend: true,
        };
      });

      const layout = {
        barmode: "stack",
        margin: { l: 0, r: 120, t: 20, b: 20 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e0e0e0", size: 12 },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.05)",
          showticklabels: false,
          zeroline: false,
        },
        yaxis: {
          gridcolor: "transparent",
          showticklabels: false,
          zeroline: false,
        },
        height: 120,
        legend: {
          x: 1.02,
          y: 0.5,
          xanchor: "left",
          yanchor: "middle",
          bgcolor: "transparent",
          bordercolor: "transparent",
        },
      };

      const config = { displayModeBar: false, responsive: true };
      Plotly.newPlot(chartDiv, traces, layout, config);
      
      // Force full-width layout on load and resize
      const forceFullWidth = () => {
        const rect = chartDiv.getBoundingClientRect();
        if (rect.width > 0) {
          Plotly.relayout(chartDiv, { 
            width: rect.width,
            "xaxis.autorange": true
          });
        }
      };
      
      // Initial resize after render
      setTimeout(forceFullWidth, 50);
      
      // Listen for viewport changes
      window.addEventListener('resize', forceFullWidth);

      // Generate insight text
      textDiv.classList.remove("sf6-muted");
      const total = sorted.reduce((sum, m) => sum + (m.matches || 0), 0);
      const rankMode = sorted.find(m => (m.mode || "").toLowerCase() === "rank");
      const rankPct = rankMode ? rankMode.share_pct : 0;
      
      if (rankPct >= 80) {
        textDiv.textContent = `${rankPct}% ranked matches — focused competitive practice.`;
      } else if (rankPct >= 70) {
        textDiv.textContent = `Strong ranked focus with ${rankPct}% ranked matches.`;
      } else if (rankPct >= 50) {
        textDiv.textContent = `Balanced mix with ${rankPct}% ranked matches.`;
      } else if (rankPct >= 40) {
        textDiv.textContent = `Slight ranked lean — ${rankPct}% ranked.`;
      } else {
        textDiv.textContent = `Majority casual/hub play — only ${rankPct}% ranked.`;
      }
    }

    // ------------------------------------------------------------
    // Character Distribution Chart (barchart ≤5 chars, barchart ≥6)
    // ------------------------------------------------------------
    function renderCharacterDistribution(summary) {
      const chartDiv = document.getElementById("sf6-character-distribution-chart");
      if (!chartDiv) return;

      const charBreakdown = (summary && summary.character_breakdown) || [];
      
      if (!Array.isArray(charBreakdown) || charBreakdown.length === 0) {
        safePurge(chartDiv);
        chartDiv.innerHTML = "<p style='text-align: center; color: #9ca3af; padding: 2rem;'>Character data unavailable</p>";
        return;
      }

      // Sort by matches descending
      const sorted = charBreakdown.slice().sort((a, b) => (b.games || 0) - (a.games || 0));
      
      // Create horizontal barchart (works well for all character counts)
      const traces = [{
        name: "Matches",
        x: sorted.map(c => c.games || 0),
        y: sorted.map(c => c.character || "—"),
        type: "bar",
        orientation: "h",
        marker: { 
          color: sorted.map((_, i) => {
            const colors = ["#2c8c89", "#5a9bd4", "#e87c3e", "#9b59b6", "#f39c12", "#e74c3c"];
            return colors[i % colors.length];
          })
        },
        text: sorted.map(c => `${c.character}: ${c.games} (${(c.share_pct || 0).toFixed(1)}%)`),
        textposition: "outside",
        textfont: { color: "#e0e0e0", size: 11 },
        hovertemplate: "%{text}<extra></extra>",
        showlegend: false,
      }];

      const layout = {
        margin: { l: 100, r: 20, t: 10, b: 20 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e0e0e0", size: 12 },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.05)",
          showticklabels: true,
          zeroline: false,
        },
        yaxis: {
          gridcolor: "transparent",
          showticklabels: true,
          zeroline: false,
        },
        height: Math.max(200, sorted.length * 40),
      };

      const config = { displayModeBar: false, responsive: true };
      Plotly.newPlot(chartDiv, traces, layout, config);
    }

    // ------------------------------------------------------------
    // Fix-one insight (ranked/MR-filtered summary expected)
    // ------------------------------------------------------------
    function renderFixOneMatchup(summary) {
      if (!fixOneText) return;

      const f = (summary && summary.fix_one_matchup) || null;
      if (!f || !f.opponent) {
        clearFixOne();
        return;
      }

      fixOneText.classList.remove("sf6-muted");

      const opp = f.opponent;
      const games = f.games;
      const current = typeof f.current_winrate_pct === "number" ? f.current_winrate_pct : NaN;
      const overall = typeof f.overall_winrate_pct === "number" ? f.overall_winrate_pct : NaN;
      const newOverall = typeof f.new_overall_winrate_pct === "number" ? f.new_overall_winrate_pct : NaN;
      const lift = typeof f.lift_pct_points === "number" ? f.lift_pct_points : NaN;

      const gamesBit = Number.isFinite(games) && games > 0 ? ` (${games} ranked games so far)` : "";

      fixOneText.textContent =
        `Biggest fast win right now: ${opp}${gamesBit}. You’re at ${formatPct(current)} there. ` +
        `If you could reach a steady 50%, your overall win rate would go from ${formatPct(overall)} to about ${formatPct(newOverall)} ` +
        `(+${Number.isFinite(lift) ? lift.toFixed(1) : "—"} pts).`;
    }

    // ------------------------------------------------------------
    // Matchup overview cards (ranked/MR-filtered summary expected)
    // ------------------------------------------------------------
    function renderMatchupCards(summary) {
      if (!bestSummaryBody && !worstSummaryBody && !bestFullBody && !worstFullBody) return;

      const rows = (summary && summary.matchup_table) || [];
      if (!Array.isArray(rows) || rows.length === 0) {
        clearMatchupCards();
        return;
      }

      const stable = rows.filter((r) => Number.isFinite(r.games) && r.games >= 10);

      const bestAll = stable
        .slice()
        .sort(
          (a, b) =>
            (b.winrate_pct != null ? b.winrate_pct : -999) - (a.winrate_pct != null ? a.winrate_pct : -999)
        )
        ;

      const worstAll = stable
        .slice()
        .sort(
          (a, b) =>
            (a.winrate_pct != null ? a.winrate_pct : 999) - (b.winrate_pct != null ? b.winrate_pct : 999)
        )
        ;

      const bestTop = bestAll.slice(0, 3);
      const worstTop = worstAll.slice(0, 3);

      function rowHtml(r) {
        const opp = r.opponent != null ? r.opponent : "—";
        const games = Number.isFinite(r.games) ? r.games : "—";
        const wr = Number.isFinite(r.winrate_pct) ? `${r.winrate_pct.toFixed(1)}%` : "—";
        const mr = Number.isFinite(r.avg_opponent_mr) ? Math.round(r.avg_opponent_mr).toString() : "—";
        return `<tr>
          <td>${opp}</td>
          <td>${games}</td>
          <td>${wr}</td>
          <td>${mr}</td>
        </tr>`;
      }

      if (bestSummaryBody) bestSummaryBody.innerHTML = bestTop.map(rowHtml).join("");
      if (worstSummaryBody) worstSummaryBody.innerHTML = worstTop.map(rowHtml).join("");
      if (bestFullBody) bestFullBody.innerHTML = bestAll.map(rowHtml).join("");
      if (worstFullBody) worstFullBody.innerHTML = worstAll.map(rowHtml).join("");
    }

    // ------------------------------------------------------------
    // Main matchup chart (uses data.matchups baseline series)
    // ------------------------------------------------------------
    function renderChart(data) {
      if (!chartDiv) return;

      const matchups = data && data.matchups ? data.matchups : [];
      if (!Array.isArray(matchups) || matchups.length === 0) {
        safePurge(chartDiv);
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
        hovertemplate: `${m.opponent}<br>Game %{x}<br>Winrate %{y:.1f}%<extra></extra>`,
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

      if (typeof Plotly !== "undefined") {
        Plotly.newPlot(chartDiv, traces, layout, config);
      }
    }

    // ------------------------------------------------------------
    // Load a report
    // ------------------------------------------------------------
    async function loadReport(fromAuto = false) {
      const raw = (input.value || "").trim();
      if (!raw) {
        setStatus("Enter a CFN.");
        clearAll();
        return;
      }

      const cfn = raw.toLowerCase();
      const url = buildReportUrl(cfn);

      setStatus("Loading…");

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          setStatus(`No report found for "${raw}".`);
          clearAll();
          return;
        }

        const data = await res.json();
        const reportTitle = document.getElementById("sf6-report-status");
        if (reportTitle) {
          reportTitle.textContent = `Report for ${data.player_cfn}`;
          reportTitle.classList.add("sf6-report-active");
        }
        const reportHeader = document.querySelector(".sf6-report-header");
        if (reportHeader) {
          reportHeader.classList.add("sf6-report-loaded");
        }

        const rootSummary = data.summary || {};

        // Back-compat: old reports had ranked fields at summary root
        const rankedSummary =
          rootSummary && rootSummary.ranked && Object.keys(rootSummary.ranked).length
            ? rootSummary.ranked
            : rootSummary;

        // All-modes weekly activity (preferred for the activity viz)
        let allWeeks = null;
        if (
          rootSummary &&
          rootSummary.activity_by_week_modes &&
          Array.isArray(rootSummary.activity_by_week_modes.all)
        ) {
          allWeeks = rootSummary.activity_by_week_modes.all;
        }

        // Feed the activity renderer a "summary-like" object that has activity_by_week
        const activitySummary = {
          activity_by_week: allWeeks || rankedSummary.activity_by_week || null,
          activity_by_day: rankedSummary.activity_by_day || null,
          _label: allWeeks ? "all_modes" : "ranked",
        };

        // Human-readable labels
        const activityLabel = allWeeks ? "all modes" : "ranked only";

        // Render (hardening: don't let one bad field blank the whole page)
        try {
          // Ranked-only visuals (MR-filtered in Python)
          renderCharacterBanner(rankedSummary, rootSummary, activityLabel);
          // Use overall summary for mode distribution (Overall Play)
          renderModeDistribution(rootSummary);
          // Keep character distribution on ranked summary to preserve current behavior
          renderCharacterDistribution(rankedSummary);
          renderSnapshot(rankedSummary);
          renderFixOneMatchup(rankedSummary);
          renderMatchupCards(rankedSummary);
          renderChart(data);

          // Activity viz: prefer all-modes weeks, else fall back to ranked weeks/day
          renderActivityHeatmap(activitySummary);
        } catch (e) {
          console.error("[sf6-report] render crash:", e);
          setStatus("Render error (check console).");
          clearAll();
          return;
        }

        setReportVisible(true);

        try {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set("cfn", (data.player_cfn || "").toLowerCase());
          window.history.replaceState({}, "", currentUrl);
        } catch (err) {
          console.warn("[sf6-report] Could not update URL:", err);
        }
      } catch (err) {
        console.error("[sf6-report] Error", err);
        setStatus("Error loading report (check console).");
        clearAll();
      }
    }

    // Events
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
          setTimeout(() => (copyBtn.textContent = "Copy shareable link"), 2000);
        } catch (err) {
          console.error("[sf6-report] Clipboard error", err);
        }
      });
    }

    const clearBtn = document.getElementById("sf6-clear-report");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        // Reset input and status
        input.value = "";
        if (status) status.textContent = "Enter a CFN.";

        // Clear visuals and hide report sections
        clearAll();
        setReportVisible(false);

        // Drop ?cfn from URL
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("cfn");
          window.history.replaceState({}, "", url);
        } catch (e) {
          console.warn("[sf6-report] Could not clear URL param", e);
        }

        // Focus back to input
        input.focus();
      });
    }

    clearAll();
    maybeAutoLoadFromQuery(input, loadReport);
  }

  function boot() {
    try {
      initSf6Report();
    } catch (e) {
      console.error("[sf6-report] initSf6Report crashed:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", boot);

  // MkDocs Material navigation hook
  if (typeof document$ !== "undefined" && document$ && typeof document$.subscribe === "function") {
    document$.subscribe(() => boot());
  }
})();

