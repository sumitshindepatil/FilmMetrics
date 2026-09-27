const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const movies = []; // in-memory data: {id, title, genre, status, rating}
let nextId = 1;

// escape user input so HTML/script tags are shown as text, not executed
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const sha = process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || 'local';
const commit = sha.slice(0, 7);

const TOP_PICK_THRESHOLD = 8;

function filterMovies(list, { genre, status }) {
  let out = list;
  if (genre) out = out.filter((m) => m.genre.toLowerCase() === genre.toLowerCase());
  if (status) out = out.filter((m) => m.status === status);
  return out;
}

const STATUS_COLOR = {
  Watchlist: '#948C9E',
  Watching: '#E3A23C',
  Watched: '#5BA88C',
};

function stub(m, { showStub = true } = {}) {
  const dot = STATUS_COLOR[m.status] || '#948C9E';
  return `<li class="stub" data-id="${m.id}">
    <div class="stub-main">
      <span class="title">${esc(m.title)}</span>
      <span class="meta"><span class="dot" style="background:${dot}"></span>${esc(m.genre)} · ${esc(m.status)}</span>
    </div>
    ${showStub ? `<div class="perf"></div>` : ''}
    <div class="stub-side">
      <span class="stamp">${esc(m.rating)}</span>
      <button class="remove" title="Remove" onclick="removeMovie(${m.id})">&times;</button>
    </div>
  </li>`;
}

function renderList(list) {
  if (!list.length) {
    return `<p class="empty">Nothing logged yet. Add a screening above.</p>`;
  }
  return `<ul class="reel">${list.map((m) => stub(m)).join('')}</ul>`;
}

