# Nginx and API replicas

This setup puts Nginx on `http://localhost` and keeps the Node API containers
private. Nginx sends `/api/*` and `/health` requests to the API service. It
connects to the PostgreSQL and Redis instances you already use, so it does not
create an empty database or replace your student records. The setup uses the
existing `db` and `redis` containers from `docker-compose.yml`.

## One-time setup

1. Copy `flash-result-system/.docker.env.example` to
   `flash-result-system/.docker.env`.
2. Set a PostgreSQL password and use that same password in
   `DOCKER_DATABASE_URL`.
3. Set `POSTGRES_DATA_VOLUME` to the Docker volume containing your existing
   data and make `POSTGRES_IMAGE` match its `PG_VERSION` (for example,
   `postgres:17-alpine` for a version-17 volume).
4. Ensure `flash-result-system/.env` has your real JWT secrets and the expected
   `FRONTEND_ORIGIN` (`http://localhost:5173` for Vite development).

The two `DOCKER_*` URLs use `db` and `redis`, which are Docker service names.
They must not use `localhost`, because that would refer to the API container
itself.

## Start three API replicas

From the repository root, run:

```powershell
docker compose --env-file flash-result-system/.docker.env -f docker-compose.yml -f docker-compose.replicas.yml up --build --scale api=3
```

Use `http://localhost/health` to check the public path. The Vite frontend now
uses `http://localhost/api/v1` by default, so keep this Compose command running
while developing the frontend.

To use another API address, create `frontend/.env.local`:

```text
VITE_API_BASE_URL=http://localhost/api/v1
```

## Verify failover and load balancing

```powershell
docker compose --env-file flash-result-system/.docker.env -f docker-compose.yml -f docker-compose.replicas.yml ps
```

Identify one API container from the `ps` command and stop only that container:

```powershell
docker stop <api-container-name>
```

Repeat `Invoke-WebRequest http://localhost/health`. Requests should continue
through healthy replicas. In a second terminal, keep the admission queue worker
running because queued logins use the same Redis instance:

```powershell
cd flash-result-system
npm run admission:queue
```

Run your existing login test against Nginx:

```powershell
$env:LOAD_TEST_API_URL = "http://127.0.0.1"
cd flash-result-system
npm run load:login
```

Do not publish API port `3000` from Compose. Requests should enter through
Nginx, which lets Express use the forwarded client IP for Redis rate limiting.
