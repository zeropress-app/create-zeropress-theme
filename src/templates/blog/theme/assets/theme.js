const THEME_KEY = "zeropress-theme";
const SEARCH_INDEX_URL = "/meta.json";
const MIN_SEARCH_QUERY_LENGTH = 2;
const MAX_SEARCH_RESULTS = 8;
const HEAD_PERSISTENT_SELECTORS = [
  'meta[charset]',
  'meta[name="viewport"]',
];
const SOFT_NAVIGATION_SKIP_PATTERN = /\.(?:xml|json|txt|pdf|zip|gz|css|js|map|png|jpe?g|gif|svg|webp|avif|ico|mp4|webm|mp3|woff2?|ttf)$/i;

let activeNavigationController;
let scrollSaveFrame = 0;
let searchControllers = [];
let searchGlobalHandlersBound = false;
let searchIndexPromise;

document.documentElement.classList.add("js");

const loadedExternalScripts = new Set(
  Array.from(document.scripts)
    .map((script) => script.src)
    .filter(Boolean),
);

function getStorage(type) {
  try {
    return window[type];
  } catch {
    return null;
  }
}

const themeStorage = getStorage("localStorage");

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function normalizePath(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeStorage?.setItem(THEME_KEY, theme);

  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle) {
    return;
  }

  toggle.textContent = theme === "dark" ? "☀️" : "🌙";
  toggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
  );
}

function initThemeToggle() {
  const savedTheme = themeStorage?.getItem(THEME_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (prefersDark ? "dark" : "light"));

  const toggle = document.querySelector("[data-theme-toggle]");
  if (!toggle || toggle.dataset.themeToggleReady === "true") {
    return;
  }

  toggle.dataset.themeToggleReady = "true";
  toggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    setTheme(currentTheme === "dark" ? "light" : "dark");
  });
}

function updateFeaturedPosts(root = document) {
  root.querySelectorAll(".post-list--home").forEach((list) => {
    const items = Array.from(list.children).filter((item) =>
      item.matches(".post-item, .post-list-item")
    );

    items.forEach((item) => item.classList.remove("is-featured"));

    const firstVisible = items.find((item) => !item.hidden);
    if (firstVisible) {
      firstVisible.classList.add("is-featured");
    }
  });
}

