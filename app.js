const library = window.BIBLE_LIBRARY || { books: [] };

const DEFAULT_AUTHOR = "李朝辉";
const BOOK_META = {
  genesis: {
    coverTitle: "创世记——从圣经神学视角解读",
    author: DEFAULT_AUTHOR,
    description: "神的救赎计划，从创世记开始展开。"
  }
};

const storageKeys = {
  theme: "bibleLibraryTheme",
  favorites: "bibleLibraryFavorites",
  current: "bibleLibraryCurrent",
  fontSize: "bibleLibraryFontSize",
  readerWidth: "bibleLibraryReaderWidth"
};

const elements = {
  bookCover: document.getElementById("bookCover"),
  bookList: document.getElementById("bookList"),
  chapterList: document.getElementById("chapterList"),
  chapterTotal: document.getElementById("chapterTotal"),
  contentView: document.getElementById("contentView"),
  searchInput: document.getElementById("searchInput"),
  themeToggle: document.getElementById("themeToggle"),
  increaseFont: document.getElementById("increaseFont"),
  decreaseFont: document.getElementById("decreaseFont")
};

const savedCurrent = JSON.parse(localStorage.getItem(storageKeys.current) || "{}");
const state = {
  bookId: savedCurrent.bookId || library.books[0]?.id || "",
  chapterNumber: Number(savedCurrent.chapterNumber) || 1,
  sermonId: savedCurrent.sermonId || "",
  view: savedCurrent.sermonId ? "sermon" : "chapter",
  query: "",
  favorites: new Set(JSON.parse(localStorage.getItem(storageKeys.favorites) || "[]")),
  fontSize: Number(localStorage.getItem(storageKeys.fontSize)) || 18,
  readerWidth: Number(localStorage.getItem(storageKeys.readerWidth)) || 820
};

function getBook(bookId = state.bookId) {
  return library.books.find((book) => book.id === bookId) || library.books[0];
}

function getBookMeta(book = getBook()) {
  return BOOK_META[book?.id] || {
    coverTitle: book?.name || "圣经",
    author: DEFAULT_AUTHOR,
    description: "长期维护的圣经讲章资料库。"
  };
}

