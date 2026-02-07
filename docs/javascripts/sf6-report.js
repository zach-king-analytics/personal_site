// docs/javascripts/sf6-report.js
(() => {
  const INIT_FLAG = "sf6ReportInit";

  // Debounce helper for resize events
  function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

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

  const MR_RESET_ISO = new Date(Date.UTC(2026, 1, 1)).toISOString();

  function buildMrResetMarkers(xRange) {
    if (!xRange || xRange.length < 2) return { shapes: [], annotations: [] };
    const startMs = new Date(xRange[0]).getTime();
    const endMs = new Date(xRange[1]).getTime();
    const resetMs = new Date(MR_RESET_ISO).getTime();

    if (!Number.isFinite(resetMs) || resetMs < startMs || resetMs > endMs) {
      return { shapes: [], annotations: [] };
    }

    return {
      shapes: [
        {
          type: "line",
          xref: "x",
          yref: "paper",
          x0: MR_RESET_ISO,
          x1: MR_RESET_ISO,
          y0: 0,
          y1: 1,
          line: { color: "rgba(248,113,113,0.7)", width: 1, dash: "dot" },
        },
      ],
      annotations: [
        {
          xref: "x",
          yref: "paper",
          x: MR_RESET_ISO,
          y: 0.98,
          yanchor: "top",
          xanchor: "left",
          xshift: 6,
          text: "MR reset",
          showarrow: false,
          font: { size: 9, color: "#f87171" },
          bgcolor: "rgba(5,8,22,0.6)",
          bordercolor: "rgba(248,113,113,0.4)",
          borderwidth: 1,
          borderpad: 2,
        },
      ],
    };
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
      return;
    }
    button.dataset[INIT_FLAG] = "1";

    // Activity
    const activityChartDiv = document.getElementById("sf6-activity-chart");
    const activityText = document.getElementById("sf6-activity-text");

    // MR trend
    const mrTrendDiv = document.getElementById("sf6-mr-trend-chart");
    const mrTrendText = document.getElementById("sf6-mr-trend-text");
    const mrWeeklyDiv = document.getElementById("sf6-mr-weekly-chart");
    const mrWeeklyText = document.getElementById("sf6-mr-weekly-text");

    // Character banner
    const charBannerContent = document.getElementById("sf6-character-banner-content");

    // Insight text
    const fixOneText = document.getElementById("sf6-fix-one-matchup-text");

    // Ranked bullets
    const rankedBullets = document.getElementById("sf6-ranked-bullets");

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

    function clearRankedBullets() {
      if (!rankedBullets) return;
      rankedBullets.innerHTML = "";
      rankedBullets.style.display = "none";
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

    function clearMrTrend() {
      if (mrTrendText) {
        mrTrendText.textContent = "Load a report to see your ranked MR trend.";
        mrTrendText.style.display = "block";
      }
      safePurge(mrTrendDiv);

      if (mrWeeklyText) {
        mrWeeklyText.textContent = "Weekly MR delta will appear here.";
        mrWeeklyText.style.display = "block";
      }
      safePurge(mrWeeklyDiv);
    }

    function clearAll() {
      clearCharacterBanner();
      clearFixOne();
      clearRankedBullets();
      clearMatchupCards();
      clearActivity();
      clearMrTrend();
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
      if (!activityChartDiv && !activityText) return null;

      const MAX_WEEKS = 12;

      const weeksFromPy =
        summaryLike && Array.isArray(summaryLike.activity_by_week) && summaryLike.activity_by_week.length > 0
          ? summaryLike.activity_by_week
          : null;

      const sourceLabel =
        summaryLike && summaryLike._label === "all_modes" ? " across all modes" : " (ranked only)";

      // Path A: activity_by_week
      if (weeksFromPy && Array.isArray(weeksFromPy) && weeksFromPy.length > 0) {
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
          return null;
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
            activityText.style.display = 'block';
          }
          safePurge(activityChartDiv);
          return null;
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

        // Generate summary text to return (will be used in bullets)
        const summaryText =
          `Over the last ${numCols} active week${numCols === 1 ? "" : "s"}${sourceLabel}: ` +
          `~${daysPerWeek.toFixed(1)} days/week active, typically ~${Math.round(typical)} matches when active ` +
          `(best streak: ${bestStreak} day${bestStreak === 1 ? "" : "s"}).`;

        // Hide the text div below the chart only when we have valid summary (we'll show this in bullets instead)
        if (activityText) {
          activityText.style.display = 'none';
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

        // Re-query the div to ensure it exists (Material theme navigation can cause stale references)
        const chartDiv = document.getElementById("sf6-activity-chart");
        safePurge(chartDiv);
        if (typeof Plotly !== "undefined" && chartDiv) {
          // Ensure the div has dimensions before creating the plot
          const rect = chartDiv.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            // Div not yet visible, wait briefly
            setTimeout(() => {
              const retryRect = chartDiv.getBoundingClientRect();
              if (retryRect.width > 0) {
                layout.width = retryRect.width;
              }
              Plotly.newPlot(chartDiv, [heat], layout, config)
                .then(() => {
                  if (activityText) {
                    activityText.textContent = "";
                    activityText.style.display = "none";
                  }
                })
                .catch(err => {
                  console.error("Failed to create activity heatmap (retry):", err);
                });
            }, 150);
          } else {
            // Set explicit width from container
            layout.width = rect.width;
            Plotly.newPlot(chartDiv, [heat], layout, config)
              .then(() => {
                if (activityText) {
                  activityText.textContent = "";
                  activityText.style.display = "none";
                }
              })
              .catch(err => {
                console.error("Failed to create activity heatmap:", err);
              });
          }
        }
        return summaryText;
      }

      // Path B: legacy daily (keep page alive)
      const rows = (summaryLike && summaryLike.activity_by_day) || [];
      if (!Array.isArray(rows) || rows.length < 3) {
        if (activityText) {
          activityText.textContent =
            "Not enough activity data yet. Generate a fresh report to enable the weekly heatmap.";
          activityText.style.display = 'block';
        }
        safePurge(activityChartDiv);
        return null;
      }

      if (activityText) {
        activityText.textContent =
          "This report is using legacy daily aggregation. Rebuild reports to enable weekly (active-only) heatmap.";
        activityText.style.display = 'block';
      }
      safePurge(activityChartDiv);
      return null;
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

    // Generate data-driven bullets for overview section
    function generateOverviewBullets(modeBreakdown, charBreakdown, activityByWeek, activitySummary) {
      const bulletsContainer = document.getElementById('sf6-play-bullets');
      if (!bulletsContainer) return;

      const bullets = [];

      // Bullet 1: Mode focus
      if (Array.isArray(modeBreakdown) && modeBreakdown.length > 0) {
        const sorted = modeBreakdown.slice().sort((a, b) => (b.matches || 0) - (a.matches || 0));
        const topMode = sorted[0];
        if (topMode) {
          const modeName = (topMode.mode || '').toLowerCase() === 'rank' ? 'Ranked' : (topMode.mode || 'Mode').charAt(0).toUpperCase() + (topMode.mode || '').slice(1).toLowerCase();
          bullets.push(`<li><strong>${modeName} focus:</strong> ${topMode.share_pct}% of your matches</li>`);
        }
      }

      // Bullet 2: Top character
      if (Array.isArray(charBreakdown) && charBreakdown.length > 0) {
        const sorted = charBreakdown.slice().sort((a, b) => (b.games || 0) - (a.games || 0));
        const topChar = sorted[0];
        if (topChar) {
          bullets.push(`<li><strong>Primary character:</strong> ${topChar.character} (${topChar.share_pct}% of matches)</li>`);
        }
      }

      // Bullet 3: Character pool size
      if (Array.isArray(charBreakdown)) {
        const charCount = charBreakdown.length;
        const breadthDesc = charCount <= 2 ? 'narrow focus' : charCount <= 4 ? 'moderate variety' : charCount <= 6 ? 'broad pool' : 'extensive roster';
        bullets.push(`<li><strong>Character pool:</strong> ${charCount} character${charCount === 1 ? '' : 's'} (${breadthDesc})</li>`);
      }

      // Bullet 4: Activity summary from heatmap data
      if (activitySummary) {
        bullets.push(`<li><strong>Practice volume:</strong> ${activitySummary}</li>`);
      }

      bulletsContainer.innerHTML = bullets.join('');
      bulletsContainer.style.display = bullets.length > 0 ? 'block' : 'none';
    }

    // Generate bullets for ranked play section
    function generateRankedBullets(rankedSummary) {
      if (!rankedBullets) return;

      const bullets = [];
      const fix = rankedSummary && rankedSummary.fix_one_matchup;

      // Up to three top characters with usage and win rate
      const charBreakdown = Array.isArray(rankedSummary && rankedSummary.character_breakdown)
        ? rankedSummary.character_breakdown.slice()
        : [];
      if (charBreakdown.length) {
        const totalGames = charBreakdown.reduce((sum, c) => sum + (Number.isFinite(c.games) ? c.games : 0), 0);
        const topChars = charBreakdown
          .filter((c) => c && c.character)
          .sort((a, b) => (b.games || 0) - (a.games || 0))
          .slice(0, 3)
          .map((c) => {
            const name = c.character || "?";
            const share = Number.isFinite(c.share_pct)
              ? `${c.share_pct.toFixed(0)}%`
              : totalGames > 0 && Number.isFinite(c.games)
              ? `${Math.round((c.games / totalGames) * 100)}%`
              : null;
            const games = Number.isFinite(c.games) ? `${c.games} games` : null;
            const wr = Number.isFinite(c.winrate_pct) ? `${c.winrate_pct.toFixed(1)}% WR` : null;
            const pieces = [share, games, wr].filter(Boolean).join(", ");
            return pieces ? `${name} (${pieces})` : name;
          });

        if (topChars.length) {
          bullets.push(
            `<li><strong>Character mix (top ${topChars.length}):</strong> ${topChars.join(" · ")}</li>`
          );
        }
      }

      if (fix && fix.opponent) {
        const games = Number.isFinite(fix.games) ? `${fix.games} ranked game${fix.games === 1 ? '' : 's'}` : "recent ranked sets";
        const current = Number.isFinite(fix.current_winrate_pct) ? formatPct(fix.current_winrate_pct, 1) : "current win rate unknown";
        const newOverall = Number.isFinite(fix.new_overall_winrate_pct) ? formatPct(fix.new_overall_winrate_pct, 1) : "overall lift pending";
        const lift = Number.isFinite(fix.lift_pct_points) ? ` (+${fix.lift_pct_points.toFixed(1)} pts overall)` : "";
        const oppMr = Number.isFinite(fix.avg_opponent_mr) ? ` · avg opp MR ${formatMr(fix.avg_opponent_mr)}` : "";

        bullets.push(
          `<li><strong>Ranked priority:</strong> ${fix.opponent} is the fastest lever — ${current} over ${games}${oppMr}; hitting 50% would put you near ${newOverall}${lift}.</li>`
        );
      }

      rankedBullets.innerHTML = bullets.join('');
      rankedBullets.style.display = bullets.length > 0 ? 'block' : 'none';
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
      
      // Create traces for a vertical stacked bar (single category "Modes")
      const traces = sorted.map((m) => {
        const mode = (m.mode || "unknown").toUpperCase();
        let color = "#888";
        const lower = (m.mode || "").toLowerCase();
        if (lower === "rank") color = "#2c8c89";
        if (lower === "hub") color = "#5a9bd4";

        return {
          name: mode,
          x: ["Modes"],
          y: [m.matches || 0],
          type: "bar",
          marker: { color },
          text: [`${m.share_pct}%`],
          textposition: "inside",
          constraintext: "both",
          textfont: { color: "#f5f5f5", size: 11 },
          hovertemplate: `${mode}: ${m.matches} matches (${m.share_pct}%)<extra></extra>`,
          customdata: [m.share_pct],
          showlegend: true,
        };
      });

      // Calculate total for y-axis range
      const totalMatches = sorted.reduce((sum, m) => sum + (m.matches || 0), 0);

      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;

      const layout = {
        barmode: "stack",
        margin: isMobile ? { l: 24, r: 16, t: 45, b: 75 } : isTablet ? { l: 30, r: 20, t: 50, b: 75 } : { l: 50, r: 40, t: 50, b: 50 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e0e0e0", size: isMobile ? 8 : isTablet ? 9 : 11 },
        xaxis: {
          showgrid: false,
          zeroline: false,
          tickfont: { size: isMobile ? 8 : isTablet ? 9 : 11 },
        },
        yaxis: {
          gridcolor: "rgba(255,255,255,0.08)",
          zeroline: false,
          tickfont: { size: isMobile ? 8 : isTablet ? 9 : 11 },
          range: [0, totalMatches * 1.08],
        },
        bargap: 0.78,
        height: isMobile ? 200 : isTablet ? 220 : 240,
        legend: {
          orientation: isMobile ? "v" : "h",
          y: isMobile ? 1.0 : -0.3,
          x: isMobile ? 1.02 : 0,
          xanchor: isMobile ? "left" : "left",
          yanchor: isMobile ? "top" : "top",
          bgcolor: "transparent",
          bordercolor: "transparent",
          font: { size: isMobile ? 8 : isTablet ? 9 : 10 },
        },
      };

      // Adjust layout for mobile screens
      if (window.innerWidth < 768) {
        layout.margin = { l: 28, r: 20, t: 50, b: 80 };
        layout.font = { color: "#e0e0e0", size: 9 };
        layout.xaxis.tickfont.size = 9;
        layout.yaxis.tickfont.size = 9;
        layout.bargap = 0.8;
        layout.height = 220;
        layout.legend.y = -0.55;
        layout.legend.font.size = 9;
      }

      if (window.innerWidth < 480) {
        layout.margin = { l: 24, r: 16, t: 45, b: 90 };
        layout.font = { color: "#e0e0e0", size: 8 };
        layout.xaxis.tickfont.size = 8;
        layout.yaxis.tickfont.size = 8;
        layout.height = 200;
        layout.legend.y = -0.65;
        layout.legend.font.size = 8;
      }

      const config = { displayModeBar: false, responsive: true };
      Plotly.newPlot(chartDiv, traces, layout, config);
      
      // Debounced relayout on resize to avoid thrashing
      const debouncedResize = debounce(() => {
        const rect = chartDiv.getBoundingClientRect();
        if (rect.width > 0) {
          Plotly.relayout(chartDiv, { "yaxis.autorange": true });
        }
      }, 250);
      
      setTimeout(debouncedResize, 100);
      window.addEventListener('resize', debouncedResize);

      // Hide insight text to give more vertical room inside the card
      textDiv.textContent = "";
      textDiv.style.display = "none";
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
        text: sorted.map(c => `${c.games} (${(c.share_pct || 0).toFixed(1)}%)`),
        textposition: "auto",
        constraintext: "both",
        textfont: { color: "#e0e0e0", size: 11 },
        hovertemplate: "%{text}<extra></extra>",
        showlegend: false,
      }];

      const layout = {
        margin: { l: 110, r: 90, t: 20, b: 30 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e0e0e0", size: 12 },
        xaxis: {
          gridcolor: "rgba(255,255,255,0.05)",
          showticklabels: true,
          zeroline: false,
          automargin: true,
        },
        yaxis: {
          gridcolor: "transparent",
          showticklabels: true,
          zeroline: false,
          automargin: true,
        },
        height: Math.max(200, sorted.length * 40),
      };

      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;

      if (isMobile) {
        layout.margin = { l: 70, r: 28, t: 12, b: 20 };
        layout.font = { color: "#e0e0e0", size: 8 };
        layout.xaxis.tickfont = { size: 7 };
        layout.yaxis.tickfont = { size: 8 };
        layout.height = Math.max(180, sorted.length * 30);
      } else if (isTablet) {
        layout.margin = { l: 85, r: 50, t: 14, b: 24 };
        layout.font = { color: "#e0e0e0", size: 10 };
        layout.xaxis.tickfont = { size: 8 };
        layout.yaxis.tickfont = { size: 9 };
        layout.height = Math.max(200, sorted.length * 36);
      }

      if (window.innerWidth < 480) {
        layout.margin = { l: 65, r: 24, t: 10, b: 18 };
        layout.font = { color: "#e0e0e0", size: 7 };
        layout.xaxis.tickfont = { size: 6 };
        layout.yaxis.tickfont = { size: 7 };
        layout.height = Math.max(160, sorted.length * 28);
      }

      const config = { displayModeBar: false, responsive: true };
      Plotly.newPlot(chartDiv, traces, layout, config);

      // Debounced relayout on resize to avoid thrashing
      const debouncedResize = debounce(() => {
        const rect = chartDiv.getBoundingClientRect();
        if (rect.width > 0) {
          Plotly.relayout(chartDiv, { "automargin": true });
        }
      }, 250);
      setTimeout(debouncedResize, 100);
      window.addEventListener("resize", debouncedResize);
    }

    // Character tabs & per-character MR rendering
    const charTabs = document.getElementById("sf6-char-tabs");

    function renderCharacterTabs(rankedSummary) {
      if (!charTabs) return;
      
      const charBreakdown = Array.isArray(rankedSummary && rankedSummary.character_breakdown)
        ? rankedSummary.character_breakdown.slice()
        : [];
      
      if (!charBreakdown.length) return;
      
      const topChars = charBreakdown
        .filter((c) => c && c.character)
        .sort((a, b) => (b.games || 0) - (a.games || 0))
        .slice(0, 3)
        .map((c) => c.character);
      
      // Clear existing tabs
      const existingTabs = charTabs.querySelectorAll('[data-char]');
      existingTabs.forEach((tab) => tab.remove());
      
      // Add tabs for top 3 characters
      topChars.forEach((char) => {
        const btn = document.createElement("button");
        btn.className = "sf6-char-tab";
        btn.setAttribute("data-char", char);
        btn.textContent = char;
        btn.style.cssText = "padding: 0.5rem 1rem; background: #1e3a3a; border: none; color: #e5e7eb; cursor: pointer; font-size: 0.9rem;";
        btn.addEventListener("click", () => switchCharacterTab(char, rankedSummary));
        charTabs.appendChild(btn);
      });
      
      // Set first tab as active
      if (topChars.length > 0) {
        const firstTab = document.querySelector(`[data-char="${topChars[0]}"]`);
        if (firstTab) {
          firstTab.classList.add("sf6-char-tab-active");
          firstTab.style.background = "#2c8c89";
          switchCharacterTab(topChars[0], rankedSummary);
        }
      }
    }

    function switchCharacterTab(character, rankedSummary) {
      // Update active tab styling
      document.querySelectorAll(".sf6-char-tab").forEach((tab) => {
        tab.classList.remove("sf6-char-tab-active");
        tab.style.background = "#1e3a3a";
      });
      const tab = document.querySelector(`[data-char="${character}"]`);
      if (tab) {
        tab.classList.add("sf6-char-tab-active");
        tab.style.background = "#2c8c89";
      }
      
      // Render the character-specific MR trend and bars
      renderMrTrendForCharacter(character, rankedSummary);
      renderMrWeeklyForCharacter(character, rankedSummary);
    }

    function renderMrTrendForCharacter(character, rankedSummary) {
      if (!mrTrendDiv || !mrTrendText) return;
      
      const charMrData = rankedSummary && rankedSummary.character_mr_timeseries 
        ? rankedSummary.character_mr_timeseries[character]
        : null;
      
      if (!charMrData || !Array.isArray(charMrData) || !charMrData.length) {
        // Try matching by normalized name (case-insensitive)
        const charMrDataObj = rankedSummary && rankedSummary.character_mr_timeseries ? rankedSummary.character_mr_timeseries : {};
        const matchedKey = Object.keys(charMrDataObj).find(key => key.toLowerCase() === character.toLowerCase());
        const data = matchedKey ? charMrDataObj[matchedKey] : null;
        
        if (!data || !Array.isArray(data) || !data.length) {
          mrTrendText.textContent = `No MR data for ${character}.`;
          mrTrendText.style.display = "block";
          safePurge(mrTrendDiv);
          safePurge(mrWeeklyDiv);
          return;
        }
      }
      
      const cleaned = (charMrData || data)
        .filter((p) => p && Number.isFinite(p.mr) && p.ts)
        .map((p) => ({ ts: p.ts, mr: p.mr, win: Number(p.win) === 1, opponent: p.opponent || null }))
        .sort((a, b) => new Date(a.ts) - new Date(b.ts));
      
      if (!cleaned.length) {
        mrTrendText.textContent = `No ranked MR data for ${character}.`;
        mrTrendText.style.display = "block";
        safePurge(mrTrendDiv);
        safePurge(mrWeeklyDiv);
        return;
      }
      
      mrTrendText.style.display = "none";
      
      const xs = cleaned.map((p) => p.ts);
      const ys = cleaned.map((p) => p.mr);

      // Calculate week-ending points (Sunday) - UTC-consistent
      const toUtcIso = (dayStr) => {
        const [y, m, d] = dayStr.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d)).toISOString();
      };

      const weekEndFromTs = (ts) => {
        const dt = new Date(ts);
        const utcStr = dt.toISOString().split("T")[0]; // YYYY-MM-DD in UTC
        const [y, m, d] = utcStr.split("-").map(Number);
        const utcDate = new Date(Date.UTC(y, m - 1, d));
        const day = utcDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const daysToSunday = (7 - day) % 7;
        const sunday = new Date(utcDate.getTime() + daysToSunday * 24 * 60 * 60 * 1000);
        const sunStr = sunday.toISOString().split("T")[0];
        return toUtcIso(sunStr);
      };

      const weeklyPoints = new Map();
      for (let i = 0; i < cleaned.length; i++) {
        const week = weekEndFromTs(cleaned[i].ts);
        weeklyPoints.set(week, { ts: cleaned[i].ts, mr: cleaned[i].mr, index: i });
      }

      // Generate all week-end dates in the range with carry-forward MR values
      const generateWeekMarkers = () => {
        if (cleaned.length === 0) return { dates: [], mrs: [], labels: [] };
        
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const firstWeek = weekEndFromTs(cleaned[0].ts);
        const lastWeek = weekEndFromTs(cleaned[cleaned.length - 1].ts);
        
        const firstWeekMs = new Date(firstWeek).getTime();
        const lastWeekMs = new Date(lastWeek).getTime();
        
        const weekDates = [];
        const weekMRs = [];
        const labels = [];
        
        // Generate all week-end dates
        for (let weekMs = firstWeekMs; weekMs <= lastWeekMs; weekMs += 7 * 24 * 60 * 60 * 1000) {
          const weekDate = new Date(weekMs).toISOString();
          weekDates.push(weekDate);
          
          // Find most recent MR value AT OR BEFORE this week-end
          let mostRecentMR = null;
          let hasDataThisWeek = false;
          
          for (const point of cleaned) {
            const pointTime = new Date(point.ts).getTime();
            if (pointTime <= weekMs) {
              mostRecentMR = point.mr;
              if (weeklyPoints.has(weekDate)) {
                hasDataThisWeek = true;
              }
            } else {
              break;
            }
          }
          
          if (mostRecentMR !== null) {
            weekMRs.push(mostRecentMR);
            labels.push(hasDataThisWeek ? mostRecentMR.toFixed(0) : "");
          }
        }
        
        return { dates: weekDates, mrs: weekMRs, labels };
      };

      const weekMarkers = generateWeekMarkers();

      const traces = [
        {
          name: `${character} MR`,
          x: xs,
          y: ys,
          mode: "lines",
          type: "scatter",
          line: { color: "#2c8c89", width: 2, shape: "spline", smoothing: 0.6 },
          hovertemplate: "<b>%{y:.0f}</b><br>%{x}<extra></extra>",
        },
        {
          name: "Week End",
          x: weekMarkers.dates,
          y: weekMarkers.mrs,
          mode: "markers+text",
          type: "scatter",
          marker: { color: "#f87171", size: 8, symbol: "circle" },
          text: weekMarkers.labels,
          textposition: "top right",
          textfont: { color: "#f87171", size: 10, weight: "bold" },
          hovertemplate: "<b>Week End: %{y:.0f} MR</b><br>%{x}<extra></extra>",
        },
      ];

      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const firstSundayIso = weekMarkers.dates.length > 0 ? weekMarkers.dates[0] : null;
      const lastSundayIso = weekMarkers.dates.length > 0 ? weekMarkers.dates[weekMarkers.dates.length - 1] : null;
      const firstSundayMs = firstSundayIso ? new Date(firstSundayIso).getTime() : 0;
      const xRange = firstSundayIso && lastSundayIso ? [firstSundayIso, new Date(new Date(lastSundayIso).getTime() + weekMs).toISOString()] : undefined;
      const mrResetMarkers = buildMrResetMarkers(xRange);
      
      const layout = {
        margin: { l: 30, r: 10, t: 5, b: 30 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e5e7eb", size: 8 },
        xaxis: {
          type: "date",
          tickmode: "linear",
          showgrid: true,
          gridcolor: "rgba(255,255,255,0.05)",
          tickangle: -45,
          tickfont: { size: 7 },
          tick0: firstSundayMs,
          dtick: weekMs,
          tickformat: "%b %d",
          range: xRange,
          showspikes: false,
        },
        yaxis: {
          title: "",
          showgrid: true,
          gridcolor: "rgba(255,255,255,0.08)",
          zeroline: false,
          tickfont: { size: 7 },
          showspikes: false,
        },
        height: 280,
        legend: {
          orientation: "h",
          y: -0.12,
          x: 0.5,
          xanchor: "center",
          font: { size: 7 },
        },
        shapes: mrResetMarkers.shapes,
        annotations: mrResetMarkers.annotations,
      };

      const config = { displayModeBar: false, responsive: true };

      // Ensure container is clear before rendering
      safePurge(mrTrendDiv);
      
      Plotly.newPlot(mrTrendDiv, traces, layout, config)
        .then(() => {
          mrTrendText.style.display = "none";
          // Render bars after trend line
          renderMrWeeklyForCharacter(character, rankedSummary);
        })
        .catch((err) => {
          console.error(`[sf6-report] MR trend for ${character} error`, err);
          mrTrendText.textContent = `Could not render MR trend for ${character}.`;
          mrTrendText.style.display = "block";
        });
    }

    function renderMrWeeklyForCharacter(character, rankedSummary) {
      if (!mrWeeklyDiv) return;

      let charMrData = rankedSummary && rankedSummary.character_mr_timeseries 
        ? rankedSummary.character_mr_timeseries[character]
        : null;
      
      // Try case-insensitive match if exact key not found
      if (!charMrData && rankedSummary && rankedSummary.character_mr_timeseries) {
        const matchedKey = Object.keys(rankedSummary.character_mr_timeseries).find(
          key => key.toLowerCase() === character.toLowerCase()
        );
        charMrData = matchedKey ? rankedSummary.character_mr_timeseries[matchedKey] : null;
      }
      
      if (!charMrData || !Array.isArray(charMrData) || !charMrData.length) {
        safePurge(mrWeeklyDiv);
        return;
      }

      const toUtcIso = (dayStr) => {
        const [y, m, d] = dayStr.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d)).toISOString();
      };

      const weekEndFromTs = (ts) => {
        const dt = new Date(ts);
        const utcStr = dt.toISOString().split("T")[0];
        const [y, m, d] = utcStr.split("-").map(Number);
        const utcDate = new Date(Date.UTC(y, m - 1, d));
        const day = utcDate.getUTCDay();
        const daysToSunday = (7 - day) % 7;
        const sunday = new Date(utcDate.getTime() + daysToSunday * 24 * 60 * 60 * 1000);
        const sunStr = sunday.toISOString().split("T")[0];
        return toUtcIso(sunStr);
      };

      // Group by week and calculate deltas
      const weekMap = new Map();
      for (const entry of charMrData) {
        if (entry.ts && Number.isFinite(entry.mr)) {
          const week = weekEndFromTs(entry.ts);
          if (!weekMap.has(week)) {
            weekMap.set(week, { start: entry.mr, end: entry.mr });
          } else {
            weekMap.get(week).end = entry.mr;
          }
        }
      }

      const weeks = Array.from(weekMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const weekDeltas = [];
      for (let i = 1; i < weeks.length; i++) {
        const prevMr = weeks[i - 1][1].end;
        const currMr = weeks[i][1].end;
        weekDeltas.push({
          week: weeks[i][0],
          delta: currMr - prevMr,
        });
      }

      if (!weekDeltas.length) {
        safePurge(mrWeeklyDiv);
        return;
      }

      const xs = weekDeltas.map(w => w.week);
      const ys = weekDeltas.map(w => w.delta);
      const colors = ys.map(v => v >= 0 ? "#34d399" : "#f87171");

      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const tick0 = xs.length ? new Date(xs[0]).getTime() : undefined;
      const range = xs.length ? [xs[0], new Date(new Date(xs[xs.length - 1]).getTime() + weekMs).toISOString()] : undefined;
      const barWidth = weekMs * 0.8;

      const bars = {
        type: "bar",
        x: xs,
        y: ys,
        width: barWidth,
        marker: { color: colors },
        hovertemplate: "%{x}<br>Δ %{y:.0f} MR<extra></extra>",
      };

      const layout = {
        margin: { l: 30, r: 10, t: 5, b: 30 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e5e7eb", size: 8 },
        height: 240,
        xaxis: {
          type: "date",
          tickmode: "linear",
          tickangle: -45,
          tickfont: { size: 7 },
          showgrid: true,
          gridcolor: "rgba(255,255,255,0.05)",
          tick0: tick0,
          dtick: weekMs,
          tickformat: "%b %d",
          range: range,
          showspikes: false,
        },
        yaxis: {
          title: "",
          zeroline: true,
          zerolinecolor: "rgba(255,255,255,0.1)",
          gridcolor: "rgba(255,255,255,0.06)",
          tickfont: { size: 7 },
          showspikes: false,
        },
        showlegend: false,
      };

      const config = { displayModeBar: false, responsive: true };

      safePurge(mrWeeklyDiv);
      Plotly.newPlot(mrWeeklyDiv, [bars], layout, config)
        .catch((err) => {
          console.error(`[sf6-report] MR weekly for ${character} error`, err);
        });
    }

    // Fix height layout for character weekly chart
    // Change from height: isMobile ? 180 : isTablet ? 200 : 200 to 110/130/130
    // Change margin from 70/68/64 bottom to 50/55/50
    // Done above in renderMrWeeklyForCharacter layout definition

    // Update the aggregate renderMrWeekly function to match heights
    // Read through and verify both charts have consistent sizing

    // ------------------------------------------------------------
    // MR Trend (ranked only, MR-valid)
    // ------------------------------------------------------------
    function renderMrTrend(summary) {
      if (!mrTrendDiv || !mrTrendText) return;

      const series = (summary && Array.isArray(summary.mr_timeseries)) ? summary.mr_timeseries : [];
      const cleaned = series
        .filter((p) => p && Number.isFinite(p.mr) && p.ts)
        .map((p) => ({ ts: p.ts, mr: p.mr, win: Number(p.win) === 1, opponent: p.opponent || null }));

      if (!cleaned.length) {
        mrTrendText.textContent = "No ranked MR history available.";
        mrTrendText.style.display = "block";
        mrTrendDiv.innerHTML = mrTrendText.outerHTML;
        safePurge(mrTrendDiv);
        return;
      }

      // Clear placeholder text when rendering chart
      mrTrendText.style.display = "none";

      const xs = cleaned.map((p) => p.ts);
      const ys = cleaned.map((p) => p.mr);

      // Calculate week-ending points (Sunday) - UTC-consistent
      const toUtcIso = (dayStr) => {
        const [y, m, d] = dayStr.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d)).toISOString();
      };

      const weekEndFromTs = (ts) => {
        const dt = new Date(ts);
        const utcStr = dt.toISOString().split("T")[0]; // YYYY-MM-DD in UTC
        const [y, m, d] = utcStr.split("-").map(Number);
        const utcDate = new Date(Date.UTC(y, m - 1, d));
        const day = utcDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const daysToSunday = (7 - day) % 7;
        const sunday = new Date(utcDate.getTime() + daysToSunday * 24 * 60 * 60 * 1000);
        const sunStr = sunday.toISOString().split("T")[0];
        return toUtcIso(sunStr);
      };

      const weeklyPoints = new Map();
      for (let i = 0; i < cleaned.length; i++) {
        const week = weekEndFromTs(cleaned[i].ts);
        weeklyPoints.set(week, { ts: cleaned[i].ts, mr: cleaned[i].mr, index: i });
      }

      // Generate all week-end dates in the range with carry-forward MR values
      const generateWeekMarkers = () => {
        if (cleaned.length === 0) return { dates: [], mrs: [], labels: [] };
        
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const firstWeek = weekEndFromTs(cleaned[0].ts);
        const lastWeek = weekEndFromTs(cleaned[cleaned.length - 1].ts);
        
        const firstWeekMs = new Date(firstWeek).getTime();
        const lastWeekMs = new Date(lastWeek).getTime();
        
        const weekDates = [];
        const weekMRs = [];
        const labels = [];
        
        // Generate all week-end dates
        for (let weekMs = firstWeekMs; weekMs <= lastWeekMs; weekMs += 7 * 24 * 60 * 60 * 1000) {
          const weekDate = new Date(weekMs).toISOString();
          weekDates.push(weekDate);
          
          // Find most recent MR value AT OR BEFORE this week-end
          let mostRecentMR = null;
          let hasDataThisWeek = false;
          
          for (const point of cleaned) {
            const pointTime = new Date(point.ts).getTime();
            if (pointTime <= weekMs) {
              mostRecentMR = point.mr;
              if (weeklyPoints.has(weekDate)) {
                hasDataThisWeek = true;
              }
            } else {
              break;
            }
          }
          
          if (mostRecentMR !== null) {
            weekMRs.push(mostRecentMR);
            labels.push(hasDataThisWeek ? mostRecentMR.toFixed(0) : "");
          }
        }
        
        return { dates: weekDates, mrs: weekMRs, labels };
      };

      const weekMarkers = generateWeekMarkers();

      const traces = [
        {
          name: "MR (ranked)",
          x: xs,
          y: ys,
          mode: "lines",
          type: "scatter",
          line: { color: "#2c8c89", width: 2, shape: "spline", smoothing: 0.6 },
          hovertemplate: "<b>%{y:.0f}</b><br>%{x}<extra></extra>",
        },
        {
          name: "Week End",
          x: weekMarkers.dates,
          y: weekMarkers.mrs,
          mode: "markers+text",
          type: "scatter",
          marker: { color: "#f87171", size: 8, symbol: "circle" },
          text: weekMarkers.labels,
          textposition: "top right",
          textfont: { color: "#f87171", size: 10, weight: "bold" },
          hovertemplate: "<b>Week End: %{y:.0f} MR</b><br>%{x}<extra></extra>",
        },
      ];

      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const firstSundayIso = weekMarkers.dates.length > 0 ? weekMarkers.dates[0] : null;
      const lastSundayIso = weekMarkers.dates.length > 0 ? weekMarkers.dates[weekMarkers.dates.length - 1] : null;
      const firstSundayMs = firstSundayIso ? new Date(firstSundayIso).getTime() : 0;
      const xRange = firstSundayIso && lastSundayIso ? [firstSundayIso, new Date(new Date(lastSundayIso).getTime() + weekMs).toISOString()] : undefined;
      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;
      const mrResetMarkers = buildMrResetMarkers(xRange);
      
      const layout = {
        margin: { l: 30, r: 10, t: 5, b: 30 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e5e7eb", size: 8 },
        xaxis: {
          type: "date",
          tickmode: "linear",
          showgrid: true,
          gridcolor: "rgba(255,255,255,0.05)",
          tickangle: -45,
          tickfont: { size: 7 },
          tick0: firstSundayMs,
          dtick: weekMs,
          tickformat: "%b %d",
          range: xRange,
          showspikes: false,
        },
        yaxis: {
          title: "",
          showgrid: true,
          gridcolor: "rgba(255,255,255,0.08)",
          zeroline: false,
          tickfont: { size: 7 },
          showspikes: false,
        },
        height: 280,
        legend: {
          orientation: "h",
          y: -0.12,
          x: 0.5,
          xanchor: "center",
          font: { size: 7 },
        },
        shapes: mrResetMarkers.shapes,
        annotations: mrResetMarkers.annotations,
      };

      const config = { displayModeBar: false, responsive: true };

      // Ensure container is clear before rendering
      safePurge(mrTrendDiv);
      
      Plotly.newPlot(mrTrendDiv, traces, layout, config)
        .then(() => {
          mrTrendText.style.display = "none";
        })
        .catch((err) => {
          console.error("[sf6-report] MR trend plot error", err);
          mrTrendText.textContent = "Could not render MR trend.";
          mrTrendText.style.display = "block";
        });
    }

    // ------------------------------------------------------------
    // Weekly MR delta bars
    // ------------------------------------------------------------
    function renderMrWeekly(summary) {
      if (!mrWeeklyDiv || !mrWeeklyText) return;

      const rows = (summary && Array.isArray(summary.mr_weekly_delta)) ? summary.mr_weekly_delta : [];
      let filtered = rows.filter((r) => r && Number.isFinite(r.mr_delta) && r.week_start);

      // Fallback: derive weekly deltas client-side from mr_timeseries if backend field absent
      if (!filtered.length && summary && Array.isArray(summary.mr_timeseries)) {
        const pts = summary.mr_timeseries
          .filter((p) => p && Number.isFinite(p.mr) && p.ts)
          .map((p) => ({ ts: new Date(p.ts), mr: p.mr }))
          .sort((a, b) => a.ts - b.ts);

        const weekKey = (d) => {
          const dt = new Date(d);
          const day = dt.getDay(); // Sun=0..Sat=6
          const diff = (7 - day) % 7; // days until Sunday
          const sunday = new Date(dt.getTime() + diff * 24 * 60 * 60 * 1000);
          sunday.setHours(0, 0, 0, 0);
          return sunday.toISOString().slice(0, 10);
        };

        const bucket = new Map();
        for (const p of pts) {
          const key = weekKey(p.ts);
          if (!bucket.has(key)) bucket.set(key, { start: p.mr, end: p.mr });
          else bucket.get(key).end = p.mr;
        }

        filtered = Array.from(bucket.entries())
          .map(([wk, v]) => ({ week_start: wk, mr_delta: v.end - v.start, mr_start: v.start, mr_end: v.end }))
          .sort((a, b) => (a.week_start > b.week_start ? 1 : -1));
      }

      if (!filtered.length) {
        mrWeeklyText.textContent = "No weekly MR deltas available.";
        mrWeeklyText.style.display = "block";
        safePurge(mrWeeklyDiv);
        return;
      }

      const toUtcIso = (dayStr) => {
        const [y, m, d] = dayStr.split("-").map(Number);
        return new Date(Date.UTC(y, m - 1, d)).toISOString();
      };

      const weekEndFromStart = (startDayStr) => {
        const [y, m, d] = startDayStr.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d));
        const day = dt.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const daysToSunday = (7 - day) % 7;
        const sunday = new Date(dt.getTime() + daysToSunday * 24 * 60 * 60 * 1000);
        const sunStr = sunday.toISOString().split("T")[0];
        return toUtcIso(sunStr);
      };

      const xs = filtered.map((r) => weekEndFromStart(r.week_start));
      const ys = filtered.map((r) => r.mr_delta);
      const colors = ys.map((v) => (v >= 0 ? "#34d399" : "#f87171"));

      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const tick0 = xs.length ? new Date(xs[0]).getTime() : undefined;
      const range = xs.length
        ? [xs[0], new Date(new Date(xs[xs.length - 1]).getTime() + weekMs).toISOString()]
        : undefined;
      const barWidth = weekMs * 0.8;

      const bars = {
        type: "bar",
        x: xs,
        y: ys,
        width: barWidth,
        marker: { color: colors },
        hovertemplate: "%{x}<br>Δ %{y:.0f} MR<extra></extra>",
      };

      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth < 1024;

      const layout = {
        margin: { l: 30, r: 10, t: 5, b: 30 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e5e7eb", size: 8 },
        height: 240,
        xaxis: {
          type: "date",
          tickmode: "linear",
          tickangle: -45,
          tickfont: { size: 7 },
          showgrid: true,
          gridcolor: "rgba(255,255,255,0.05)",
          tick0: tick0,
          dtick: weekMs,
          tickformat: "%b %d",
          range: range,
          showspikes: false,
        },
        yaxis: {
          title: "",
          zeroline: true,
          zerolinecolor: "rgba(255,255,255,0.1)",
          gridcolor: "rgba(255,255,255,0.06)",
          tickfont: { size: 7 },
          showspikes: false,
        },
        showlegend: false,
      };

      const config = { displayModeBar: false, responsive: true };

      // Ensure container is clear before rendering
      safePurge(mrWeeklyDiv);

      Plotly.newPlot(mrWeeklyDiv, [bars], layout, config)
        .then(() => {
          mrWeeklyText.style.display = "none";
        })
        .catch((err) => {
          console.error("[sf6-report] MR weekly plot error", err);
          mrWeeklyText.textContent = "Could not render weekly MR deltas.";
          mrWeeklyText.style.display = "block";
        });
    }

    // Add dynamic CSS to eliminate spacing between charts
    function initChartSpacing() {
      if (typeof document === 'undefined') return;
      const existingStyle = document.getElementById('sf6-chart-spacing');
      if (existingStyle) existingStyle.remove();
      
      const style = document.createElement('style');
      style.id = 'sf6-chart-spacing';
      style.textContent = `
        #sf6-mr-trend-chart,
        #sf6-mr-weekly-chart {
          margin: 0 !important;
          padding: 0 !important;
        }
        #sf6-mr-trend-chart {
          margin-bottom: 0 !important;
        }
        #sf6-mr-weekly-chart {
          margin-top: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Initialize on load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initChartSpacing);
    } else {
      initChartSpacing();
    }

    // ------- -------------------------------------------------------
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
        const activityData = {
          activity_by_week: allWeeks || rankedSummary.activity_by_week || null,
          activity_by_day: rankedSummary.activity_by_day || null,
          _label: allWeeks ? "all_modes" : "ranked",
        };

        // Human-readable labels
        const activityLabel = allWeeks ? "all modes" : "ranked only";

        // Render (hardening: don't let one bad field blank the whole page)
        try {
          // Ensure containers are visible before rendering charts
          setReportVisible(true);
          
          // Give the DOM a moment to lay out before rendering charts
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Ranked-only visuals (MR-filtered in Python)
          renderCharacterBanner(rankedSummary, rootSummary, activityLabel);
          renderModeDistribution(rootSummary);
          renderCharacterDistribution(rankedSummary);
          const activitySummary = renderActivityHeatmap(activityData);
          
          // Generate bullets for overview section
          let modeBreakdown = (rootSummary && rootSummary.mode_breakdown) || [];
          if (!Array.isArray(modeBreakdown) || modeBreakdown.length === 0) {
            modeBreakdown = (rootSummary && rootSummary.overall && rootSummary.overall.mode_breakdown) || [];
          }
          const charBreakdown = (rankedSummary && rankedSummary.character_breakdown) || [];
          generateOverviewBullets(modeBreakdown, charBreakdown, (rootSummary && rootSummary.activity_by_week) || null, activitySummary);
          generateRankedBullets(rankedSummary);
          renderCharacterTabs(rankedSummary);
          // Character-specific MR charts are now rendered by renderCharacterTabs automatically
          
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
    // Auto-load only after initial clear to avoid TDZ issues
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