function normalizeSearchText(value) {
  if (!value) {
    return "";
  }

  return value
    .toString()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function loadSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch(SEARCH_INDEX_URL, {
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Search index request failed with ${response.status}`);
        }

        const payload = await response.json();
        const pages = Array.isArray(payload?.pages) ? payload.pages : [];

        return pages
          .filter((page) => page?.url && page?.title)
          .filter((page) => page?.metadata?.status !== "draft")
          .map((page) => ({
            url: page.url,
            title: page.title,
            description: page.description || "",
            type: page.type || "page",
            updatedAt: page.updatedAt || page.publishedAt || "",
            titleNormalized: normalizeSearchText(page.title),
            descriptionNormalized: normalizeSearchText(page.description || ""),
            urlNormalized: normalizeSearchText(page.url),
          }));
      })
      .catch((error) => {
        searchIndexPromise = undefined;
        throw error;
      });
  }

  return searchIndexPromise;
}

function scoreSearchResult(entry, query, queryTokens) {
  let score = 0;

  if (entry.titleNormalized === query) {
    score += 140;
  } else if (entry.titleNormalized.startsWith(query)) {
    score += 110;
  } else if (entry.titleNormalized.includes(query)) {
    score += 80;
  }

  if (entry.descriptionNormalized.includes(query)) {
    score += 30;
  }

  if (entry.urlNormalized.includes(query)) {
    score += 18;
  }

  let tokenMatches = 0;

  queryTokens.forEach((token) => {
    if (entry.titleNormalized.includes(token)) {
      score += entry.titleNormalized.startsWith(token) ? 28 : 18;
      tokenMatches += 1;
      return;
    }

    if (entry.descriptionNormalized.includes(token)) {
      score += 10;
      tokenMatches += 1;
      return;
    }

    if (entry.urlNormalized.includes(token)) {
      score += 6;
      tokenMatches += 1;
    }
  });

  if (tokenMatches === queryTokens.length) {
    score += 24;
  }

  if (entry.type === "post" && score > 0) {
    score += 4;
  }

  return score;
}

function searchDocuments(query, entries) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery || normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
    return [];
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  return entries
    .map((entry) => ({
      ...entry,
      score: scoreSearchResult(entry, normalizedQuery, queryTokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.updatedAt.localeCompare(left.updatedAt);
    })
    .slice(0, MAX_SEARCH_RESULTS);
}

function createSearchResultItem(entry) {
  const link = document.createElement("a");
  link.className = "search-result";
  link.href = entry.url;

  const meta = document.createElement("div");
  meta.className = "search-result__meta";

  const type = document.createElement("span");
  type.className = "search-result__type";
  type.textContent = entry.type;

  const path = document.createElement("span");
  path.textContent = entry.url;

  meta.append(type, path);

  const title = document.createElement("strong");
  title.className = "search-result__title";
  title.textContent = entry.title;

  const description = document.createElement("p");
  description.className = "search-result__description";
  description.textContent = entry.description || "No summary available yet.";

  link.append(meta, title, description);
  return link;
}

function isTypingTarget(target) {
  return target instanceof HTMLElement
    && (
      target.isContentEditable
      || target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
    );
}

function pruneDetachedSearchControllers() {
  searchControllers = searchControllers.filter((controller) => controller.searchRoot.isConnected);
}

function hideAllSearchResults() {
  pruneDetachedSearchControllers();
  searchControllers.forEach((controller) => controller.hideResults());
}

function bindSearchGlobalHandlers() {
  if (searchGlobalHandlersBound) {
    return;
  }

  searchGlobalHandlersBound = true;

  document.addEventListener("click", (event) => {
    pruneDetachedSearchControllers();

    searchControllers.forEach((controller) => {
      if (event.target instanceof Node && !controller.searchRoot.contains(event.target)) {
        controller.hideResults();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    const pressedShortcut = event.key === "/" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k");
    if (!pressedShortcut || isTypingTarget(document.activeElement)) {
      return;
    }

    pruneDetachedSearchControllers();

    const primaryController = searchControllers[0];
    if (!primaryController) {
      return;
    }

    event.preventDefault();
    primaryController.searchInput.focus();
    primaryController.searchInput.select();
  });
}

function initNavigationState() {
  const currentPath = normalizePath(window.location.pathname);

  document.querySelectorAll(".site-nav a").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.includes(".xml")) {
      return;
    }

    const linkPath = normalizePath(new URL(href, window.location.origin).pathname);
    const isActive = linkPath === "/"
      ? currentPath === "/"
      : currentPath === linkPath || currentPath.startsWith(linkPath);

    link.classList.toggle("active", isActive);
  });
}

function initSearch(root = document) {
  bindSearchGlobalHandlers();
  pruneDetachedSearchControllers();

  const searchRoots = Array.from(root.querySelectorAll("[data-search-root]"))
    .filter((element) => element instanceof HTMLElement)
    .filter((element) => element.dataset.searchReady !== "true");

  if (searchRoots.length === 0) {
    return;
  }

  searchRoots.forEach((searchRoot) => {
    const searchInput = searchRoot.querySelector("[data-theme-search]");
    const feedback = searchRoot.querySelector("[data-search-feedback]");
    const resultsPanel = searchRoot.querySelector("[data-search-results]");
    const searchForm = searchRoot.querySelector("[data-search-form]");

    if (!(searchInput instanceof HTMLInputElement) || !(resultsPanel instanceof HTMLElement)) {
      return;
    }

    searchRoot.dataset.searchReady = "true";

    const setFeedback = (message) => {
      if (feedback) {
        feedback.textContent = message;
      }
    };

    const hideResults = () => {
      resultsPanel.hidden = true;
      resultsPanel.replaceChildren();
    };

    const renderResults = (results) => {
      if (!results.length) {
        hideResults();
        return;
      }

      const fragment = document.createDocumentFragment();
      results.forEach((result) => {
        fragment.append(createSearchResultItem(result));
      });
      resultsPanel.replaceChildren(fragment);
      resultsPanel.hidden = false;
    };

    let activeQuery = "";
    let isComposing = false;
    let lastSuccessfulQuery = "";
    let lastSuccessfulFeedback = "";

    const runSearch = async () => {
      const rawQuery = searchInput.value.trim();
      const normalizedQuery = normalizeSearchText(rawQuery);
      activeQuery = normalizedQuery;

      if (!normalizedQuery) {
        lastSuccessfulQuery = "";
        lastSuccessfulFeedback = "";
        hideResults();
        setFeedback("");
        return;
      }

      if (normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
        lastSuccessfulQuery = "";
        lastSuccessfulFeedback = "";
        hideResults();
        setFeedback([
          "Type at least",
          String(MIN_SEARCH_QUERY_LENGTH),
          "characters to search the site.",
        ].join(" "));
        return;
      }

      setFeedback("Searching...");

      try {
        const entries = await loadSearchIndex();
        if (activeQuery !== normalizedQuery) {
          return;
        }

        const results = searchDocuments(rawQuery, entries);
        const shouldKeepLastSuccessfulResults =
          results.length === 0 &&
          Boolean(lastSuccessfulQuery) &&
          normalizedQuery.length > lastSuccessfulQuery.length &&
          normalizedQuery.startsWith(lastSuccessfulQuery) &&
          resultsPanel.childElementCount > 0;

        if (shouldKeepLastSuccessfulResults) {
          setFeedback(lastSuccessfulFeedback);
          return;
        }

        renderResults(results);

        if (results.length > 0) {
          lastSuccessfulQuery = normalizedQuery;
          lastSuccessfulFeedback = [
            String(results.length),
            `result${results.length === 1 ? "" : "s"}`,
            `for "${rawQuery}".`,
          ].join(" ");
          setFeedback(lastSuccessfulFeedback);
          return;
        }

        lastSuccessfulQuery = "";
        lastSuccessfulFeedback = "";
        setFeedback(["No matches", `for "${rawQuery}".`].join(" "));
      } catch (error) {
        console.error("Search index load failed:", error);
        if (activeQuery !== normalizedQuery) {
          return;
        }

        lastSuccessfulQuery = "";
        lastSuccessfulFeedback = "";
        hideResults();
        setFeedback("Search is temporarily unavailable.");
      }
    };

    searchInput.addEventListener("compositionstart", () => {
      isComposing = true;
    });

    searchInput.addEventListener("compositionend", () => {
      isComposing = false;
      void runSearch();
    });

    searchInput.addEventListener("input", (event) => {
      if (isComposing || event.isComposing) {
        return;
      }

      void runSearch();
    });

    searchInput.addEventListener("focus", () => {
      if (resultsPanel.childElementCount > 0 && normalizeSearchText(searchInput.value)) {
        resultsPanel.hidden = false;
      }
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideResults();
        setFeedback("");
        searchInput.blur();
        return;
      }

      if (event.key === "ArrowDown" && !resultsPanel.hidden) {
        const firstResult = resultsPanel.querySelector("a");
        if (firstResult instanceof HTMLElement) {
          event.preventDefault();
          firstResult.focus();
        }
      }
    });

    if (searchForm instanceof HTMLFormElement) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        void runSearch();
      });
    }

    resultsPanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideResults();
        searchInput.focus();
      }
    });

    searchControllers.push({
      searchRoot,
      searchInput,
      hideResults,
    });
  });
}

function initNewsletterForm(root = document) {
  root.querySelectorAll("[data-newsletter-form]").forEach((form) => {
    if (form.dataset.newsletterReady === "true") {
      return;
    }

    form.dataset.newsletterReady = "true";
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const input = form.querySelector('input[type="email"]');
      const value = input instanceof HTMLInputElement ? input.value.trim() : "";

      if (value) {
        window.alert(
          [
            "Thanks.",
            `${value} is noted, but this demo theme does not submit a real newsletter form yet.`,
          ].join(" "),
        );
      } else {
        window.alert("This demo theme does not submit a real newsletter form yet.");
      }

      if (input instanceof HTMLInputElement) {
        input.value = "";
      }
    });
  });
}

function slugifyHeadingText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePositiveInteger(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return 0;
  }

  const normalizedValue = value.trim();
  if (!/^\d+$/.test(normalizedValue)) {
    return 0;
  }

  const parsed = Number.parseInt(normalizedValue, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

function parseCommentPostPublicId(element) {
  if (!(element instanceof HTMLElement)) {
    return 0;
  }

  return parsePositiveInteger(element.dataset.zpCommentsPost || "");
}

function buildCommentTree(comments) {
  const map = new Map();
  const roots = [];

  comments.forEach((comment) => {
    map.set(comment.id, {
      ...comment,
      children: [],
    });
  });

  comments.forEach((comment) => {
    const node = map.get(comment.id);
    if (!node) {
      return;
    }

    if (comment.parent_id && map.has(comment.parent_id)) {
      map.get(comment.parent_id).children.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
}

function reportCommentsContractError(message, details = "") {
  console.error("[ZeroPress Comments]", message, details);
}

function getCommentInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getCommentTemplate(scope, attribute, label) {
  const template = scope.querySelector(`template[${attribute}]`);
  if (!(template instanceof HTMLTemplateElement)) {
    reportCommentsContractError(`Missing required ${label} template.`, attribute);
    return null;
  }

  return template;
}

function resolveCommentsTemplates(mount) {
  const scope = mount.closest(".comments-block");
  if (!(scope instanceof HTMLElement)) {
    reportCommentsContractError("Comments mount is missing a .comments-block scope.");
    return null;
  }

  const shell = getCommentTemplate(scope, "data-zp-comments-shell", "comments shell");
  const form = getCommentTemplate(scope, "data-zp-comments-form", "comments form");
  const replyForm = getCommentTemplate(scope, "data-zp-comment-reply-form", "comment reply form");
  const item = getCommentTemplate(scope, "data-zp-comment-item", "comment item");
  const empty = getCommentTemplate(scope, "data-zp-comments-empty", "comments empty state");
  const error = getCommentTemplate(scope, "data-zp-comment-error", "comment error state");
  const success = getCommentTemplate(scope, "data-zp-comment-success", "comment success state");

  if (!shell || !form || !replyForm || !item || !empty || !error || !success) {
    return null;
  }

  return { shell, form, replyForm, item, empty, error, success };
}

function cloneTemplateFragment(template) {
  return template.content.cloneNode(true);
}

function getCommentRole(container, role) {
  const target = container.querySelector(`[data-role="${role}"]`);
  return target instanceof HTMLElement ? target : null;
}

function getRequiredCommentRole(container, role, contextLabel) {
  const target = getCommentRole(container, role);
  if (!target) {
    reportCommentsContractError(`Missing required ${role} role in ${contextLabel}.`);
    return null;
  }

  return target;
}

function validateCommentFormFragment(fragment, options = {}) {
  const { parentId = "" } = options;
  const form = fragment.querySelector("[data-zp-comment-form]");
  if (!(form instanceof HTMLFormElement)) {
    reportCommentsContractError("Comments form template must contain <form data-zp-comment-form>.");
    return null;
  }

  const requiredFieldNames = [
    "author_name",
    "author_email",
    "content",
    "parent_id",
    "website",
  ];

  for (const name of requiredFieldNames) {
    const field = form.querySelector(`[name="${name}"]`);
    if (!(field instanceof HTMLElement)) {
      reportCommentsContractError(`Comments form template is missing required field: ${name}.`);
      return null;
    }
  }

  const parentIdField = form.querySelector('[name="parent_id"]');
  if (parentIdField instanceof HTMLInputElement) {
    parentIdField.value = parentId;
  }

  return form;
}

function createCommentFeedbackFragment(templates, errors, successMessage) {
  const fragment = document.createDocumentFragment();

  if (Array.isArray(errors) && errors.length > 0) {
    errors.forEach((errorMessage) => {
      const errorFragment = cloneTemplateFragment(templates.error);
      const messageTarget = getRequiredCommentRole(errorFragment, "message", "comment error template");
      if (!messageTarget) {
        return;
      }

      messageTarget.textContent = String(errorMessage || "");
      fragment.append(errorFragment);
    });
    return fragment;
  }

  if (successMessage) {
    const successFragment = cloneTemplateFragment(templates.success);
    const messageTarget = getRequiredCommentRole(successFragment, "message", "comment success template");
    if (!messageTarget) {
      return fragment;
    }

    messageTarget.textContent = successMessage;
    fragment.append(successFragment);
  }

  return fragment;
}

function createReplyFormFragment(node, templates) {
  const fragment = cloneTemplateFragment(templates.replyForm);
  const form = validateCommentFormFragment(fragment, {
    parentId: String(node.id || ""),
  });

  if (!form) {
    return null;
  }

  return fragment;
}

function createCommentItemFragment(node, templates, replyState) {
  const fragment = cloneTemplateFragment(templates.item);
  const authorTarget = getRequiredCommentRole(fragment, "author", "comment item template");
  const dateTarget = getRequiredCommentRole(fragment, "date", "comment item template");
  const contentTarget = getRequiredCommentRole(fragment, "content", "comment item template");
  const replyFormTarget = getRequiredCommentRole(fragment, "reply-form", "comment item template");
  const repliesTarget = getRequiredCommentRole(fragment, "replies", "comment item template");

  if (!authorTarget || !dateTarget || !contentTarget || !replyFormTarget || !repliesTarget) {
    return null;
  }

  authorTarget.textContent = String(node.author_name || "");
  dateTarget.textContent = String(node.created_at || "");
  if (dateTarget instanceof HTMLTimeElement) {
    dateTarget.dateTime = String(node.created_at || "");
  }

  contentTarget.textContent = String(node.content || "");

  const avatarTarget = getCommentRole(fragment, "avatar");
  if (avatarTarget) {
    avatarTarget.textContent = getCommentInitials(node.author_name);
  }

  const itemRoot = fragment.querySelector('[data-role="comment-item"]');
  if (itemRoot instanceof HTMLElement) {
    itemRoot.dataset.commentId = String(node.id || "");
  }

  const replyButton = fragment.querySelector('[data-action="reply"]');
  if (replyButton instanceof HTMLButtonElement) {
    const isReplyOpen = replyState.activeCommentId === String(node.id || "");
    replyButton.dataset.replyCommentId = String(node.id || "");
    replyButton.dataset.replyOpen = isReplyOpen ? "true" : "false";
    replyButton.textContent = isReplyOpen ? "Cancel" : "Reply";
    replyButton.setAttribute("aria-expanded", isReplyOpen ? "true" : "false");
  }

  if (replyState.activeCommentId === String(node.id || "")) {
    const replyFormFragment = createReplyFormFragment(node, templates);
    if (replyFormFragment) {
      replyFormTarget.append(replyFormFragment);
    }
  }

  if (Array.isArray(node.children) && node.children.length > 0) {
    node.children.forEach((childNode) => {
      const childFragment = createCommentItemFragment(childNode, templates, replyState);
      if (childFragment) {
        repliesTarget.append(childFragment);
      }
    });
  }

  return fragment;
}

function createCommentListFragment(comments, templates, replyState) {
  if (!Array.isArray(comments) || comments.length === 0) {
    return cloneTemplateFragment(templates.empty);
  }

  const fragment = document.createDocumentFragment();
  buildCommentTree(comments).forEach((rootNode) => {
    const itemFragment = createCommentItemFragment(rootNode, templates, replyState);
    if (itemFragment) {
      fragment.append(itemFragment);
    }
  });

  return fragment;
}

function createCommentsShellFragment(templates, options) {
  const {
    comments,
    errors = [],
    successMessage = "",
    showForm = true,
    showList = true,
    replyState = { activeCommentId: null },
  } = options;

  const shellFragment = cloneTemplateFragment(templates.shell);
  const feedbackTarget = getRequiredCommentRole(shellFragment, "feedback", "comments shell template");
  const formTarget = getRequiredCommentRole(shellFragment, "form", "comments shell template");
  const listTarget = getRequiredCommentRole(shellFragment, "list", "comments shell template");

  if (!feedbackTarget || !formTarget || !listTarget) {
    return null;
  }

  const countTarget = getCommentRole(shellFragment, "count");
  if (countTarget) {
    countTarget.textContent = String(Array.isArray(comments) ? comments.length : 0);
  }

  feedbackTarget.replaceChildren(createCommentFeedbackFragment(templates, errors, successMessage));

  if (showForm) {
    const formFragment = cloneTemplateFragment(templates.form);
    const form = validateCommentFormFragment(formFragment, {
      parentId: "",
    });
    if (!form) {
      return null;
    }
    formTarget.replaceChildren(formFragment);
  } else {
    formTarget.replaceChildren();
  }

  if (showList) {
    listTarget.replaceChildren(createCommentListFragment(comments, templates, replyState));
  } else {
    listTarget.replaceChildren();
  }
  return shellFragment;
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getCommentsEndpoint(publicId) {
  return `/api/comments?post=${encodeURIComponent(String(publicId))}`;
}

function initComments(root = document) {
  const mounts = Array.from(root.querySelectorAll("[data-zp-comments]"))
    .filter((element) => element instanceof HTMLElement)
    .filter((element) => element.dataset.commentsReady !== "true");

  if (mounts.length === 0) {
    return;
  }

  mounts.forEach((mount) => {
    mount.dataset.commentsReady = "true";
    const publicId = parseCommentPostPublicId(mount);
    if (!publicId) {
      return;
    }

    const templates = resolveCommentsTemplates(mount);
    if (!templates) {
      mount.hidden = true;
      mount.replaceChildren();
      return;
    }

    let currentComments = [];
    const replyState = {
      activeCommentId: null,
    };

    const focusReplyForm = (commentId) => {
      if (!commentId) {
        return;
      }

      const commentItems = Array.from(mount.querySelectorAll('[data-role="comment-item"]'))
        .filter((element) => element instanceof HTMLElement);
      const targetItem = commentItems.find((element) => element.dataset.commentId === commentId);
      if (!(targetItem instanceof HTMLElement)) {
        return;
      }

      const textarea = targetItem.querySelector('.zp-comment__reply-slot textarea[name="content"]');
      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
      }
    };

    const renderLoadedState = (options = {}) => {
      const {
        errors = [],
        successMessage = "",
        focusReplyCommentId = "",
      } = options;
      const shellFragment = createCommentsShellFragment(templates, {
        comments: currentComments,
        errors,
        successMessage,
        showForm: true,
        replyState,
      });
      if (!shellFragment) {
        mount.hidden = true;
        mount.replaceChildren();
        return;
      }

      mount.replaceChildren(shellFragment);
      mount.hidden = false;
      bindCommentInteractions();

      if (focusReplyCommentId) {
        queueMicrotask(() => {
          focusReplyForm(focusReplyCommentId);
        });
      }
    };

    const renderErrorState = (message) => {
      const shellFragment = createCommentsShellFragment(templates, {
        comments: [],
        errors: [message],
        showForm: false,
        showList: false,
      });
      if (!shellFragment) {
        mount.hidden = true;
        mount.replaceChildren();
        return;
      }

      mount.replaceChildren(shellFragment);
      mount.hidden = false;
    };

    const loadComments = async (options = {}) => {
      const response = await fetch(getCommentsEndpoint(publicId), {
        headers: {
          Accept: "application/json",
        },
      });
      const payload = await readJsonResponse(response);

      if (!response.ok || !payload?.ok) {
        renderErrorState(payload?.message || "Comments are temporarily unavailable.");
        return;
      }

      currentComments = Array.isArray(payload.comments) ? payload.comments : [];
      if (
        replyState.activeCommentId &&
        !currentComments.some((comment) => String(comment.id || "") === replyState.activeCommentId)
      ) {
        replyState.activeCommentId = null;
      }
      renderLoadedState({
        successMessage: options.successMessage || "",
      });
    };

    const bindCommentInteractions = () => {
      const replyButtons = Array.from(mount.querySelectorAll('[data-action="reply"]'))
        .filter((element) => element instanceof HTMLButtonElement);

      replyButtons.forEach((button) => {
        if (button.dataset.replyReady === "true") {
          return;
        }

        button.dataset.replyReady = "true";
        button.addEventListener("click", () => {
          const commentId = String(button.dataset.replyCommentId || "");
          if (!commentId) {
            return;
          }

          const isAlreadyOpen = replyState.activeCommentId === commentId;
          replyState.activeCommentId = isAlreadyOpen ? null : commentId;
          renderLoadedState({
            focusReplyCommentId: isAlreadyOpen ? "" : commentId,
          });
        });
      });

      const cancelButtons = Array.from(mount.querySelectorAll('[data-action="cancel-reply"]'))
        .filter((element) => element instanceof HTMLButtonElement);

      cancelButtons.forEach((button) => {
        if (button.dataset.cancelReplyReady === "true") {
          return;
        }

        button.dataset.cancelReplyReady = "true";
        button.addEventListener("click", () => {
          replyState.activeCommentId = null;
          renderLoadedState();
        });
      });

      const forms = Array.from(mount.querySelectorAll("[data-zp-comment-form]"))
        .filter((element) => element instanceof HTMLFormElement);

      forms.forEach((form) => {
        if (form.dataset.commentFormReady === "true") {
          return;
        }

        form.dataset.commentFormReady = "true";
        form.addEventListener("submit", async (event) => {
          event.preventDefault();

          const parentIdField = form.querySelector('[name="parent_id"]');
          const parentId = parentIdField instanceof HTMLInputElement ? parentIdField.value.trim() : "";

          const response = await fetch(getCommentsEndpoint(publicId), {
            method: "POST",
            headers: {
              Accept: "application/json",
            },
            body: new FormData(form),
          });
          const payload = await readJsonResponse(response);

          if (!response.ok || !payload?.ok) {
            replyState.activeCommentId = parentId || null;
            renderLoadedState({
              errors: Array.isArray(payload?.errors) && payload.errors.length > 0
                ? payload.errors
                : [payload?.message || "Something went wrong. Please try again."],
              focusReplyCommentId: parentId,
            });
            return;
          }

          replyState.activeCommentId = null;

          if (payload.requires_approval === false) {
            await loadComments({
              successMessage: payload.message || "Your comment has been posted.",
            });
            return;
          }

          renderLoadedState({
            successMessage: payload.message || "Your comment has been submitted and is awaiting moderation.",
          });
        });
      });
    };

    void loadComments();
  });
}

function initPostToc(root = document) {
  const mounts = Array.from(root.querySelectorAll("[data-zp-toc]"))
    .filter((element) => element instanceof HTMLElement)
    .filter((element) => element.dataset.tocReady !== "true");

  if (mounts.length === 0) {
    return;
  }

  mounts.forEach((mount, index) => {
    mount.dataset.tocReady = "true";
    const articleRoot = mount.closest(".content-grid") || root;
    const articleContent = articleRoot.querySelector(".article-content");

    if (!(articleContent instanceof HTMLElement)) {
      return;
    }

    const headings = Array.from(articleContent.querySelectorAll("h2, h3, h4"))
      .filter((heading) => heading instanceof HTMLElement)
      .map((heading) => ({
        element: heading,
        text: heading.textContent ? heading.textContent.trim() : "",
      }))
      .filter((entry) => entry.text.length > 0);

    if (headings.length === 0) {
      mount.hidden = true;
      mount.replaceChildren();
      return;
    }

    const usedIds = new Set();
    const items = headings.map((entry, itemIndex) => {
      const heading = entry.element;
      const level = Number.parseInt(heading.tagName.slice(1), 10);
      const depth = Number.isInteger(level) ? Math.max(0, level - 2) : 0;
      let id = heading.id ? heading.id.trim() : "";

      if (!id || usedIds.has(id)) {
        const baseId = slugifyHeadingText(entry.text) || `section-${index + 1}-${itemIndex + 1}`;
        id = baseId;
        let suffix = 2;
        while (usedIds.has(id)) {
          id = `${baseId}-${suffix}`;
          suffix += 1;
        }
        heading.id = id;
      }

      usedIds.add(id);
      return {
        id,
        text: entry.text,
        level,
        depth,
      };
    });

    const kicker = document.createElement("p");
    kicker.className = "section-kicker";
    kicker.textContent = "On this page";

    const title = document.createElement("h2");
    title.textContent = "Contents";

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Table of contents");

    const list = document.createElement("ol");
    list.className = "post-toc__list";

    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.className = `post-toc__item post-toc__item--depth-${item.depth}`;

      const link = document.createElement("a");
      link.className = `post-toc__link post-toc__link--level-${item.level}`;
      link.href = `#${item.id}`;
      link.textContent = item.text;

      listItem.append(link);
      list.append(listItem);
    });

    nav.append(list);
    mount.replaceChildren(kicker, title, nav);
    mount.hidden = false;

    // Scroll-spy: highlight the active section (mirrors React useActiveSection)
    const links = Array.from(mount.querySelectorAll(".post-toc__link"));
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((el) => el instanceof HTMLElement);

    if (targets.length === 0) return;

    const visible = new Map();
    const setActive = (id) => {
      links.forEach((link) => {
        const href = link.getAttribute("href") || "";
        link.classList.toggle("is-active", href === `#${id}`);
      });
    };

    const sectionOrder = items.map((i) => i.id);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        });
        if (visible.size > 0) {
          const topMost = sectionOrder.find((id) => visible.has(id));
          if (topMost) setActive(topMost);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    targets.forEach((el) => observer.observe(el));
    setActive(sectionOrder[0]);
  });
}

