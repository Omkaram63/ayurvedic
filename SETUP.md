# AyurPredict Setup

## New project structure

```text
copy/
|-- backend/
|   |-- data/
|   |-- src/
|   `-- package.json
|-- frontend/
|   |-- src/
|   `-- package.json
`-- legacy-python/
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend starts on `http://localhost:5000`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173`.

## Notes

- The Node backend keeps user accounts and prediction history in `backend/data/database.db`.
- The disease knowledge file lives at `backend/data/domain.json`.
- The old Flask version is preserved in `legacy-python/` for reference.
