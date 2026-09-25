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

function renderList(list) {
  return list
    .map(
      (m) =>
        `<li><b>${esc(m.title)}</b> — ${esc(m.genre)} — <i>${esc(m.status)}</i> — ${esc(m.rating)}/10</li>`
    )
    .join('');
}

app.get('/', (req, res) => {
  const { genre = '', status = '' } = req.query;
  const filtered = filterMovies(movies, { genre, status });
  const topPicks = movies.filter((m) => Number(m.rating) >= TOP_PICK_THRESHOLD);

  res.send(`<!DOCTYPE html>
<html>
<head><title>FilmMetrics</title></head>
<body>
  <h1>FilmMetrics</h1>
  <form method="GET" action="/">
    <input name="genre" placeholder="Filter by genre" value="${esc(genre)}">
    <select name="status">
      <option value="">All statuses</option>
      <option ${status === 'Watchlist' ? 'selected' : ''}>Watchlist</option>
      <option ${status === 'Watching' ? 'selected' : ''}>Watching</option>
      <option ${status === 'Watched' ? 'selected' : ''}>Watched</option>
    </select>
    <button>Filter</button>
    <a href="/">Clear</a>
  </form>
  <form method="POST" action="/movies">
    <input name="title" placeholder="Title" required>
    <input name="genre" placeholder="Genre" required>
    <select name="status">
      <option>Watchlist</option>
      <option>Watching</option>
      <option>Watched</option>
    </select>
    <input name="rating" placeholder="Rating (0-10)">
    <button>Add Movie</button>
  </form>

  <h2>Top Picks (rated ${TOP_PICK_THRESHOLD}+)</h2>
  <ul>${renderList(topPicks)}</ul>

  <h2>All Movies</h2>
  <ul>${renderList(filtered)}</ul>

  <footer>commit ${commit}</footer>
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

app.get('/health', (req, res) => res.json({ status: 'ok', commit }));

module.exports = app;
