const library = window.BIBLE_LIBRARY || { books: [] };
const DEFAULT_AUTHOR = "李朝辉";

const BOOK_META = {
  genesis: {
    coverTitle: "创世记——从圣经神学视角解读",
    author: DEFAULT_AUTHOR,
    description: "神的救赎计划，从创世记开始展开。"
  },
  "1corinthians": {
    coverTitle: "哥林多前书",
    author: DEFAULT_AUTHOR,
    description: "在十字架、教会合一、恩赐与复活盼望中重建属灵生命。"
  },
  esther: {
    coverTitle: "以斯帖记",
    author: DEFAULT_AUTHOR,
    description: "在隐藏的护理中看见神掌管历史，并呼召百姓承担使命。"
  }
};

const storageKeys = {
  theme: "bibleLibraryTheme",
  favorites: "bibleLibraryFavorites",
  fontSize: "bibleLibraryFontSize",
  readerWidth: "bibleLibraryReaderWidth"
};

const elements = {
  contentView: document.getElementById("contentView"),
  searchInput: document.getElementById("searchInput"),
  themeToggle: document.getElementById("themeToggle"),
  increaseFont: document.getElementById("increaseFont"),
  decreaseFont: document.getElementById("decreaseFont"),
  year: document.getElementById("year")
};

const state = {
  query: "",
  favorites: new Set(JSON.parse(localStorage.getItem(storageKeys.favorites) || "[]")),
  fontSize: Number(localStorage.getItem(storageKeys.fontSize)) || 18,
  readerWidth: Number(localStorage.getItem(storageKeys.readerWidth)) || 820
};

function getBook(bookId) {
  return library.books.find((book) => book.id === bookId);
}

function getBookMeta(book) {
  return BOOK_META[book?.id] || {
    coverTitle: book?.name || "圣经",
    author: DEFAULT_AUTHOR,
    description: "长期维护的圣经讲章资料库。"
  };
}

function getChapter(book, chapterNumber) {
  return book?.chapters.find((chapter) => chapter.number === Number(chapterNumber));
}

function getAllSermons() {
  return library.books.flatMap((book) =>
    book.chapters.flatMap((chapter) =>
      chapter.sermons.map((sermon, index) => ({
        book,
        chapter,
        sermon: {
          ...sermon,
          author: sermon.author || getBookMeta(book).author,
          keywords: sermon.keywords || []
        },
        index
      }))
    )
  );
}

function getSermonContext(sermonId) {
  return getAllSermons().find((item) => item.sermon.id === sermonId);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
}

function highlightHtml(html) {
  const query = state.query.trim();
  if (!query) return html;
  return html.replace(new RegExp(`(${escapeRegExp(query)})`, "gi"), '<mark class="highlight">$1</mark>');
}

function saveFavorites() {
  localStorage.setItem(storageKeys.favorites, JSON.stringify([...state.favorites]));
}

function getReadingMinutes(sermon) {
  const text = sermon.text || stripHtml(sermon.content || "");
  return Math.max(1, Math.ceil(text.length / 500));
}

function formatDate(value) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function getUpdatedDate(sermon) {
  return sermon.updatedAt || sermon.modifiedAt || library.generatedAt;
}

function setTitle(parts = []) {
  const suffix = parts.filter(Boolean).join("｜") || "正式版";
  document.title = `圣经讲章资料库｜${suffix}`;
}

function setHash(hash) {
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  } else {
    render();
  }
}

function getRoute() {
  const hash = decodeURIComponent(window.location.hash || "#/");
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return { view: "home" };
  if (parts[0] === "book" && parts[1] && parts[2] === "chapter" && parts[3]) {
    return { view: "chapter", bookId: parts[1], chapterNumber: Number(parts[3]) };
  }
  if (parts[0] === "book" && parts[1]) {
    return { view: "book", bookId: parts[1] };
  }
  if (parts[0] === "sermon" && parts[1]) {
    return { view: "sermon", sermonId: parts[1] };
  }
  return { view: "home" };
}

function renderBreadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="当前位置">${items.map((item) => (
    item.href ? `<a href="${item.href}">${escapeHtml(item.label)}</a>` : `<span>${escapeHtml(item.label)}</span>`
  )).join("<span>/</span>")}</nav>`;
}

function renderHome() {
  setTitle(["正式版"]);
  const books = library.books.map((book) => {
    const chapterCount = book.chapters.filter((chapter) => chapter.sermons.length).length;
    const sermonCount = book.chapters.reduce((sum, chapter) => sum + chapter.sermons.length, 0);
    const meta = getBookMeta(book);
    return `
      <button class="book-card" type="button" data-book-id="${book.id}">
        <span class="card-title">${escapeHtml(book.name)}</span>
        <span>${escapeHtml(meta.description)}</span>
        <span class="count-pill">${chapterCount}章 / ${sermonCount}篇</span>
      </button>
    `;
  }).join("");

  elements.contentView.innerHTML = `
    <section class="hero">
      <h1>圣经讲章资料库</h1>
      <p>按书卷、章节和讲章整理的长期资料库。</p>
    </section>
    <section class="grid-list">${books}</section>
  `;

  elements.contentView.querySelectorAll("[data-book-id]").forEach((button) => {
    button.addEventListener("click", () => setHash(`#/book/${button.dataset.bookId}`));
  });
}