function initArticleContentLinks(root = document) {
  root.querySelectorAll(".article-content a[href]").forEach((link) => {
    if (link.dataset.articleLinkReady === "true") {
      return;
    }

    link.dataset.articleLinkReady = "true";

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) {
      return;
    }

    const targetUrl = new URL(href, window.location.href);
    if (targetUrl.origin !== window.location.origin) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noreferrer noopener");
    }
  });
}

function applyPageEnhancements(root = document) {
  updateFeaturedPosts(root);
  initSearch(root);
  initNewsletterForm(root);
  initComments(root);
  initPostToc(root);
  initArticleContentLinks(root);
  initNavigationState();
}

function saveScrollPosition() {
  history.replaceState(
    {
      ...(history.state || {}),
      __softNavigation: true,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
    "",
    window.location.href,
  );
}

function scheduleScrollPositionSave() {
  if (scrollSaveFrame) {
    return;
  }

  scrollSaveFrame = window.requestAnimationFrame(() => {
    scrollSaveFrame = 0;
    saveScrollPosition();
  });
}

function isPersistentHeadNode(node) {
  return node instanceof Element && HEAD_PERSISTENT_SELECTORS.some((selector) => node.matches(selector));
}

function isStylesheetHeadNode(node) {
  return node instanceof HTMLLinkElement && node.rel === "stylesheet";
}

function getStylesheetKey(node) {
  if (!(node instanceof HTMLLinkElement)) {
    return "";
  }

  return new URL(node.href, window.location.href).href;
}

function syncHead(nextDocument) {
  document.title = nextDocument.title;

  const currentNodes = Array.from(document.head.childNodes);
  const nextNodes = Array.from(nextDocument.head.childNodes).filter((node) => {
    return !(node instanceof HTMLTitleElement) && !isPersistentHeadNode(node);
  });

  const nextStylesheetKeys = new Set();

  nextNodes.forEach((node) => {
    if (!isStylesheetHeadNode(node)) {
      return;
    }

    const stylesheetKey = getStylesheetKey(node);
    if (stylesheetKey) {
      nextStylesheetKeys.add(stylesheetKey);
    }

    const hasMatchingStylesheet = currentNodes.some((currentNode) => {
      return isStylesheetHeadNode(currentNode) && getStylesheetKey(currentNode) === stylesheetKey;
    });

    if (!hasMatchingStylesheet) {
      document.head.append(node.cloneNode(true));
    }
  });

  currentNodes.forEach((node) => {
    if (isPersistentHeadNode(node)) {
      return;
    }

    if (isStylesheetHeadNode(node)) {
      const stylesheetKey = getStylesheetKey(node);
      if (stylesheetKey && nextStylesheetKeys.has(stylesheetKey)) {
        return;
      }
    }

    node.remove();
  });

  nextNodes.forEach((node) => {
    if (isStylesheetHeadNode(node)) {
      return;
    }

    document.head.append(node.cloneNode(true));
  });
}

function syncDocumentShell(nextDocument) {
  document.documentElement.lang = nextDocument.documentElement.lang || document.documentElement.lang;
  document.body.className = nextDocument.body.className;
}

function resolveScriptSrc(script) {
  const src = script.getAttribute("src");
  if (!src) {
    return "";
  }

  return new URL(src, window.location.href).href;
}

function copyScriptAttributes(from, to) {
  Array.from(from.attributes).forEach((attribute) => {
    to.setAttribute(attribute.name, attribute.value);
  });
}

function ensureExternalScript(script) {
  const absoluteSrc = resolveScriptSrc(script);
  if (!absoluteSrc || loadedExternalScripts.has(absoluteSrc)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const nextScript = document.createElement("script");
    copyScriptAttributes(script, nextScript);

    nextScript.addEventListener("load", () => {
      loadedExternalScripts.add(absoluteSrc);
      resolve();
    }, { once: true });
    nextScript.addEventListener("error", () => {
      reject(new Error(`Failed to load script: ${absoluteSrc}`));
    }, { once: true });

    document.body.append(nextScript);
  });
}

