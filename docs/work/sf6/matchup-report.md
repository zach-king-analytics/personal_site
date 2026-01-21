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

---

<div id="sf6-report-sections" class="sf6-hidden" markdown="1">

<div class="sf6-card">
  <div class="sf6-card-title">Mode distribution</div>
  <div id="sf6-mode-distribution-chart"></div>
  <div id="sf6-mode-distribution-text" class="sf6-muted"></div>
</div>

---

## Practice Volume & Consistency

<section class="sf6-activity">
  <div class="sf6-insight-card">
    <div class="sf6-insight-title">How often you play</div>
    <p class="sf6-insight-body" id="sf6-activity-text">
      Load a report to see how consistently you play ranked and whether your sessions skew toward steady practice or high-volume bursts.

    </p>
  </div>

  <div id="sf6-activity-chart" class="sf6-chart-wrapper sf6-chart-wrapper--compact"></div>
</section>

---

## Matchup Analysis

<p id="sf6-fix-one-matchup-text" class="sf6-muted">
Load a report to see matchup data and coaching insights.
</p>

### Overall Play

<p class="sf6-muted" style="font-size: 0.9rem;">
All modes. Top three best/toughest shown; expand for full table.
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
      <tbody id="sf6-matchup-overall-best-summary">
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
          <tbody id="sf6-matchup-overall-best-full">
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
      <tbody id="sf6-matchup-overall-worst-summary">
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
          <tbody id="sf6-matchup-overall-worst-full">
            <!-- Filled by sf6-report.js -->
          </tbody>
        </table>
      </div>
    </details>
  </section>

</div>

---

### Ranked (MR-filtered)

<p class="sf6-muted" style="font-size: 0.9rem;">
Ranked matches only. Top three best/toughest shown; expand for full table.
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
      <tbody id="sf6-matchup-ranked-best-summary">
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
          <tbody id="sf6-matchup-ranked-best-full">
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
      <tbody id="sf6-matchup-ranked-worst-summary">
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
          <tbody id="sf6-matchup-ranked-worst-full">
            <!-- Filled by sf6-report.js -->
          </tbody>
        </table>
      </div>
    </details>
  </section>

</div>

</div>



