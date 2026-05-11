/* Editorial Marginalia — progressive enhancement */
(function () {
  var STORAGE_KEY = "about_contact_submissions";

  function setError(form, name, message) {
    var input = form.querySelector('[name="' + name + '"]');
    var hint = form.querySelector('[data-error-for="' + name + '"]');
    if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
    if (hint) {
      if (message) { hint.textContent = message; hint.hidden = false; }
      else { hint.textContent = ""; hint.hidden = true; }
    }
  }

  function validate(form, data) {
    var errors = {};
    if (!data.name) errors.name = "Name is required";
    else if (data.name.length > 100) errors.name = "Name must be under 100 characters";
    if (!data.email) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Invalid email address";
    if (!data.message) errors.message = "Message is required";
    else if (data.message.length > 1000) errors.message = "Message must be under 1000 characters";
    ["name", "email", "message"].forEach(function (k) { setError(form, k, errors[k]); });
    return Object.keys(errors).length === 0;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }

  document.querySelectorAll("[data-contact-form]").forEach(function (form) {
    var textarea = form.querySelector('textarea[name="message"]');
    var counter = form.querySelector("[data-char-count]");
    var status = form.querySelector("[data-contact-status]");
    var max = textarea ? (parseInt(textarea.getAttribute("maxlength"), 10) || 1000) : 1000;

    if (textarea && counter) {
      var update = function () { counter.textContent = textarea.value.length + "/" + max; };
      textarea.addEventListener("input", update);
      update();
    }

    form.addEventListener("input", function (e) {
      var t = e.target;
      if (t && t.name) setError(form, t.name, "");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {
        name: (form.name && form.name.value || "").trim(),
        email: (form.email && form.email.value || "").trim(),
        message: (form.message && form.message.value || "").trim()
      };
      if (!validate(form, data)) return;

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

      try {
        var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        existing.unshift({
          id: uuid(),
          submittedAt: new Date().toISOString(),
          name: data.name, email: data.email, message: data.message
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      } catch (err) { /* ignore quota / private mode */ }

      var recipient = form.getAttribute("data-recipient");
      if (recipient) {
        var subject = encodeURIComponent("New message from " + data.name);
        var body = encodeURIComponent(data.message + "\n\n— " + data.name + " (" + data.email + ")");
        window.open("mailto:" + recipient + "?subject=" + subject + "&body=" + body, "_blank");
      }

      if (status) {
        status.textContent = "Message saved. Your email client has been opened.";
        status.hidden = false;
      }
      form.reset();
      if (counter) counter.textContent = "0/" + max;
      if (btn) { btn.disabled = false; btn.textContent = "Send message"; }
    });
  });
})();
