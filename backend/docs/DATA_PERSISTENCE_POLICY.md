# Data Persistence Policy: Database as Source of Truth

## Principle

**All important business data is stored in the database.** In-memory and client-side storage (localStorage, React state) are used only for **performance** (caching, session tokens) or **UX** (initial paint). The database is the single source of truth for durable data.

---

## Backend: What Lives in the Database

| Data | Model / Table | Persisted |
|------|----------------|-----------|
| Users | `accounts.User` | Yes |
| Devices | `devices.Device` | Yes |
| Parameter mappings | `devices.ParameterMapping` | Yes |
| Device telemetry | `devices.DeviceData` | Yes (every ingest and MQTT message) |
| Thresholds | `devices.Threshold` | Yes |
| Alarms | `devices.Alarm` | Yes |
| Branding | `branding.Branding` | Yes |
| JWT refresh tokens (optional) | `token_blacklist.OutstandingToken` | Yes if token_blacklist app enabled |

**No business data is held only in memory.** All API writes go to the database. The MQTT subscriber persists every message via `DeviceData.objects.create(...)`.

---

## When We Use Memory (Performance Only)

- **Backend**: Django ORM querysets are evaluated per request; results are not cached in process memory across requests. Any future read-through cache (e.g. Redis) must be optional and invalidatable; DB remains source of truth.
- **Frontend**: React state (devices, user, thresholds, alarms) is a **cache** of API responses. Data is loaded from the API (DB) on init and refresh. localStorage is used only for:
  - **Tokens** (`access_token`, `refresh_token`): required for auth; validity is checked by the backend.
  - **User snapshot**: optional cache for quick route checks; source of truth is `GET /auth/users/me/` (DB).

---

## Frontend: Source of Truth for “Current User”

- **Source of truth**: `GET /auth/users/me/` (backend reads from DB).
- **Recommendation**: Do not treat localStorage `user` as authoritative. On app load, always call `getCurrentUser()` and set user in context from the API. Use context (or API) for protected route checks so the displayed user always reflects the database.

---

## Optional: JWT Tokens in Database

To make refresh tokens durable and revocable, add `rest_framework_simplejwt.token_blacklist` to `INSTALLED_APPS` and run migrations. Then:

- Issued refresh tokens are stored in `OutstandingToken` (DB).
- On logout/rotate, tokens are blacklisted in `BlacklistedToken` (DB).
- No critical session state exists only in memory or in the client.

---

## Summary

| Layer | Durable storage | In-memory / cache use |
|-------|------------------|------------------------|
| Backend | All business data in DB (User, Device, DeviceData, Threshold, Alarm, Branding, ParameterMapping) | None for business data; optional cache for performance only |
| Frontend | None (DB is on server) | React state = cache of API; localStorage = tokens + optional user cache |
| MQTT | Every message → `DeviceData` | No in-memory buffer; each message persisted immediately |

**Rule**: If it matters for business or audit, it is written to the database. Use in-memory or client cache only for performance, with a clear path to re-fetch from the DB.