app.get('/', (req, res) => {
  const { genre = '', status = '' } = req.query;
  const filtered = filterMovies(movies, { genre, status });
  const topPicks = movies.filter((m) => Number(m.rating) >= TOP_PICK_THRESHOLD);

  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FilmMetrics</title>
<style>
  :root {
    --ink: #17151F;
    --surface: #221E2E;
    --surface-2: #2A2537;
    --text: #F1EDE4;
    --muted: #948C9E;
    --gold: #E3A23C;
    --rating: #C1443C;
    --line: #3A3448;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ink);
    color: var(--text);
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 2.5rem 1.25rem 4rem;
  }
  .wrap { max-width: 640px; margin: 0 auto; }
  header { text-align: center; margin-bottom: 2rem; }
  header h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-weight: 700;
    font-size: 2.4rem;
    letter-spacing: 0.02em;
    margin: 0 0 0.35rem;
    color: var(--gold);
  }
  header p {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
    letter-spacing: 0.04em;
  }
  section { margin-bottom: 2.25rem; }
  h2 {
    font-family: Georgia, serif;
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
    color: var(--text);
  }
  .panel {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 4px;
    padding: 1.1rem;
  }
  form.add { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  form.add input, form.add select {
    background: var(--surface-2);
    border: 1px solid var(--line);
    color: var(--text);
    padding: 0.55rem 0.65rem;
    border-radius: 3px;
    font-size: 0.92rem;
  }
  form.add input::placeholder { color: var(--muted); }
  form.add button {
    grid-column: 1 / -1;
    background: var(--gold);
    color: #241C0F;
    border: none;
    font-weight: 700;
    padding: 0.65rem;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.92rem;
  }
  form.add button:hover { filter: brightness(1.08); }
  form.filter {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }
  form.filter input, form.filter select {
    background: var(--surface);
    border: 1px solid var(--line);
    color: var(--text);
    padding: 0.45rem 0.6rem;
    border-radius: 3px;
    font-size: 0.85rem;
  }
  form.filter button {
    background: transparent;
    border: 1px solid var(--line);
    color: var(--text);
    padding: 0.45rem 0.8rem;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.85rem;
  }
  form.filter a { color: var(--muted); font-size: 0.85rem; text-decoration: none; }
  ul.reel { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
  li.stub {
    display: flex;
    align-items: center;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
  }
  .stub-main { flex: 1; padding: 0.75rem 0.9rem; min-width: 0; }
  .stub-main .title { display: block; font-weight: 600; font-size: 0.98rem; }
  .stub-main .meta { display: flex; align-items: center; gap: 0.4rem; color: var(--muted); font-size: 0.8rem; margin-top: 0.2rem; }
  .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
  .perf {
    width: 0;
    border-left: 1px dashed var(--line);
    align-self: stretch;
  }
  .stub-side { display: flex; align-items: center; gap: 0.5rem; padding: 0 0.75rem; }
  .stamp {
    width: 34px; height: 34px;
    border: 2px solid var(--rating);
    color: var(--rating);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    transform: rotate(-8deg);
  }
  .remove {
    background: none;
    border: none;
    color: var(--muted);
    font-size: 1.1rem;
    cursor: pointer;
    line-height: 1;
    padding: 0.2rem 0.3rem;
  }
  .remove:hover { color: var(--rating); }
  .empty { color: var(--muted); font-size: 0.9rem; }
  footer {
    text-align: center;
    color: var(--muted);
    font-size: 0.75rem;
    margin-top: 2.5rem;
  }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>FilmMetrics</h1>
      <p>Rating-based movie tracking</p>
    </header>

    <section class="panel">
      <h2>Add a screening</h2>
      <form class="add" method="POST" action="/movies">
        <input name="title" placeholder="Title" required>
        <input name="genre" placeholder="Genre" required>
        <select name="status">
          <option>Watchlist</option>
          <option>Watching</option>
          <option>Watched</option>
        </select>
        <input name="rating" placeholder="Rating (0-10)">
        <button>Add to log</button>
      </form>
    </section>

    <section>
      <h2>Top picks (rated ${TOP_PICK_THRESHOLD}+)</h2>
      ${renderList(topPicks)}
    </section>

    <section>
      <h2>All screenings</h2>
      <form class="filter" method="GET" action="/">
        <input name="genre" placeholder="Genre" value="${esc(genre)}">
        <select name="status">
          <option value="">Any status</option>
          <option ${status === 'Watchlist' ? 'selected' : ''}>Watchlist</option>
          <option ${status === 'Watching' ? 'selected' : ''}>Watching</option>
          <option ${status === 'Watched' ? 'selected' : ''}>Watched</option>
        </select>
        <button>Filter</button>
        <a href="/">Clear</a>
      </form>
      ${renderList(filtered)}
    </section>

    <footer>commit ${commit}</footer>
  </div>

  <script>
    async function removeMovie(id) {
      await fetch('/movies/' + id, { method: 'DELETE' });
      location.reload();
    }
  </script>
</body>
</html>`);
});

app.post('/movies', (req, res) => {
  const { title, genre, status, rating } = req.body;
  if (!title || !genre) {
    return res.status(400).send('Title and genre are required');
  }
  if (rating !== undefined && rating !== '' && Number.isNaN(Number(rating))) {
    return res.status(400).send('Rating must be a number');
  }
  const numericRating = rating === undefined || rating === '' ? 0 : Number(rating);
  if (numericRating < 0 || numericRating > 10) {
    return res.status(400).send('Rating must be between 0 and 10');
  }
  movies.push({
    id: nextId++,
    title,
    genre,
    status: status || 'Watchlist',
    rating: numericRating,
  });
  res.redirect('/');
});

app.get('/api/movies', (req, res) => {
  const { genre = '', status = '' } = req.query;
  res.json(filterMovies(movies, { genre, status }));
});

app.get('/api/top-picks', (req, res) => {
  res.json(movies.filter((m) => Number(m.rating) >= TOP_PICK_THRESHOLD));
});

app.delete('/movies/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = movies.findIndex((m) => m.id === id);
  if (index === -1) {
    return res.status(404).send('Movie not found');
  }
  movies.splice(index, 1);
  res.json({ deleted: id });
});

app.get('/health', (req, res) => res.json({ status: 'ok', commit }));

module.exports = app;