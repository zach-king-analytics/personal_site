---
hide:
  - navigation
---

# Contact

<p class="contact-intro">If you want clearer data systems, faster performance, or better insight pipelines, let’s talk.</p>

<form id="contact-form" action="https://formspree.io/f/xjkpbrpj" method="POST">
  <input type="hidden" name="_subject" value="Website contact" />
  <!-- honeypot -->
  <input type="text" name="company" tabindex="-1" autocomplete="off" class="hp">

  <label for="name">Name</label>
  <input id="name" name="name" required>

  <label for="email">Email</label>
  <input id="email" name="email" type="email" required>

  <label for="msg">Message</label>
  <textarea id="msg" name="message" rows="6" required></textarea>

  <button class="md-button md-button--primary" type="submit">Send</button>
  <p id="form-status" role="status" aria-live="polite"></p>
</form>

