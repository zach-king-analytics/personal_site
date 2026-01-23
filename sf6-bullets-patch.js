    // Generate data-driven bullets for overview section
    function generateOverviewBullets(modeBreakdown, charBreakdown) {
      const bulletsContainer = document.getElementById("sf6-play-bullets");
      if (!bulletsContainer) return;

      const bullets = [];

      // Bullet 1: Mode focus
      if (Array.isArray(modeBreakdown) && modeBreakdown.length > 0) {
        const sorted = modeBreakdown.slice().sort((a, b) => (b.matches || 0) - (a.matches || 0));
        const topMode = sorted[0];
        if (topMode) {
          const modeName = (topMode.mode || "").toLowerCase() === "rank" ? "Ranked" : (topMode.mode || "Mode").charAt(0).toUpperCase() + (topMode.mode || "").slice(1).toLowerCase();
          bullets.push(`<li><strong>${modeName} focus:</strong> ${topMode.share_pct}% of your matches</li>`);
        }
      }

      // Bullet 2: Character breadth
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
        const breadthDesc = charCount <= 2 ? "narrow focus" : charCount <= 4 ? "moderate variety" : charCount <= 6 ? "broad pool" : "extensive roster";
        bullets.push(`<li><strong>Character pool:</strong> ${charCount} character${charCount === 1 ? "" : "s"} (${breadthDesc})</li>`);
      }

      bulletsContainer.innerHTML = bullets.join("");
      bulletsContainer.style.display = bullets.length > 0 ? "block" : "none";
    }
