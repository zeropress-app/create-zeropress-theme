/* Editorial Marginalia — progressive enhancement */
(function () {
  function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    try { localStorage.setItem("portfolio-theme", mode); } catch (err) {}
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
    function syncLabel() {
      var current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      button.textContent = current === "dark" ? "Light" : "Dark";
      button.setAttribute("aria-pressed", current === "dark" ? "true" : "false");
    }

    button.addEventListener("click", function () {
      var current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      setTheme(current === "dark" ? "light" : "dark");
      syncLabel();
    });

    syncLabel();
  });

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

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (status) {
        status.textContent = "This starter form is ready for your own endpoint.";
        status.hidden = false;
      }
    });
  });
})();
