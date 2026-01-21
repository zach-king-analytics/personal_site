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

## Overall Play

<p id="sf6-play-overview-text" class="sf6-insight-card">
  <strong>Load a report to see your play patterns.</strong> Understanding your mode mix and character breadth helps you identify where your time is going and where to focus next.
</p>

<div class="sf6-distribution-row">
  <div class="sf6-card">
    <div class="sf6-card-title">Mode distribution</div>
    <div id="sf6-mode-distribution-chart"></div>
    <div id="sf6-mode-distribution-text" class="sf6-muted"></div>
  </div>

  <div class="sf6-card">
    <div class="sf6-card-title">Character distribution</div>
    <div id="sf6-character-distribution-chart"></div>
  </div></div><script>
setTimeout(() => {
  const cards = document.querySelectorAll(".sf6-distribution-row .sf6-card");
  if (cards.length === 2) {
    cards[0].style.display = "inline-block"; cards[0].style.width = "calc(50% - 0.75rem)"; cards[0].style.marginRight = "1.5rem";
    cards[1].style.display = "inline-block"; cards[1].style.width = "calc(50% - 0.75rem)";
  }
}, 50);
</script>
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

## Player snapshot

<p class="sf6-muted">
A quick summary of this dataset (coverage, skill bracket via MR, and where you’re currently strong/weak).
</p>

<section id="sf6-player-snapshot">
  <div class="sf6-snapshot-grid">

    <section class="sf6-snapshot-card">
      <h4>Profile</h4>
      <dl>
        <dt>Main character</dt>
        <dd id="sf6-main-character">—</dd>

        <dt>Dataset coverage</dt>
        <dd id="sf6-data-range">—</dd>

        <dt>Matches analyzed</dt>
        <dd id="sf6-matches-analyzed">—</dd>
      </dl>
    </section>

    <section class="sf6-snapshot-card">
      <h4>Performance</h4>
      <dl>
        <dt>Overall win rate</dt>
        <dd id="sf6-overall-winrate">—</dd>

        <dt>Average MR</dt>
        <dd id="sf6-average-mr">—</dd>

        <dt>Avg opponent MR</dt>
        <dd id="sf6-average-opponent-mr">—</dd>
      </dl>
    </section>

    <section class="sf6-snapshot-card">
      <h4>Matchup profile</h4>
      <dl>
        <dt>Most played matchup</dt>
        <dd id="sf6-most-played-matchup">—</dd>

        <dt>Best matchup (min 10 games)</dt>
        <dd id="sf6-best-matchup">—</dd>

        <dt>Worst matchup (min 10 games)</dt>
        <dd id="sf6-worst-matchup">—</dd>
      </dl>
    </section>

  </div>
</section>

---

## Coaching insight

### If you fixed one matchup…

<p id="sf6-fix-one-matchup-text" class="sf6-muted">
Load a report to see which matchup would move your overall win rate the most if you brought it up to 50%.
</p>

---

## Matchup overview (stable matchups)

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

</div>



