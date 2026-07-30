# SpiceRoute – Restaurant Command Center

Full-stack restaurant management app (Node.js + vanilla HTML/CSS/JS).

## Features

- **Customer**: order food, book tables, track orders, leave feedback
- **Server**: tables, assign/serve, collect payment
- **Chef**: kitchen board, prepare → ready
- **Manager**: billing, feedback, increments, staff, menu
- **Management**: attendance, reports, full overview

## Staff login (after QR scan)

Use **any mobile number**. Password is fixed per role:

| Role        | Password    |
|-------------|-------------|
| Server      | `server123` |
| Chef        | `chef123`   |
| Manager     | `manager123`|
| Management  | `mgmt123`   |

Customers: sign up with any phone + any password.

## Project structure

```
spiceroute/
├── server.js          # API + static file server
├── package.json
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── README.md
```

## Run locally

```bash
cd spiceroute
node server.js
# or: npm start
```

Open **http://localhost:3000**

## Deploy

### Option 1 – Any VPS / cloud (DigitalOcean, AWS, Railway, Render, etc.)

1. Upload the `spiceroute` folder to the server.
2. Install Node.js 14+ if needed.
3. Run:

```bash
cd spiceroute
npm start
# or keep it running with:
npx pm2 start server.js --name spiceroute
```

4. Point your domain / reverse proxy (nginx) to port 3000, or set `PORT` env:

```bash
PORT=8080 node server.js
```

### Option 2 – Render / Railway / Fly.io (free tiers)

- Connect the repo (or upload the folder).
- **Start command**: `node server.js`
- **Root directory**: the folder that contains `server.js`
- No build step needed.

### Option 3 – Glitch / Replit

- Import the folder.
- Set start script to `node server.js`.

### Common previous errors

| Error | Fix |
|-------|-----|
| `Cannot GET /` or 404 on CSS/JS | Folder must be: `server.js` next to `public/` containing `index.html`, `css/`, `js/` |
| `EADDRINUSE` | Port 3000 already used → change `PORT` or kill the process |
| Blank page / CORS | Always open via the Node server URL, not by double-clicking `index.html` |
| Module not found | This app has **zero** npm dependencies – just `node server.js` |

## Notes

- Data is **in-memory** (resets on restart). For production, swap the arrays for a database (SQLite / Mongo / Postgres).
- QR scan is a UI demo (simulated after 2 seconds).
