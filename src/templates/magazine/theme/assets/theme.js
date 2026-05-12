/* Æther Quarterly — progressive enhancement */
(function () {
  var THEME_KEY = "aether-theme";
  var root = document.documentElement;

  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  function currentTheme() {
    return root.getAttribute("data-theme") || "light";
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  // Side-rail scroll-spy
  var rail = document.querySelector("[data-side-rail]");
  if (rail && "IntersectionObserver" in window) {
    var links = rail.querySelectorAll("a[data-rail]");
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("data-rail")] = a; });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("active"); });
          var id = entry.target.id;
          if (byId[id]) byId[id].classList.add("active");
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  // Reading progress on post pages
  var progress = document.querySelector("[data-reading-progress] span");
  if (progress) {
    var update = function () {
      var doc = document.documentElement;
      var scrolled = doc.scrollTop || document.body.scrollTop;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? Math.min(100, (scrolled / max) * 100) : 0;
      progress.style.width = pct + "%";
    };
    document.addEventListener("scroll", update, { passive: true });
    update();
  }
})();