async function syncGlobalBodyScripts(nextDocument) {
  const nextMain = nextDocument.querySelector("#content");
  const globalScripts = Array.from(nextDocument.body.querySelectorAll("script[src]"))
    .filter((script) => !nextMain || !nextMain.contains(script));

  for (const script of globalScripts) {
    await ensureExternalScript(script);
  }
}

async function executeScriptsInRoot(root) {
  const scripts = Array.from(root.querySelectorAll("script"));

  for (const script of scripts) {
    if (!(script instanceof HTMLScriptElement)) {
      continue;
    }

    const replacement = document.createElement("script");
    copyScriptAttributes(script, replacement);

    if (script.src) {
      const absoluteSrc = resolveScriptSrc(script);
      if (absoluteSrc && loadedExternalScripts.has(absoluteSrc)) {
        script.remove();
        continue;
      }

      const loadPromise = new Promise((resolve, reject) => {
        replacement.addEventListener("load", () => {
          if (absoluteSrc) {
            loadedExternalScripts.add(absoluteSrc);
          }
          resolve();
        }, { once: true });
        replacement.addEventListener("error", () => {
          reject(new Error(`Failed to load script: ${absoluteSrc}`));
        }, { once: true });
      });

      script.replaceWith(replacement);
      await loadPromise;
      continue;
    }

    replacement.textContent = script.textContent;
    script.replaceWith(replacement);
  }
}