function renderBook(bookId) {
  const book = getBook(bookId);
  if (!book) return renderHome();
  const meta = getBookMeta(book);
  setTitle([meta.coverTitle]);

  const chapters = book.chapters.map((chapter) => `
    <button class="chapter-card" type="button" data-chapter-number="${chapter.number}">
      <span class="card-title">第${String(chapter.number).padStart(2, "0")}章</span>
      <span class="count-pill">${chapter.sermons.length}篇讲章</span>
    </button>
  `).join("");

  elements.contentView.innerHTML = `
    ${renderBreadcrumb([{ label: "首页", href: "#/" }, { label: book.name }])}
    <section class="book-cover">
      <h1>${escapeHtml(meta.coverTitle)}</h1>
      <p class="author">作者：${escapeHtml(meta.author)}</p>
      <p>${escapeHtml(meta.description)}</p>
    </section>
    <section class="section-heading">
      <h1>章节列表</h1>
      <p>选择章节后，再查看该章所有讲章标题。</p>
    </section>
    <section class="grid-list">${chapters}</section>
  `;

  elements.contentView.querySelectorAll("[data-chapter-number]").forEach((button) => {
    button.addEventListener("click", () => setHash(`#/book/${book.id}/chapter/${button.dataset.chapterNumber}`));
  });
}

function renderChapter(bookId, chapterNumber) {
  const book = getBook(bookId);
  const chapter = getChapter(book, chapterNumber);
  if (!book || !chapter) return renderHome();
  const meta = getBookMeta(book);
  setTitle([book.name, `第${chapter.number}章`]);

  const sermons = chapter.sermons.map((sermon, index) => `
    <button class="sermon-card" type="button" data-sermon-id="${sermon.id}">
      <span class="sermon-number">${index + 1}</span>
      <span class="card-title">${escapeHtml(sermon.title)}</span>
      <span class="source-note">作者：${escapeHtml(sermon.author || meta.author)} · 阅读约 ${getReadingMinutes(sermon)} 分钟</span>
    </button>
  `).join("");

  elements.contentView.innerHTML = `
    ${renderBreadcrumb([
      { label: "首页", href: "#/" },
      { label: book.name, href: `#/book/${book.id}` },
      { label: `第${chapter.number}章` }
    ])}
    <section class="section-heading">
      <h1>${escapeHtml(book.name)}第${chapter.number}章</h1>
      <p>共${chapter.sermons.length}篇讲章</p>
    </section>
    <section class="sermon-list">
      ${sermons || '<p class="empty-state">本章暂未导入讲章。</p>'}
    </section>
  `;

  elements.contentView.querySelectorAll("[data-sermon-id]").forEach((button) => {
    button.addEventListener("click", () => setHash(`#/sermon/${button.dataset.sermonId}`));
  });
}

