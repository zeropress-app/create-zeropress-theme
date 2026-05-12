const MOCK_COMMENTS = {
  "1002": [
    { id: "c1", name: "Maya Chen", body: "This type scale feels calm without becoming bland.", createdAt: "2026-04-18T12:00:00Z", likes: 8, replies: [
      { id: "c1-r1", name: "Author", body: "That was the goal — enough character to support long reading.", createdAt: "2026-04-18T13:20:00Z", likes: 3 }
    ]},
    { id: "c2", name: "Daniel R.", body: "The blockquote treatment is especially nice in dark mode.", createdAt: "2026-04-19T09:10:00Z", likes: 5, replies: [] }
  ],
  "1003": [
    { id: "c1", name: "Sam", body: "Commonplace books are underrated search engines for your own attention.", createdAt: "2026-04-15T10:00:00Z", likes: 12, replies: [] }
  ],
  "1005": [
    { id: "c1", name: "Priya", body: "Short sentences are so much harder than they look.", createdAt: "2026-03-29T08:30:00Z", likes: 6, replies: [
      { id: "c1-r1", name: "Tom", body: "Especially when you are used to hiding in the long ones.", createdAt: "2026-03-29T11:00:00Z", likes: 2 }
    ] }
  ]
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text, query) {
  const q = query.trim();
  if (!q) return escapeHTML(text);
  return escapeHTML(text).replace(new RegExp(`(${escapeRegExp(escapeHTML(q))})`, "ig"), "<mark>$1</mark>");
}