function shouldSoftNavigateTo(targetUrl) {
  if (!/^https?:$/.test(targetUrl.protocol)) {
    return false;
  }

  if (targetUrl.origin !== window.location.origin) {
    return false;
  }

  if (SOFT_NAVIGATION_SKIP_PATTERN.test(targetUrl.pathname)) {
    return false;
  }

  return true;
}

function shouldHandleLinkClick(link, event) {
  if (
    event.defaultPrevented
    || event.button !== 0
    || event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
  ) {
    return false;
  }

  if (link.target && link.target !== "_self") {
    return false;
  }

  if (link.hasAttribute("download") || link.dataset.noSoftNav === "true") {
    return false;
  }

  const href = link.getAttribute("href");
  if (!href || href.startsWith("#")) {
    return false;
  }

  const targetUrl = new URL(link.href, window.location.href);
  if (
    targetUrl.pathname === window.location.pathname
    && targetUrl.search === window.location.search
    && targetUrl.hash
  ) {
    return false;
  }

  return shouldSoftNavigateTo(targetUrl);
}

async function fetchDocument(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Expected HTML response, received ${contentType || "unknown content type"}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const nextDocument = parser.parseFromString(html, "text/html");
  const nextUrl = new URL(response.url || url, window.location.href);

  return {
    response,
    nextDocument,
    nextUrl,
  };
}

