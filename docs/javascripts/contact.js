document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Sending…";
    const data = new FormData(form);
    // Abort if honeypot filled
    if (data.get("company")) return;
    try {
      const res = await fetch(form.action, { method: "POST", body: data, headers: { "Accept": "application/json" }});
      if (res.ok) {
        form.reset();
        status.textContent = "Message sent. Thank you.";
      } else {
        status.textContent = "Failed to send. Try later.";
      }
    } catch {
      status.textContent = "Network error. Try later.";
    }
  });
});