function initFilters() {
  const root = $("[data-filter-root]");
  if (!root) return;
  const input = $("[data-filter-search]", root);
  const cards = $$('[data-post-card]', root);
  const empty = $("[data-empty-state]", root);
  const clear = $("[data-clear-filters]", root);
  const selectedCount = $("[data-selected-tags-count]", root);
  let category = "all";
  const tags = new Set();

  function labelFromSlug(slug) {
    return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function ensureDynamicFilterChips() {
    const categoryRow = $("[data-category-row] .filter-chip-row", root);
    const tagRow = $("[data-tag-row] .filter-chip-row", root);
    if (categoryRow && categoryRow.children.length <= 1) {
      const categorySlugs = new Set();
      cards.forEach((card) => (card.dataset.categorySlugs || "").split(/\s+/).filter(Boolean).forEach((slug) => categorySlugs.add(slug)));
      Array.from(categorySlugs).sort().forEach((slug) => {
        const button = document.createElement("button");
        button.className = "filter-chip";
        button.type = "button";
        button.dataset.categoryFilter = slug;
        button.setAttribute("aria-pressed", "false");
        button.textContent = labelFromSlug(slug);
        categoryRow.append(button);
      });
    }
    if (tagRow && tagRow.children.length === 0) {
      const tagSlugs = new Set();
      cards.forEach((card) => (card.dataset.tagSlugs || "").split(/\s+/).filter(Boolean).forEach((slug) => tagSlugs.add(slug)));
      Array.from(tagSlugs).sort().forEach((slug) => {
        const button = document.createElement("button");
        button.className = "filter-chip";
        button.type = "button";
        button.dataset.tagFilter = slug;
        button.setAttribute("aria-pressed", "false");
        button.textContent = `#${labelFromSlug(slug)}`;
        tagRow.append(button);
      });
    }
  }

  ensureDynamicFilterChips();

  function render() {
    const q = (input?.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const title = card.dataset.title || "";
      const excerpt = card.dataset.excerpt || "";
      const categorySlugs = (card.dataset.categorySlugs || "").split(/\s+/).filter(Boolean);
      const tagSlugs = (card.dataset.tagSlugs || "").split(/\s+/).filter(Boolean);
      const matchesCategory = category === "all" || categorySlugs.includes(category);
      const matchesTags = Array.from(tags).every((tag) => tagSlugs.includes(tag));
      const haystack = `${title} ${excerpt} ${categorySlugs.join(" ")} ${tagSlugs.join(" ")}`.toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const show = matchesCategory && matchesTags && matchesSearch;
      card.hidden = !show;
      if (show) visible += 1;
      const titleNode = $("[data-highlight-title]", card);
      const excerptNode = $("[data-highlight-excerpt]", card);
      if (titleNode) titleNode.innerHTML = highlight(title, q);
      if (excerptNode) excerptNode.innerHTML = highlight(excerpt, q);
    });
    if (empty) empty.hidden = visible !== 0;
    const active = Boolean(q || category !== "all" || tags.size);
    if (clear) clear.hidden = !active;
    if (selectedCount) selectedCount.textContent = tags.size ? `· ${tags.size} selected` : "";
  }

  input?.addEventListener("input", render);
  $$('[data-category-filter]', root).forEach((button) => {
    button.addEventListener("click", () => {
      category = button.dataset.categoryFilter || "all";
      $$('[data-category-filter]', root).forEach((b) => {
        const active = b === button;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      render();
    });
  });
  $$('[data-tag-filter]', root).forEach((button) => {
    button.addEventListener("click", () => {
      const tag = button.dataset.tagFilter;
      if (!tag) return;
      tags.has(tag) ? tags.delete(tag) : tags.add(tag);
      const active = tags.has(tag);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      render();
    });
  });
  clear?.addEventListener("click", () => {
    if (input) input.value = "";
    category = "all";
    tags.clear();
    $$('[data-category-filter]', root).forEach((b) => {
      const active = b.dataset.categoryFilter === "all";
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    $$('[data-tag-filter]', root).forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-pressed", "false");
    });
    render();
  });
  render();
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function countComments(list) {
  return list.reduce((sum, c) => sum + 1 + countComments(c.replies || []), 0);
}

function initComments() {
  $$('[data-comments-root]').forEach((root) => {
    const postId = root.dataset.commentsPost;
    const storageKey = `zp-minimal-comments:${postId}`;
    const likesKey = `zp-minimal-likes:${postId}`;
    let comments;
    try { comments = JSON.parse(localStorage.getItem(storageKey)) || MOCK_COMMENTS[postId] || []; } catch { comments = MOCK_COMMENTS[postId] || []; }
    let liked;
    try { liked = new Set(JSON.parse(localStorage.getItem(likesKey)) || []); } catch { liked = new Set(); }

    const save = () => localStorage.setItem(storageKey, JSON.stringify(comments));
    const saveLikes = () => localStorage.setItem(likesKey, JSON.stringify(Array.from(liked)));

    function updateCount() {
      const node = $('[data-comments-count]', root);
      if (node) node.textContent = `(${countComments(comments)})`;
    }

    function updateLike(id, delta, list = comments) {
      return list.map((c) => c.id === id ? { ...c, likes: Math.max(0, (c.likes || 0) + delta) } : { ...c, replies: updateLike(id, delta, c.replies || []) });
    }

    function addReply(parentId, reply, list = comments) {
      return list.map((c) => c.id === parentId ? { ...c, replies: [...(c.replies || []), reply] } : { ...c, replies: addReply(parentId, reply, c.replies || []) });
    }

    function renderComment(c, isReply = false) {
      const article = document.createElement('article');
      article.className = `comment${isReply ? ' comment--reply' : ''}`;
      article.innerHTML = `
        <div class="comment-meta"><strong class="comment-author">${escapeHTML(c.name)}</strong><span aria-hidden="true">·</span><time>${formatDate(c.createdAt)}</time></div>
        <p class="comment-body">${escapeHTML(c.body)}</p>
        <div class="comment-actions">
          <button type="button" data-like="${escapeHTML(c.id)}" class="${liked.has(c.id) ? 'is-liked' : ''}">♥ ${c.likes || 0}</button>
          ${isReply ? '' : `<button type="button" data-reply="${escapeHTML(c.id)}">Reply</button>`}
        </div>
        <div data-reply-slot></div>
        <div class="comment-replies"></div>`;
      $('[data-like]', article)?.addEventListener('click', () => {
        const wasLiked = liked.has(c.id);
        wasLiked ? liked.delete(c.id) : liked.add(c.id);
        comments = updateLike(c.id, wasLiked ? -1 : 1);
        save(); saveLikes(); render();
      });
      $('[data-reply]', article)?.addEventListener('click', () => {
        const slot = $('[data-reply-slot]', article);
        if (!slot) return;
        slot.innerHTML = `<form class="reply-form"><label><span>Name</span><input name="name" placeholder="Anonymous"></label><label><span>Reply</span><textarea name="body" rows="3" required placeholder="Write a reply…"></textarea></label><button type="submit">Post reply →</button></form>`;
        $('form', slot)?.addEventListener('submit', (event) => {
          event.preventDefault();
          const fd = new FormData(event.currentTarget);
          const body = String(fd.get('body') || '').trim();
          if (!body) return;
          const reply = { id: crypto.randomUUID(), name: String(fd.get('name') || '').trim() || 'Anonymous', body, createdAt: new Date().toISOString(), likes: 0, replies: [] };
          comments = addReply(c.id, reply);
          save(); render();
        });
      });
      const replies = $('.comment-replies', article);
      (c.replies || []).forEach((r) => replies?.append(renderComment(r, true)));
      return article;
    }

    function render() {
      const list = $('[data-comments-list]', root);
      if (!list) return;
      list.innerHTML = '';
      if (!comments.length) list.innerHTML = '<p class="empty-state">No comments yet. Be the first to leave one.</p>';
      comments.forEach((c) => list.append(renderComment(c)));
      updateCount();
    }

    $('[data-comment-form]', root)?.addEventListener('submit', (event) => {
      event.preventDefault();
      const fd = new FormData(event.currentTarget);
      const body = String(fd.get('body') || '').trim();
      if (!body) return;
      comments.push({ id: crypto.randomUUID(), name: String(fd.get('name') || '').trim() || 'Anonymous', body, createdAt: new Date().toISOString(), likes: 0, replies: [] });
      save(); event.currentTarget.reset(); render();
    });
    render();
  });
}

initFilters();
initComments();