async function replaceMainContent(nextDocument) {
  const currentMain = document.querySelector("#content");
  const nextMain = nextDocument.querySelector("#content");

  if (!(currentMain instanceof HTMLElement) || !(nextMain instanceof HTMLElement)) {
    throw new Error("Soft navigation requires #content in both the current and next document");
  }

  const replacement = nextMain.cloneNode(true);

  const swap = () => {
    currentMain.replaceWith(replacement);
  };

  if ("startViewTransition" in document && !prefersReducedMotion()) {
    await document.startViewTransition(swap).finished;
  } else {
    swap();
  }

  return replacement;
}

function restoreScrollPosition(url, state) {
  if (url.hash) {
    const target = document.getElementById(url.hash.slice(1))
      || document.querySelector(`[name="${CSS.escape(url.hash.slice(1))}"]`);

    if (target instanceof HTMLElement) {
      target.scrollIntoView();
      return;
    }
  }

  if (state && Number.isFinite(state.scrollX) && Number.isFinite(state.scrollY)) {
    window.scrollTo(state.scrollX, state.scrollY);
    return;
  }

  window.scrollTo(0, 0);
}

async function hydrateDynamicContent(root, nextDocument) {
  await syncGlobalBodyScripts(nextDocument);
  await executeScriptsInRoot(root);
}

