const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

test('health check returns ok', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.status, 'ok');
  server.close();
});

test('adding a valid movie shows up in the API list', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = await fetch(`${base}/movies`, {
    method: 'POST',
    body: new URLSearchParams({
      title: 'Inception',
      genre: 'Sci-Fi',
      status: 'Watched',
      rating: '9',
    }),
    redirect: 'manual',
  });
  assert.equal(post.status, 302);
  const list = await (await fetch(`${base}/api/movies`)).json();
  assert.equal(list[0].title, 'Inception');
  server.close();
});

test('missing title or genre is rejected', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const bad = await fetch(`${base}/movies`, {
    method: 'POST',
    body: new URLSearchParams({ status: 'Watchlist' }),
  });
  assert.equal(bad.status, 400);
  server.close();
});

test('rating above 10 is rejected', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const bad = await fetch(`${base}/movies`, {
    method: 'POST',
    body: new URLSearchParams({ title: 'X', genre: 'Action', rating: '15' }),
  });
  assert.equal(bad.status, 400);
  server.close();
});

test('movies rated 8+ appear in top picks', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${base}/movies`, {
    method: 'POST',
    body: new URLSearchParams({ title: 'Interstellar', genre: 'Sci-Fi', rating: '9' }),
  });
  await fetch(`${base}/movies`, {
    method: 'POST',
    body: new URLSearchParams({ title: 'Meh Movie', genre: 'Drama', rating: '4' }),
  });
  const picks = await (await fetch(`${base}/api/top-picks`)).json();
  assert.ok(picks.some((m) => m.title === 'Interstellar'));
  assert.ok(!picks.some((m) => m.title === 'Meh Movie'));
  server.close();
});

test('filtering by genre only returns matching movies', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${base}/movies`, {
    method: 'POST',
    body: new URLSearchParams({ title: 'Dune', genre: 'Sci-Fi', rating: '8' }),
  });
  await fetch(`${base}/movies`, {
    method: 'POST',
    body: new URLSearchParams({ title: 'Titanic', genre: 'Romance', rating: '7' }),
  });
  const list = await (await fetch(`${base}/api/movies?genre=Sci-Fi`)).json();
  assert.ok(list.every((m) => m.genre === 'Sci-Fi'));
  server.close();
});



test('deleting a movie removes it from the list', async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  await fetch(`${base}/movies`, {
    method: 'POST',
    body: new URLSearchParams({ title: 'ToDelete', genre: 'Drama', rating: '5' }),
  });
  const list = await (await fetch(`${base}/api/movies`)).json();
  const movie = list.find((m) => m.title === 'ToDelete');
  const del = await fetch(`${base}/movies/${movie.id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const listAfter = await (await fetch(`${base}/api/movies`)).json();
  assert.ok(!listAfter.some((m) => m.id === movie.id));
  server.close();
});