function renderSermon(sermonId) {
  const context = getSermonContext(sermonId);
  if (!context) return renderHome();
  const { book, chapter, sermon } = context;
  const allSermons = getAllSermons();
  const globalIndex = allSermons.findIndex((item) => item.sermon.id === sermon.id);
  const previous = allSermons[globalIndex - 1];
  const next = allSermons[globalIndex + 1];
  const isFavorite = state.favorites.has(sermon.id);
  setTitle([book.name, `第${chapter.number}章`, sermon.title]);

  elements.contentView.innerHTML = `
    <article class="sermon-view">
      <div class="sermon-inner">
        ${renderBreadcrumb([
          { label: "首页", href: "#/" },
          { label: book.name, href: `#/book/${book.id}` },
          { label: `第${chapter.number}章`, href: `#/book/${book.id}/chapter/${chapter.number}` },
          { label: sermon.title }
        ])}
        <header class="sermon-title-block">
          <div class="chapter-name">${escapeHtml(book.name)}第${chapter.number}章</div>
          <h1>${escapeHtml(sermon.title)}</h1>
          <div class="sermon-meta">
            <span>作者：${escapeHtml(sermon.author || DEFAULT_AUTHOR)}</span>
            <span>${isFavorite ? "收藏★" : "收藏☆"}</span>
            <span>阅读约 ${getReadingMinutes(sermon)} 分钟</span>
            <span>最后更新：${formatDate(getUpdatedDate(sermon))}</span>
          </div>
        </header>

        <div class="sermon-controls">
          <button class="action-button" type="button" data-action="back">返回本章讲章列表</button>
          <button class="action-button ${isFavorite ? "active" : ""}" type="button" data-action="favorite">${isFavorite ? "取消收藏 ★" : "收藏 ☆"}</button>
          <button class="action-button" type="button" data-action="share">分享本篇链接</button>
          <button class="action-button" type="button" data-action="narrow">窄版</button>
          <button class="action-button" type="button" data-action="wide">宽版</button>
          <span class="share-status" id="shareStatus"></span>
        </div>

        <div class="sermon-nav">
          <button class="action-button" type="button" data-action="previous" ${previous ? "" : "disabled"}>上一篇</button>
          <button class="action-button" type="button" data-action="next" ${next ? "" : "disabled"}>下一篇</button>
        </div>

        <div class="sermon-content">${highlightHtml(sermon.content)}</div>
      </div>
    </article>
  `;

  elements.contentView.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleSermonAction(button.dataset.action, context, previous, next));
  });
}

function renderSearch() {
  const query = state.query.trim().toLowerCase();
  const matches = getAllSermons().filter(({ book, chapter, sermon }) => {
    const meta = getBookMeta(book);
    const haystack = [
      book.name,
      book.shortName || "",
      meta.coverTitle,
      chapter.label,
      `第${chapter.number}章`,
      sermon.title,
      sermon.author,
      (sermon.keywords || []).join(" "),
      sermon.text || "",
      stripHtml(sermon.content || "")
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
  setTitle([`搜索：${state.query}`]);

  elements.contentView.innerHTML = `
    ${renderBreadcrumb([{ label: "首页", href: "#/" }, { label: "搜索结果" }])}
    <section class="search-heading">
      <h1>搜索结果</h1>
      <p>“${escapeHtml(state.query)}” 共找到 ${matches.length} 篇讲章</p>
    </section>
    <section class="result-list">
      ${matches.map(({ book, chapter, sermon }) => `
        <button class="result-card" type="button" data-sermon-id="${sermon.id}">
          <span class="sermon-number">${String(chapter.number).padStart(2, "0")}</span>
          <span class="card-title">${escapeHtml(sermon.title)}</span>
          <span class="source-note">${escapeHtml(book.name)} 第${chapter.number}章 · 作者：${escapeHtml(sermon.author || DEFAULT_AUTHOR)}</span>
          <span class="result-excerpt">${escapeHtml((sermon.text || stripHtml(sermon.content || "")).slice(0, 140))}...</span>
        </button>
      `).join("") || '<p class="empty-state">没有找到匹配内容。</p>'}
    </section>
  `;

  elements.contentView.querySelectorAll("[data-sermon-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.query = "";
      elements.searchInput.value = "";
      setHash(`#/sermon/${button.dataset.sermonId}`);
    });
  });
}

async function handleSermonAction(action, context, previous, next) {
  if (action === "back") {
    setHash(`#/book/${context.book.id}/chapter/${context.chapter.number}`);
    return;
  }
  if (action === "favorite") {
    if (state.favorites.has(context.sermon.id)) state.favorites.delete(context.sermon.id);
    else state.favorites.add(context.sermon.id);
    saveFavorites();
    render();
    return;
  }
  if (action === "share") {
    const url = `${window.location.origin}${window.location.pathname}#/sermon/${context.sermon.id}`;
    const status = document.getElementById("shareStatus");
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "链接已复制";
    } catch {
      status.textContent = url;
    }
    return;
  }
  if (action === "previous" && previous) {
    setHash(`#/sermon/${previous.sermon.id}`);
    return;
  }
  if (action === "next" && next) {
    setHash(`#/sermon/${next.sermon.id}`);
    return;
  }
  if (action === "narrow") {
    state.readerWidth = 740;
    localStorage.setItem(storageKeys.readerWidth, String(state.readerWidth));
    applyReaderSettings();
  }
  if (action === "wide") {
    state.readerWidth = 920;
    localStorage.setItem(storageKeys.readerWidth, String(state.readerWidth));
    applyReaderSettings();
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  elements.themeToggle.textContent = isDark ? "日" : "月";
  elements.themeToggle.title = isDark ? "切换日间模式" : "切换夜间模式";
  localStorage.setItem(storageKeys.theme, theme);
}

function applyReaderSettings() {
  document.documentElement.style.setProperty("--reader-font-size", `${state.fontSize}px`);
  document.documentElement.style.setProperty("--reader-width", `${state.readerWidth}px`);
}

function changeFont(delta) {
  state.fontSize = Math.min(24, Math.max(15, state.fontSize + delta));
  localStorage.setItem(storageKeys.fontSize, String(state.fontSize));
  applyReaderSettings();
}

function render() {
  if (state.query.trim()) {
    renderSearch();
    return;
  }
  const route = getRoute();
  if (route.view === "book") return renderBook(route.bookId);
  if (route.view === "chapter") return renderChapter(route.bookId, route.chapterNumber);
  if (route.view === "sermon") return renderSermon(route.sermonId);
  return renderHome();
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

elements.themeToggle.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

elements.increaseFont.addEventListener("click", () => changeFont(1));
elements.decreaseFont.addEventListener("click", () => changeFont(-1));
window.addEventListener("hashchange", render);
document.addEventListener("contextmenu", (event) => {
  if (event.target.closest(".sermon-content")) event.preventDefault();
});
document.addEventListener("copy", (event) => {
  if (event.target.closest && event.target.closest(".sermon-content")) event.preventDefault();
});

document.body.classList.add("protect-copy");
elements.year.textContent = new Date().getFullYear();
applyReaderSettings();
applyTheme(localStorage.getItem(storageKeys.theme) || "light");
render();