# Bloom Filter: Username Availability Checker

A small full-stack demo that shows how a **Bloom filter** makes username checks faster and cheaper by skipping most database lookups.

- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend:** React (Vite)

## How the Bloom filter works

A Bloom filter is a compact array of bits (all `0` at the start) plus a few hash functions.

**Adding a username**
1. Hash the name to get `k` positions in the bit array.
2. Set the bit at each position to `1`.

**Checking a username**
1. Compute the same `k` positions.
2. If **any** bit is `0`, the name is **definitely not taken**. The database is skipped.
3. If **all** bits are `1`, the name is **maybe taken**. Ask the database to be sure.

The filter can be wrong in only one direction. It may say "maybe taken" for a free name (a **false positive**), but it never says "free" for a name that is taken. A false positive only costs one extra database lookup.

**In this project** ([Backend/utils/bloomFilter.js](Backend/utils/bloomFilter.js))
- Sized for 10,000 names at a 1% false-positive rate, which gives about 95,851 bits and 7 positions per name.
- Uses one SHA-256 digest split into two numbers, then double hashing to get the 7 positions.
- The filter lives in memory. It is rebuilt from MongoDB each time the backend starts.

### Request flow

```
GET /api/check/:username
        |
   Bloom filter
   |-- some bit is 0 --> "available" (database NOT queried)
   `-- all bits are 1 --> query MongoDB
                           |-- not found --> "available" (false positive)
                           `-- found     --> "taken"
```

## Project structure

```
Backend/
  server.js                      Express app, startup, filter rebuild
  config/db.js                   MongoDB connection
  models/User.js                 User schema (unique, lowercase username)
  routes/userRoutes.js           API routes
  controllers/checkController.js     check + stats
  controllers/registerController.js  register
  utils/bloomFilter.js           Bloom filter + stats counters
Frontend/
  src/App.jsx, App.css           UI
```

## Setup

**Prerequisites:** Node.js 18+ and a MongoDB database (a free MongoDB Atlas cluster works).

1. **Backend**
   ```bash
   cd Backend
   npm install
   cp .env.example .env
   ```
   Edit `.env`:
   ```
   MONGO_URI=<your MongoDB connection string>
   PORT=5000
   ```

2. **Frontend**
   ```bash
   cd Frontend
   npm install
   ```

## Run

Use two terminals.

```bash
# Terminal 1: API on http://localhost:5000
cd Backend
npm start

# Terminal 2: UI on http://localhost:5173
cd Frontend
npm run dev
```

Open http://localhost:5173.

The frontend calls `http://localhost:5000/api` (set in `Frontend/src/App.jsx`). If you change the backend port, update it there too.

## Try it

1. Type a new name and click **Check**. You get "available" from the Bloom filter and the database is not queried.
2. Click **Register** to save it.
3. Check the same name again. You get "taken", confirmed by the database.
4. Watch the stats panel: *DB queries saved* grows as new names are checked.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/check/:username` | Is the username available? Response includes `source` (`bloom` or `db`), `falsePositive`, and the 7 bit positions checked |
| POST | `/api/register` | Body `{ "username": "name" }`. Returns 201, 409 if taken, 400 if empty |
| GET | `/api/stats` | Total checks, DB queries saved and made, false positives, filter size, fill % |

Usernames are trimmed and lowercased.

## Limitations

- The filter and the stats are in memory and reset when the backend restarts. The filter is rebuilt from the database.
- Bloom filters cannot delete items, so a removed user's name would still read as "maybe taken" until a restart.
- There is no validation on username length or characters.