function getChapter(bookId = state.bookId, chapterNumber = state.chapterNumber) {
  const book = getBook(bookId);
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

function getCurrentSermonContext() {
  return getAllSermons().find((item) => item.sermon.id === state.sermonId);
}

function saveCurrent() {
  localStorage.setItem(storageKeys.current, JSON.stringify({
    bookId: state.bookId,
    chapterNumber: state.chapterNumber,
    sermonId: state.sermonId
  }));
}

function saveFavorites() {
  localStorage.setItem(storageKeys.favorites, JSON.stringify([...state.favorites]));
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightHtml(html) {
  const query = state.query.trim();
  if (!query) return html;
  return html.replace(new RegExp(`(${escapeRegExp(query)})`, "gi"), '<mark class="highlight">$1</mark>');
}

function getBookChapterTitle(book, chapter) {
  return `${book.name}第${chapter.number}章`;
}

function getReadingMinutes(sermon) {
  const text = sermon.text || stripHtml(sermon.content || "");
  return Math.max(1, Math.ceil(text.length / 500));
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || div.innerText || "";
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

function setDocumentTitle(parts = []) {
  const book = getBook();
  const meta = getBookMeta(book);
  const suffix = meta.coverTitle || book?.name || "";
  const prefix = parts.filter(Boolean).join("｜");
  document.title = prefix ? `圣经讲章资料库｜${prefix}` : `圣经讲章资料库｜${suffix}`;
}

function renderBookCover() {
  const book = getBook();
  const meta = getBookMeta(book);
  elements.bookCover.innerHTML = `
    <p class="eyebrow">书卷封面</p>
    <h2>${escapeHtml(meta.coverTitle)}</h2>
    <p class="author">作者：${escapeHtml(meta.author)}</p>
    <p class="description">${escapeHtml(meta.description)}</p>
  `;
}

function renderBooks() {
  elements.bookList.innerHTML = "";

  library.books.forEach((book) => {
    const sermonCount = book.chapters.reduce((sum, chapter) => sum + chapter.sermons.length, 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "book-button";
    button.classList.toggle("active", book.id === state.bookId);
    button.innerHTML = `<span>${escapeHtml(book.name)}</span><span class="count">${sermonCount}</span>`;
    button.addEventListener("click", () => {
      state.bookId = book.id;
      state.chapterNumber = book.chapters[0]?.number || 1;
      state.sermonId = "";
      state.view = "chapter";
      state.query = "";
      elements.searchInput.value = "";
      saveCurrent();
      render();
    });
    elements.bookList.appendChild(button);
  });
}

function renderChapters() {
  const book = getBook();
  elements.chapterList.innerHTML = "";
  elements.chapterTotal.textContent = `${book?.chapters.length || 0}章`;

  book?.chapters.forEach((chapter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chapter-button";
    button.classList.toggle("active", chapter.number === state.chapterNumber);
    button.innerHTML = `<span>第${String(chapter.number).padStart(2, "0")}章</span><span class="count">（${chapter.sermons.length}）</span>`;
    button.addEventListener("click", () => {
      state.chapterNumber = chapter.number;
      state.sermonId = "";
      state.view = "chapter";
      state.query = "";
      elements.searchInput.value = "";
      saveCurrent();
      render();
    });
    elements.chapterList.appendChild(button);
  });
}

function renderChapterView() {
  const book = getBook();
  const chapter = getChapter();
  if (!book || !chapter) {
    elements.contentView.innerHTML = '<p class="empty-state">未找到章节。</p>';
    return;
  }

  setDocumentTitle([getBookMeta(book).coverTitle, `第${chapter.number}章`]);
  const sermonItems = chapter.sermons.map((sermon, index) => `
    <button class="sermon-card" type="button" data-sermon-id="${sermon.id}">
      <span class="sermon-number">${index + 1}</span>
      <span class="sermon-card-title">${escapeHtml(sermon.title)}</span>
      <span class="source-note">作者：${escapeHtml(sermon.author || getBookMeta(book).author)} · 阅读约 ${getReadingMinutes(sermon)} 分钟</span>
    </button>
  `).join("");

  elements.contentView.innerHTML = `
    <div class="breadcrumb">圣经 / ${escapeHtml(book.name)}</div>
    <div class="chapter-heading">
      <h2>${escapeHtml(getBookChapterTitle(book, chapter))}</h2>
      <p class="meta-line">共${chapter.sermons.length}篇讲章</p>
    </div>
    <div class="sermon-list">
      ${sermonItems || '<p class="empty-state">本章暂未导入讲章。</p>'}
    </div>
  `;

  elements.contentView.querySelectorAll("[data-sermon-id]").forEach((button) => {
    button.addEventListener("click", () => openSermon(button.dataset.sermonId));
  });
}

function renderSermonView() {
  const context = getCurrentSermonContext();
  if (!context) {
    state.sermonId = "";
    state.view = "chapter";
    renderChapterView();
    return;
  }

  const allSermons = getAllSermons();
  const globalIndex = allSermons.findIndex((item) => item.sermon.id === context.sermon.id);
  const previous = allSermons[globalIndex - 1];
  const next = allSermons[globalIndex + 1];
  const isFavorite = state.favorites.has(context.sermon.id);
  const updatedDate = formatDate(getUpdatedDate(context.sermon));

  document.documentElement.style.setProperty("--reader-font-size", `${state.fontSize}px`);
  document.documentElement.style.setProperty("--reader-width", `${state.readerWidth}px`);
  setDocumentTitle([context.book.name, `第${context.chapter.number}章`, context.sermon.title]);

  elements.contentView.innerHTML = `
    <article class="sermon-view">
      <div class="sermon-inner">
        <div class="breadcrumb">圣经 / ${escapeHtml(context.book.name)} / 第${String(context.chapter.number).padStart(2, "0")}章</div>
        <header class="sermon-title-block">
          <div class="chapter-name">${escapeHtml(getBookChapterTitle(context.book, context.chapter))}</div>
          <h2>${escapeHtml(context.sermon.title)}</h2>
          <div class="sermon-meta">
            <span>作者：${escapeHtml(context.sermon.author)}</span>
            <span>${isFavorite ? "收藏★" : "收藏☆"}</span>
            <span>阅读约 ${getReadingMinutes(context.sermon)} 分钟</span>
            <span>最后更新：${updatedDate}</span>
          </div>
        </header>

        <div class="sermon-controls">
          <button class="action-button" type="button" data-action="back">返回章节列表</button>
          <button class="action-button ${isFavorite ? "active" : ""}" type="button" data-action="favorite">${isFavorite ? "取消收藏 ★" : "收藏 ☆"}</button>
          <button class="action-button" type="button" data-action="narrow">窄版</button>
          <button class="action-button" type="button" data-action="wide">宽版</button>
        </div>

        <div class="sermon-nav">
          <button class="action-button" type="button" data-action="previous" ${previous ? "" : "disabled"}>上一篇</button>
          <button class="action-button" type="button" data-action="next" ${next ? "" : "disabled"}>下一篇</button>
        </div>

        <div class="sermon-content">${highlightHtml(context.sermon.content)}</div>
      </div>
    </article>
  `;

  elements.contentView.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleSermonAction(button.dataset.action, previous, next));
  });
}

function renderSearchView() {
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

  setDocumentTitle([`搜索：${state.query}`]);
  elements.contentView.innerHTML = `
    <div class="search-heading">
      <h2>搜索结果</h2>
      <p class="meta-line">“${escapeHtml(state.query)}” 共找到 ${matches.length} 篇讲章</p>
    </div>
    <div class="result-list">
      ${matches.map(({ book, chapter, sermon }) => `
        <button class="result-card" type="button" data-sermon-id="${sermon.id}">
          <span class="sermon-number">${String(chapter.number).padStart(2, "0")}</span>
          <span class="result-card-title">${escapeHtml(sermon.title)}</span>
          <span class="source-note">${escapeHtml(book.name)} 第${chapter.number}章 · 作者：${escapeHtml(sermon.author)}</span>
          <span class="result-excerpt">${escapeHtml((sermon.text || stripHtml(sermon.content || "")).slice(0, 140))}...</span>
        </button>
      `).join("") || '<p class="empty-state">没有找到匹配内容。</p>'}
    </div>
  `;

  elements.contentView.querySelectorAll("[data-sermon-id]").forEach((button) => {
    button.addEventListener("click", () => openSermon(button.dataset.sermonId));
  });
}

function handleSermonAction(action, previous, next) {
  if (action === "back") {
    state.sermonId = "";
    state.view = "chapter";
  }

  if (action === "favorite") {
    if (state.favorites.has(state.sermonId)) {
      state.favorites.delete(state.sermonId);
    } else {
      state.favorites.add(state.sermonId);
    }
    saveFavorites();
  }

  if (action === "previous" && previous) setSermonContext(previous);
  if (action === "next" && next) setSermonContext(next);

  if (action === "narrow") {
    state.readerWidth = 740;
    localStorage.setItem(storageKeys.readerWidth, String(state.readerWidth));
  }

  if (action === "wide") {
    state.readerWidth = 920;
    localStorage.setItem(storageKeys.readerWidth, String(state.readerWidth));
  }

  saveCurrent();
  render();
}

function setSermonContext(context) {
  state.bookId = context.book.id;
  state.chapterNumber = context.chapter.number;
  state.sermonId = context.sermon.id;
  state.view = "sermon";
}

function openSermon(sermonId) {
  const context = getAllSermons().find((item) => item.sermon.id === sermonId);
  if (!context) return;
  setSermonContext(context);
  saveCurrent();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  elements.themeToggle.textContent = isDark ? "日" : "月";
  elements.themeToggle.title = isDark ? "切换日间模式" : "切换夜间模式";
  localStorage.setItem(storageKeys.theme, theme);
}

function changeFont(delta) {
  state.fontSize = Math.min(24, Math.max(15, state.fontSize + delta));
  localStorage.setItem(storageKeys.fontSize, String(state.fontSize));
  document.documentElement.style.setProperty("--reader-font-size", `${state.fontSize}px`);
  if (state.view === "sermon") renderSermonView();
}

function render() {
  renderBookCover();
  renderBooks();
  renderChapters();

  if (state.query.trim()) {
    renderSearchView();
    return;
  }

  if (state.view === "sermon") {
    renderSermonView();
  } else {
    renderChapterView();
  }
}

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

elements.themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
  applyTheme(nextTheme);
});

elements.increaseFont.addEventListener("click", () => changeFont(1));
elements.decreaseFont.addEventListener("click", () => changeFont(-1));

document.documentElement.style.setProperty("--reader-font-size", `${state.fontSize}px`);
document.documentElement.style.setProperty("--reader-width", `${state.readerWidth}px`);
applyTheme(localStorage.getItem(storageKeys.theme) || "light");
render();