async function navigateTo(url, options = {}) {
  if (activeNavigationController) {
    activeNavigationController.abort();
  }

  const controller = new AbortController();
  activeNavigationController = controller;
  document.documentElement.classList.add("is-soft-navigating");

  try {
    const { nextDocument, nextUrl } = await fetchDocument(url, controller.signal);

    if (controller.signal.aborted) {
      return;
    }

    syncHead(nextDocument);
    syncDocumentShell(nextDocument);

    const nextMain = await replaceMainContent(nextDocument);
    await hydrateDynamicContent(nextMain, nextDocument);
    hideAllSearchResults();
    applyPageEnhancements(nextMain);

    if (options.historyMode === "push") {
      history.pushState(
        {
          __softNavigation: true,
          scrollX: 0,
          scrollY: 0,
        },
        "",
        nextUrl.href,
      );
    } else if (options.historyMode === "replace") {
      history.replaceState(
        {
          ...(options.state || {}),
          __softNavigation: true,
        },
        "",
        nextUrl.href,
      );
    }

    restoreScrollPosition(nextUrl, options.restoreState);
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }

    console.error("Soft navigation failed, falling back to full navigation:", error);
    window.location.href = url.toString();
  } finally {
    if (activeNavigationController === controller) {
      activeNavigationController = undefined;
    }

    document.documentElement.classList.remove("is-soft-navigating");
  }
}

function initSoftNavigation() {
  if (document.body.dataset.softNavigationReady === "true") {
    return;
  }

  document.body.dataset.softNavigationReady = "true";
  saveScrollPosition();

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const link = target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement) || !shouldHandleLinkClick(link, event)) {
      return;
    }

    event.preventDefault();
    saveScrollPosition();
    void navigateTo(link.href, { historyMode: "push" });
  });

  window.addEventListener("popstate", (event) => {
    if (!shouldSoftNavigateTo(new URL(window.location.href))) {
      return;
    }

    void navigateTo(window.location.href, {
      historyMode: "replace",
      restoreState: event.state,
      state: event.state,
    });
  });

  window.addEventListener("scroll", scheduleScrollPositionSave, { passive: true });
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  applyPageEnhancements(document);
  initSoftNavigation();
});
