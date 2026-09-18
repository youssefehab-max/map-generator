# Map Generator — fixed backend + new frontend

## What was broken in the backend

1. **`handleJSON.js` didn't match the real data model.**
   It expected fields like `Nodes`, `id`, `X`, `Y`, `floorID`, `adjacency_list`,
   but the Mongoose schema actually uses `nodes`, `_id`, `x`, `y`, `floorId`,
   `adjacencyList`. It was also plain CommonJS-flavoured JS sitting outside
   `src/`, not wired into the TypeScript/ESM backend at all — nothing ever
   called it.
   → Replaced with **`Backend/src/utils/pathfinder.ts`**, a TypeScript port
   of the same Dijkstra algorithm using the real field names, plus a new
   route that actually calls it: **`GET /buildings/:id/path?start=<nodeId>&end=<nodeId>`**.

2. **No endpoint existed for pathfinding at all.** `mapController.ts` only had
   create/list/get-by-id. Added `getBuildingPath` and wired it up in
   `mapsRouter.ts`.

3. **Conjunction nodes (no name) were rejected.** `nodeSchema.ts` had
   `name: { required: true }`, which contradicts "some nodes are just
   conjunction nodes with no name." Made `name` optional.

4. **Auth was dead code.** `middlewares/auth.ts` was an empty file,
   `routes/auth.route.ts` was entirely commented out, and `login()` never
   issued a token — so there was no way to actually prove who the
   "map creator" was, even though `Building.mapCreator` is required.
   Implemented a real JWT flow: `login` now signs and returns a token,
   `middlewares/auth.ts` verifies it, `auth.route.ts` is wired up and
   mounted at `/auth`, and building creation (`POST /buildings`) now
   requires a valid token and takes `mapCreator` from the token instead of
   trusting the request body.

5. **No CORS support.** The frontend runs on a different port than the API,
   and there was no `cors` middleware, so browser requests would have been
   blocked. Added `cors` to `server.ts` and `package.json`.

## New frontend

`Frontend/` is a Vite + React + TypeScript app with two halves:

- **Public viewer** (`/`, `/view/:id`) — no login required. Browse
  buildings, pick a start and end node, and see the path drawn over the
  floor image. When the path crosses a stair/bridge onto another floor,
  "Next floor / Previous floor" buttons appear to step through the route
  floor by floor.
- **Map creator** (`/login`, `/register`, `/create`) — requires an account.
  Upload one image per floor, click on a floor image to drop nodes
  (leave the name blank for a plain conjunction node), then connect nodes
  with directed edges (connecting nodes on two different floors creates a
  stair/bridge crossing). Publishing sends everything to `POST /buildings`.

## Running it locally

### Backend
```bash
cd Backend
npm install
cp .env.example .env   # fill in MONGO_URL, JWT_SECRET, CLOUDINARY_* , CLIENT_URL
npm run dev            # http://localhost:3000
```

### Frontend
```bash
cd Frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm run dev             # http://localhost:5173
```

## API summary

| Method | Route                              | Auth | Description                                  |
|--------|-------------------------------------|------|-----------------------------------------------|
| GET    | `/buildings`                        | no   | List all buildings                            |
| GET    | `/buildings/:id`                    | no   | Get one building (floors + nodes)             |
| GET    | `/buildings/:id/path?start=&end=`   | no   | Shortest path, split per floor                |
| POST   | `/buildings`                        | yes  | Create a building (multipart form, see below) |
| POST   | `/auth/register`                    | no   | Create an account                             |
| POST   | `/auth/login`                       | no   | Log in, returns `{ token, user }`             |

`POST /buildings` expects `multipart/form-data` with:
- `name` — building name
- `floorsData` — JSON array `[{ id: "floor_1" }, ...]`, same order as `images`
- `nodesData` — JSON array of nodes, each with a client-generated 24-hex-char
  `_id`, optional `name`, `x`, `y`, `floorId`, and `adjacencyList`
  (`[{ node: <id>, weight: <number> }]`)
- `images` — one file per floor, in the same order as `floorsData`
