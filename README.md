# Queen's Range

Bring eight rated Lichess games you already played. We read the moves and draw a range around our best guess, from a cautious low to a cautious high.

The screen contract is in [docs/frontend.md](docs/frontend.md). The HTTP contract is in [docs/backend.md](docs/backend.md). The look and the build order are in [docs/plan.md](docs/plan.md).

```text
npm install
npm run dev
```

The API base URL in development is `http://127.0.0.1:8000` (see `VITE_API_BASE_URL` in `src/api/client.ts`).

## Deploy

This UI is a static Vite build. Host it separately from the Chess Elo API (for example Cloudflare Pages, Netlify, or Vercel).

```text
VITE_API_BASE_URL=https://<your-api-host>
npm run build
```

Publish the `dist/` folder. `VITE_API_BASE_URL` must be the public API origin (no path). If it is unset, production builds still call `http://127.0.0.1:8000` and will not reach a remote API.

The backend repo documents Render + Cloudflare Pages as the default free pair.
