# Panda Flood 🐼

Panda Flood is a mobile-first, one-screen web toy built for instant joy: open it and you are immediately surrounded by animated pandas.

## Features

- **Mobile-first, single-screen UI** tuned for touch and thumb-friendly interactions.
- **Interactive panda chaos** with idle movement, tap reactions, and escalating silliness.
- **More Pandas button** that adds bursts of pandas and can trigger Maximum Panda Mode.
- **Tap anywhere** to spawn a panda where you tapped.
- **Long press anywhere** to summon one dramatic giant panda.
- **Reduced-motion support** for accessibility.
- **Production serving** with a lightweight Node static server and `/health` + `/healthz` endpoints.
- **Fly.io ready** with `Dockerfile` and `fly.toml` included.

## Tech stack

- React
- Vite
- TypeScript
- CSS animations

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Production build & run

```bash
npm install
npm run build
PORT=8080 npm run start
```

Health checks:

- `GET /health`
- `GET /healthz`

## Fly.io deployment

1. Install Fly CLI and authenticate.
2. Optionally change `app` in `fly.toml`.
3. Deploy:

```bash
fly launch --no-deploy
fly deploy
```

## Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – type-check and produce production build
- `npm run preview` – preview production assets with Vite
- `npm run lint` – TypeScript type check
- `npm run start` – serve `/dist` via Node server
