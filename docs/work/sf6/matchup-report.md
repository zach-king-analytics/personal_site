---
hide:
  - navigation
  - toc
---

<div id="sf6-input-section" class="sf6-input-section">
  <p class="sf6-input-intro">Enter your CFN below to generate a personalized report. You'll see trend lines, matchup breakdowns, and a coaching-style insight on where to focus next.</p>
  
  <div class="sf6-input-row">
    <input id="sf6-cfn-input" type="text" placeholder="e.g., karatesnacks">
    <button id="sf6-cfn-submit">Generate report</button>
    <button id="sf6-copy-link">Copy shareable link</button>
  </div>
</div>

<div class="sf6-report-header">
  <div class="sf6-report-header-row">
    <h1 id="sf6-report-status" class="sf6-report-title">Street Fighter 6 Matchup Lab</h1>
    <button id="sf6-clear-report" class="sf6-load-another-btn">Clear current report</button>
  </div>
</div>

<section id="sf6-character-banner" class="sf6-char-banner">
  <div id="sf6-character-banner-content" class="sf6-char-banner-content sf6-muted">
    <!-- Filled by JS once a report loads -->
  </div>
</section>

<hr />

<div id="sf6-report-sections" class="sf6-hidden">
  <section id="sf6-overall-play">
    <h2>Overall Play</h2>
    <div id="sf6-play-overview-text" class="sf6-insight-card">
      <ul id="sf6-play-bullets" style="margin-top: 0; margin-bottom: 0; display: none;">
      </ul>
    </div>

    <div class="sf6-distribution-row">
      <div class="sf6-card">
        <div class="sf6-card-title">Mode distribution</div>
        <div id="sf6-mode-distribution-chart"></div>
        <div id="sf6-mode-distribution-text" class="sf6-muted"></div>
      </div>

      <div class="sf6-card">
        <div class="sf6-card-title">Character distribution</div>
        <div id="sf6-character-distribution-chart"></div>
      </div>
    </div>

    <div id="sf6-activity-heatmap-container" style="margin-top: 2rem;">
      <div class="sf6-card">
        <div class="sf6-card-title">Practice volume & consistency</div>
        <div id="sf6-activity-chart"></div>
        <div id="sf6-activity-text" class="sf6-muted"></div>
      </div>
    </div>
  </section>

  <hr />

  <section id="sf6-ranked-play">
    <h2>Ranked Play</h2>
    <div id="sf6-ranked-overview-text" class="sf6-insight-card">
      <ul id="sf6-ranked-bullets" style="margin-top: 0; margin-bottom: 0; display: none;">
      </ul>
    </div>

    <div class="sf6-distribution-row">
      <div class="sf6-card">
        <div class="sf6-card-title">MR Trend (weekly summary)</div>
        
        <!-- Tabs for character selection -->
        <div id="sf6-char-tabs" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 1px solid #333; flex-wrap: wrap;">
          <button id="sf6-char-tab-aggregate" class="sf6-char-tab sf6-char-tab-active" data-char="aggregate" style="padding: 0.5rem 1rem; background: #1e3a3a; border: none; color: #e5e7eb; cursor: pointer; font-size: 0.9rem;">All Characters</button>
        </div>
        
        <div id="sf6-mr-trend-chart" class="sf6-chart-container">
          <p id="sf6-mr-trend-text" class="sf6-muted" style="margin: 0; text-align: center; padding: 2rem;">Load a report to see your ranked MR trend.</p>
        </div>
        <div id="sf6-mr-weekly-chart" class="sf6-chart-container" style="margin-top: 1rem;">
          <p id="sf6-mr-weekly-text" class="sf6-muted" style="margin: 0; text-align: center; padding: 2rem;">Weekly MR delta will appear here.</p>
        </div>
      </div>
    </div>

    <section id="sf6-matchup-overview" style="margin-top: 2rem;">
      <h3>Matchup overview (stable matchups)</h3>
      <p class="sf6-muted">
        Top and bottom matchups with enough games to be meaningful. Top three are shown; expand for the full tables.
      </p>

      <div class="sf6-matchup-grid">

        <section class="sf6-matchup-card">
          <h4>Best matchups (min 10 games)</h4>
          <table class="sf6-matchup-table">
            <thead>
              <tr>
                <th>Opponent</th>
                <th>Games</th>
                <th>Win rate</th>
                <th>Avg Opp MR</th>
              </tr>
            </thead>
            <tbody id="sf6-matchup-best-summary">
              <!-- Filled by sf6-report.js -->
            </tbody>
          </table>
          <details class="sf6-collapsible">
            <summary>View full table</summary>
            <div class="sf6-table-scroll">
              <table class="sf6-matchup-table">
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>Games</th>
                    <th>Win rate</th>
                    <th>Avg Opp MR</th>
                  </tr>
                </thead>
                <tbody id="sf6-matchup-best-full">
                  <!-- Filled by sf6-report.js -->
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section class="sf6-matchup-card">
          <h4>Toughest matchups (min 10 games)</h4>
          <table class="sf6-matchup-table">
            <thead>
              <tr>
                <th>Opponent</th>
                <th>Games</th>
                <th>Win rate</th>
                <th>Avg Opp MR</th>
              </tr>
            </thead>
            <tbody id="sf6-matchup-worst-summary">
              <!-- Filled by sf6-report.js -->
            </tbody>
          </table>
          <details class="sf6-collapsible">
            <summary>View full table</summary>
            <div class="sf6-table-scroll">
              <table class="sf6-matchup-table">
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th>Games</th>
                    <th>Win rate</th>
                    <th>Avg Opp MR</th>
                  </tr>
                </thead>
                <tbody id="sf6-matchup-worst-full">
                  <!-- Filled by sf6-report.js -->
                </tbody>
              </table>
            </div>
          </details>
        </section>

      </div>
    </section>

  </section>
</div>
