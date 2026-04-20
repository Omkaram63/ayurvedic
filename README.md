# AyurPredict

This project is now separated into:

- `frontend/` - React + Vite client
- `backend/` - Node.js + Express API with SQLite
- `legacy-python/` - preserved original Flask version

## Run the backend

```bash
cd backend
npm install
npm run dev
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and talks to the backend on `http://localhost:5000`.
