# Observability

Each API container emits one JSON object per completed non-health request. The
log includes the timestamp, level, event name, `instanceId`, request ID, method,
path, status code, duration, and client IP. It does not log request bodies,
credentials, JWTs, or admission tickets.

## Health endpoints

| Endpoint | Meaning | Expected response |
| --- | --- | --- |
| `/health/live` | The Node API process can respond. | `200` |
| `/health/ready` | The API can reach PostgreSQL and Redis. | `200` when both are connected, otherwise `503` |
| `/health` | Compatibility alias for readiness. | Same as `/health/ready` |

Each response includes `instanceId`. Docker health checks use `/health/ready`,
so Nginx starts only after an API replica can reach both shared dependencies.

## Inspect the running system

From the repository root:

```powershell
docker compose --env-file flash-result-system/.docker.env -f docker-compose.yml -f docker-compose.replicas.yml ps
docker compose --env-file flash-result-system/.docker.env -f docker-compose.yml -f docker-compose.replicas.yml logs --tail 100 api
Invoke-WebRequest http://localhost/health/ready
```

The `X-Request-Id` response header identifies a single request across access
logs and API logs. The `instanceId` field identifies the API container that
served it.
