---
hide:
  - navigation
  - toc
---

# Street Fighter 6 Matchup Lab

Enter your CFN below to generate a personalized report. You'll see trend lines, matchup breakdowns, and a coaching-style insight on where to focus next.

---

## Generate a report

<div class="sf6-input-row">
  <input id="sf6-cfn-input" type="text" placeholder="e.g., karatesnacks">
  <button id="sf6-cfn-submit">Generate report</button>
  <button id="sf6-copy-link">Copy shareable link</button>
</div>

<p id="sf6-report-status" class="sf6-muted"></p>

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
Top and bottom matchups by win rate, filtered to matchups with enough games to be meaningful.
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
      <tbody id="sf6-matchup-best-body">
        <!-- Filled by sf6-report.js -->
      </tbody>
    </table>
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
      <tbody id="sf6-matchup-worst-body">
        <!-- Filled by sf6-report.js -->
      </tbody>
    </table>
  </section>

</div>

</div>


