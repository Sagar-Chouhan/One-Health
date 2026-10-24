# OneHealth API Documentation

OneHealth is a volunteer registration, supervision, and field-event reporting
platform. The backend is a FastAPI application backed by PostgreSQL, and the
frontend is a React/Vite web application.

This document explains **what each API does, why it exists, when it is used,
what it accepts, and what it returns**. It is intended for frontend
developers, backend developers, testers, and anyone integrating another client
with the OneHealth backend.

## 1. Why the API exists

The API is the contract between the web/mobile user interface and the
database. It centralizes:

- **Validation**: names, mobile numbers, dates, LGD location codes, PINs,
  event fields, coordinates, and uploaded files are checked before database
  writes.
- **Security**: passwords/PINs are never sent back, access is controlled with
  bearer tokens, and supervisor and volunteer tokens cannot be used
  interchangeably.
- **Workflow**: volunteer registrations wait for supervisor approval; only
  active volunteers can sign in and submit events.
- **Location integrity**: state, district, block, Gram Panchayat, and village
  selections follow the official LGD hierarchy.
- **Sector rules**: a volunteer's COHV type determines the event-reporting
  sector and available event/population options.
- **Offline support**: `client_ref` prevents a retry from creating a
  duplicate event report.
- **File handling**: profile photographs and event attachments are stored by
  the backend rather than being written directly to PostgreSQL by the client.

## 2. Technology and URLs

| Component | Technology |
|---|---|
| Backend | FastAPI, SQLAlchemy, psycopg, PostgreSQL |
| Frontend | React, Vite |
| Authentication | Bearer JWT |
| API content types | JSON and `multipart/form-data` |
| Database migrations | Alembic |

Authentication uses JWT bearer tokens. Send the token returned by a login
endpoint in the HTTP `Authorization` header on protected requests.

### Local development URLs

| Service | URL |
|---|---|
| Backend | `http://127.0.0.1:8000` |
| Swagger UI | `http://127.0.0.1:8000/docs` |
| ReDoc | `http://127.0.0.1:8000/redoc` |
| OpenAPI JSON | `http://127.0.0.1:8000/openapi.json` |
| Frontend | `http://127.0.0.1:8082` |

The frontend uses `VITE_API_BASE` when it is set. For local development, set
it to `http://127.0.0.1:8000`. If it is not set, the frontend uses the
configured stage API URL in `frontend/web/src/lib/api.js`.

## 3. Running the project

### Backend

The repository uses Python 3.10 for the pinned backend dependencies:

```powershell
cd C:\Users\sagar\OneDrive\Desktop\OneHealth\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend reads database and security settings from `backend/.env`.
Do not commit production credentials or real secret keys.

### Frontend

```powershell
cd C:\Users\sagar\OneDrive\Desktop\OneHealth\frontend\web
$env:VITE_API_BASE = "http://127.0.0.1:8000"
npm run dev
```

### Database

The application must be able to connect to the PostgreSQL database named by
`DB_NAME` in `backend/.env`. The initial schema and seed scripts are in
`backend/database/`. Alembic is used for application migrations:

```powershell
cd C:\Users\sagar\OneDrive\Desktop\OneHealth\backend
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic upgrade head
```

## 4. General API conventions

### JSON requests

JSON endpoints use:

```http
Content-Type: application/json
```

Example:

```json
{
  "email": "supervisor@example.org",
  "password": "example-password"
}
```

### Multipart requests

Registration and event reporting use `multipart/form-data` because they
combine ordinary fields with uploaded files. Do not send these requests as
JSON.

### Authentication header

After login, send the returned token on protected requests:

Use the `Authorization` header with the `Bearer` authentication scheme and
the returned access token value.

```http
Authorization: Bearer <access_token>
```

There are two token roles:

- `COHV`: volunteer token. Used by `/api/auth/*` and `/api/events/*`.
- `SUPERVISOR`: supervisor token. Used by protected
  `/api/supervisors/me/*` endpoints.

A token with the wrong role returns `401 Unauthorized`. An inactive account
can receive `403 Forbidden`. Logging out revokes the token immediately.

### Common response statuses

| Status | Meaning |
|---:|---|
| `200` | Request succeeded |
| `201` | A resource was created |
| `401` | Missing, invalid, expired, revoked, or wrong-role token; or invalid login |
| `403` | Credentials were valid, but the account is not allowed to act |
| `404` | Requested resource does not exist in the caller's scope |
| `409` | Database uniqueness/conflict rule was violated |
| `422` | Request validation failed or a selected master record is invalid |
| `429` | Too many failed volunteer PIN attempts |
| `500` | Unexpected server/database error; inspect backend logs |

FastAPI validation errors normally have this shape:

```json
{
  "detail": [
    {
      "type": "int_parsing",
      "loc": ["query", "state_lgd_code"],
      "msg": "Input should be a valid integer",
      "input": "abc"
    }
  ]
}
```

Application validation errors normally have this shape:

```json
{
  "detail": "Selected location is invalid or inactive."
}
```

## 5. API endpoint index

| Method | Endpoint | Auth | Used for |
|---|---|---|---|
| GET | `/health` | None | Check API and database availability |
| POST | `/api/auth/login` | None | Volunteer sign-in |
| POST | `/api/auth/logout` | COHV | Revoke volunteer token |
| GET | `/api/auth/me` | COHV | Read signed-in volunteer profile |
| GET | `/api/locations/states` | None | Start location dropdown |
| GET | `/api/locations/districts` | None | Districts for a state |
| POST | `/api/locations/districts` | None | Add a district master record |
| GET | `/api/locations/blocks` | None | Blocks for a district |
| GET | `/api/locations/gram-panchayats` | None | Gram Panchayats for a block |
| GET | `/api/locations/villages` | None | Villages for a Gram Panchayat |
| GET | `/api/locations/professions` | None | Profession dropdown |
| GET | `/api/locations/educations` | None | Education dropdown |
| GET | `/api/departments` | None | Active department dropdown |
| GET | `/api/departments/{department_id}/cohv-type` | None | COHV type for a department |
| GET | `/api/departments/{department_id}/institutions` | None | Institution options for a department |
| GET | `/api/supervisors/by-location` | None | Supervisor options for supervisor login |
| POST | `/api/supervisors/login` | None | Supervisor sign-in |
| GET | `/api/supervisors` | None | Reporting supervisor dropdown |
| GET | `/api/supervisors/me/summary` | Supervisor | Dashboard totals |
| GET | `/api/supervisors/me/team` | Supervisor | Team activity list/map |
| GET | `/api/supervisors/me/registrations` | Supervisor | Approval queue |
| POST | `/api/supervisors/me/registrations/{volunteer_id}/action` | Supervisor | Change volunteer status |
| POST | `/api/volunteers/preview-id` | None | Preview generated volunteer code |
| POST | `/api/volunteers/register` | None | Submit volunteer registration |
| GET | `/api/volunteers/me` | COHV | Read signed-in volunteer full profile |
| GET | `/api/volunteers/profile` | None/COHV | Read volunteer profile by ID, code, or auth token |
| GET | `/api/volunteers/{volunteer_id}` | None/Supervisor/COHV | Read volunteer profile by volunteer ID |
| GET | `/api/events/form-metadata` | COHV | Load event form options and limits |
| GET | `/api/events` | COHV | List the signed-in volunteer's event reports |
| POST | `/api/events` | COHV | Submit event report and attachments |
| GET | `/api/uploads/{path}` | None | Read a stored upload |

## 6. Department and institution APIs

### `GET /api/departments`

Returns active departments ordered by `sort_order`:

```json
[
  {"department_id": 1, "department_name": "Public Health Department"},
  {"department_id": 2, "department_name": "Animal Department"}
]
```

### `GET /api/departments/{department_id}/cohv-type`

Returns the configured COHV type for Public Health, Animal, Wildlife, and
Environment departments:

```json
{"department_id": 1, "cohv_type": "Public Health"}
```

Rural and Urban departments currently have no COHV type mapping. The API
returns `422` rather than inventing one.

### `GET /api/departments/{department_id}/institutions`

Returns active institution options for the selected active department. A valid
department with no options returns `[]`.

```json
[
  {
    "institution_type_id": 3,
    "department_id": 1,
    "field_label": "Health facility",
    "option_name": "PHC",
    "is_other": false,
    "sort_order": 1
  }
]
```

An invalid or inactive department returns `404` with:

```json
{"detail": "Department is invalid or inactive."}
```

The volunteer registration multipart form also accepts `department_id`,
`institution_type_id`, and `other_institution_name`. When these new fields
are supplied, the API verifies the department, mapped COHV type, active
institution ownership, and required Other text before saving.

## 7. Health API

### `GET /health`

**Why:** Used by deployment checks, monitoring, and developers to confirm that
the API process is running and can execute a database query.

**Authentication:** None.

**Response `200`:**

```json
{
  "status": "success",
  "application": "OneHealth Volunteer API",
  "database": "connected"
}
```

If the database is unavailable, the request fails rather than reporting a
false healthy status.

## 8. Volunteer authentication APIs

### `POST /api/auth/login`

**Why:** Signs in a volunteer using either the generated volunteer ID or the
registered mobile number. Only a supervisor-approved `ACTIVE` volunteer gets a
token.

**Request JSON:**

```json
{
  "login": "COHV-26-0001",
  "pin": "1234",
  "device_id": "android-device-001"
}
```

`login` can be a volunteer code or a mobile number. `pin` must contain 4 to 6
digits. `device_id` is optional and is used for login/device history.

**Response `200`:**

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "expires_in": 86400,
  "volunteer": {
    "volunteer_id": 1,
    "volunteer_code": "COHV-26-0001",
    "volunteer_name": "Example Volunteer",
    "mobile_no": "9876543210",
    "email": "volunteer@example.org",
    "cohv_type": "Public Health",
    "status": "ACTIVE",
    "photo_path": "volunteers/COHV-26-0001.jpg",
    "state_lgd_code": 36,
    "state_name": "Example State",
    "district_lgd_code": 694,
    "district_name": "Example District",
    "block_lgd_code": 5208,
    "block_name": "Example Block",
    "gram_panchayat_lgd_code": 10001,
    "gram_panchayat_name": "Example Gram Panchayat",
    "village_lgd_code": 20001,
    "village_name": "Example Village",
    "supervisor_id": 10,
    "supervisor_name": "Example Supervisor"
  }
}
```

The API intentionally uses the same invalid-credentials message for an
unknown login and a wrong PIN. This avoids revealing which volunteer IDs or
mobile numbers exist. Repeated wrong PINs can result in `429` for the
configured lockout window.

Possible account-state responses after a correct PIN:

- `403` pending: registration awaits supervisor approval.
- `403` rejected: registration was not approved.
- `403` suspended/inactive: account cannot sign in.

### `POST /api/auth/logout`

**Why:** Explicitly signs the volunteer out and revokes the current JWT before
its normal expiry time.

**Headers:** COHV bearer token.

**Response `200`:**

```json
{
  "message": "Signed out successfully."
}
```

The client should also remove the token from session storage. A revoked token
will fail on future protected requests.

### `GET /api/auth/me`

**Why:** Loads the current volunteer profile after page refresh and verifies
that the session still belongs to an active volunteer.

**Headers:** COHV bearer token.

**Response:** The same `volunteer` profile object returned by login.

## 9. Location master APIs

Location APIs populate dependent dropdowns. The normal order is:

```text
states -> districts -> blocks -> gram-panchayats -> villages
```

Every location is identified by its official LGD code. The client should pass
the parent code selected in the preceding dropdown and should not invent local
IDs.

### `GET /api/locations/states`

**Why:** First request in registration and supervisor sign-in location
selection.

**Response `200`:**

```json
[
  {
    "state_lgd_code": 36,
    "state_name": "Example State"
  }
]
```

### `GET /api/locations/districts?state_lgd_code=36`

**Why:** Loads districts belonging to the selected state.

**Query:** `state_lgd_code` must be a positive integer.

**Response:**

```json
[
  {
    "district_lgd_code": 694,
    "state_lgd_code": 36,
    "district_name": "Example District",
    "division_name": null
  }
]
```

### `POST /api/locations/districts`

**Why:** Adds a district master record for controlled administration or data
loading. It validates that the referenced state is active.

**Request JSON:**

```json
{
  "district_lgd_code": 694,
  "state_lgd_code": 36,
  "district_name": "Example District",
  "division_name": "Example Division"
}
```

**Response:** `201 Created` with the created district.

### `GET /api/locations/blocks?district_lgd_code=694`

Returns active blocks under the selected district.

Example response:

```json
[
  {
    "block_lgd_code": 5208,
    "district_lgd_code": 694,
    "state_lgd_code": 36,
    "block_name": "Example Block"
  }
]
```

### `GET /api/locations/gram-panchayats?block_lgd_code=5208`

Returns active Gram Panchayats under the selected block.

### `GET /api/locations/villages?gram_panchayat_lgd_code=10001`

Returns active villages under the selected Gram Panchayat.

### `GET /api/locations/professions`

Returns active profession master values:

```json
[
  {
    "profession_id": 1,
    "profession_name": "Health Worker"
  }
]
```

### `GET /api/locations/educations`

Returns active education master values. These two master APIs are used by the
registration form and their IDs are sent to the volunteer registration API.

## 10. Supervisor APIs

Supervisor APIs power the supervisor web portal. A supervisor can only see and
change volunteers assigned to that supervisor.

### `GET /api/supervisors/by-location`

**Why:** Populates the supervisor selector on the supervisor login screen.

**Query parameters:**

```text
state_lgd_code=36
district_lgd_code=694
block_lgd_code=5208
```

**Response:**

```json
[
  {
    "supervisor_id": 10,
    "supervisor_code": "SUP-26-0001",
    "supervisor_name": "Example Supervisor",
    "designation": "Block Supervisor",
    "cohv_type": "Public Health",
    "email": "supervisor@example.org"
  }
]
```

### `POST /api/supervisors/login`

**Why:** Authenticates a supervisor for the dashboard and approval workflow.

**Request JSON:**

```json
{
  "email": "supervisor@example.org",
  "password": "example-password"
}
```

**Response `200`:**

```json
{
  "access_token": "<supervisor-jwt>",
  "token_type": "bearer",
  "expires_in": 86400,
  "supervisor": {
    "supervisor_id": 10,
    "supervisor_code": "SUP-26-0001",
    "supervisor_name": "Example Supervisor",
    "designation": "Block Supervisor",
    "cohv_type": "Public Health",
    "email": "supervisor@example.org",
    "state_lgd_code": 36,
    "state_name": "Example State",
    "district_lgd_code": 694,
    "district_name": "Example District",
    "block_lgd_code": 5208,
    "block_name": "Example Block"
  }
}
```

### `GET /api/supervisors?cohv_type=Public%20Health&state_lgd_code=36&district_lgd_code=694`

**Why:** Populates the Reporting Supervisor field in volunteer registration.
It returns supervisors eligible for the selected COHV type, state, and
district.

**Response:**

```json
[
  {
    "supervisor_id": 10,
    "supervisor_code": "SUP-26-0001",
    "supervisor_name": "Example Supervisor",
    "designation": "Block Supervisor",
    "cohv_type": "Public Health"
  }
]
```

### `GET /api/supervisors/me/summary`

**Authentication:** Supervisor bearer token.

**Why:** Supplies dashboard totals without requiring the frontend to calculate
counts from individual rows.

The response includes team totals, pending approvals, active/suspended/
inactive/rejected counts, visits, alerts, referrals, samples, awareness,
training, meetings, and success-story counts.

Example shape:

```json
{
  "team_total": 12,
  "pending_approvals": 2,
  "active_count": 8,
  "suspended_count": 1,
  "inactive_count": 0,
  "rejected_count": 1,
  "awaiting_verification": 0,
  "total_visits": 44,
  "alerts_generated": 3,
  "open_alerts": 1,
  "referrals": 8,
  "referrals_followup": 2,
  "samples": 4,
  "awareness": 12,
  "trainings_imparted": 2,
  "trainings_attended": 6,
  "meetings": 4,
  "success_stories": 1
}
```

### `GET /api/supervisors/me/team`

**Authentication:** Supervisor bearer token.

**Why:** Provides the supervisor's team list and per-volunteer activity
breakdown for the dashboard's team view or map.

Each item contains `volunteer_id`, name, status, village, district, and an
`activity` object with event, referral, sample, awareness, imparted-training,
and attended-training counts.

### `GET /api/supervisors/me/registrations`

**Authentication:** Supervisor bearer token.

**Why:** Loads the approval queue and registration list for the signed-in
supervisor. Results are scoped to that supervisor's own team.

Each registration row contains:

```json
{
  "volunteer_id": 1,
  "volunteer_code": "COHV-26-0001",
  "volunteer_name": "Example Volunteer",
  "status": "PENDING",
  "created_at": "2026-10-21T10:30:00",
  "cohv_type": "Public Health",
  "village_name": "Example Village",
  "block_name": "Example Block",
  "district_name": "Example District"
}
```

### `POST /api/supervisors/me/registrations/{volunteer_id}/action`

**Authentication:** Supervisor bearer token.

**Why:** Performs a controlled status transition on a volunteer in the
 supervisor's team.

**Request JSON:**

```json
{
  "action": "approve",
  "remarks": "Documents checked."
}
```

Allowed actions:

| Action | Result |
|---|---|
| `approve` | Activates the volunteer |
| `reject` | Rejects the registration |
| `deactivate` | Deactivates the volunteer |
| `suspend` | Suspends the volunteer |
| `reinstate` | Reinstates the volunteer |

`remarks` is optional and can contain up to 500 characters.

**Response:**

```json
{
  "message": "Volunteer approved and activated.",
  "volunteer_id": 1,
  "volunteer_code": "COHV-26-0001",
  "volunteer_name": "Example Volunteer",
  "status": "ACTIVE"
}
```

If the volunteer is not part of the signed-in supervisor's team, the API
returns `404` instead of allowing cross-team changes.

## 11. Volunteer registration APIs

Registration is intentionally split into preview and final submission so the
UI can show the generated ID before the user submits the photograph and final
record.

### `POST /api/volunteers/preview-id`

**Why:** Validates the registration fields and previews the next generated
volunteer code. It does not create the final volunteer registration.

**Content type:** `multipart/form-data`.

Send the registration fields listed in the next section. The profile photo is
not required for this endpoint.

**Response:**

```json
{
  "message": "Volunteer ID preview generated successfully.",
  "volunteer_code_preview": "COHV-26-0009"
}
```

The preview is for display. The final code is assigned by the database during
registration and should be taken from the response of `/register`.

### `POST /api/volunteers/register`

**Why:** Creates the volunteer record, hashes the PIN, validates the complete
location hierarchy and supervisor relationship, and optionally stores a
profile photo.

**Content type:** `multipart/form-data`.

#### Required form fields

| Field | Type | Description |
|---|---|---|
| `volunteer_name` | string | Name, 2-150 characters |
| `gender` | string | `Male`, `Female`, `Other`, or `Prefer not to say` |
| `date_of_birth` | date | ISO format `YYYY-MM-DD`; volunteer must be at least 18 |
| `mobile_no` | string | Valid 10-digit Indian mobile number |
| `email` | string | Valid email address |
| `cohv_type` | string | `Public Health`, `Animal`, `Wildlife`, or `Environment` |
| `department_id` | integer | ID from `/api/departments`; supplied with `institution_type_id` |
| `institution_type_id` | integer | Active option from the department institutions API |
| `state_lgd_code` | integer | Selected state LGD code |
| `district_lgd_code` | integer | Selected district LGD code |
| `block_lgd_code` | integer | Selected block LGD code |
| `gram_panchayat_lgd_code` | integer | Selected Gram Panchayat LGD code |
| `village_lgd_code` | integer | Selected village LGD code |
| `date_of_joining` | date | ISO format; cannot be in the future |
| `education_id` | integer | ID from `/api/locations/educations` |
| `profession_id` | integer | ID from `/api/locations/professions` |
| `pin` | string | 4-6 digit sign-in PIN |

#### Optional form fields

| Field | Type | Description |
|---|---|---|
| `supervisor_id` | integer | ID from `/api/supervisors` |
| `latitude` | decimal | GPS latitude, -90 to 90 |
| `longitude` | decimal | GPS longitude, -180 to 180 |
| `gps_accuracy_m` | integer | GPS accuracy in meters |
| `gps_unavailable_reason` | string | Reason GPS was unavailable |
| `device_id` | string | Client device identifier, max 50 characters |
| `other_institution_name` | string | Required when the selected institution has `is_other: true` |
| `photo` | file | JPEG, PNG, or WebP profile photo, max 5 MB |

Latitude and longitude must either both be sent or both be omitted. The
backend converts accepted gender labels to stored gender codes and lowercases
the email address.

**Response `201`:**

```json
{
  "message": "Registration submitted. Awaiting supervisor approval.",
  "volunteer_id": 1,
  "volunteer_code": "COHV-26-0001",
  "status": "PENDING",
  "photo_path": "volunteers/COHV-26-0001.jpg"
}
```

The normal lifecycle is:

```text
PENDING -> ACTIVE
PENDING -> REJECTED
ACTIVE  -> SUSPENDED
ACTIVE  -> INACTIVE
SUSPENDED -> ACTIVE
```

## 12. Event reporting APIs

Event APIs are available only to active volunteers. The backend derives the
primary reporting sector from the volunteer's registered COHV type; clients
must not try to override it.

| COHV type | Sector code |
|---|---|
| `Public Health` | `human` |
| `Animal` | `animal` |
| `Wildlife` | `wildlife` |
| `Environment` | `environment` |

### `GET /api/events/form-metadata`

**Why:** Loads everything required to render the event form for the signed-in
volunteer in one request.

**Authentication:** COHV bearer token.

**Response includes:**

- locked `primary_sector`
- valid sector-specific `event_types`
- sector-specific population options
- `Urban` and `Rural` location choices
- villages in the volunteer's district
- attachment limits
- `min_date` and `max_date`

Example:

```json
{
  "primary_sector": {
    "sector_code": "human",
    "sector_name": "Human Health"
  },
  "event_types": [
    {"id": 1, "name": "Awareness Activity", "is_other": false},
    {"id": 99, "name": "Other", "is_other": true}
  ],
  "population": {
    "label": "Population Type",
    "options": [
      {"id": 1, "name": "General", "is_other": false}
    ]
  },
  "location_types": ["Urban", "Rural"],
  "villages": [
    {
      "village_lgd_code": 20001,
      "village_name": "Example Village",
      "gram_panchayat_name": "Example Gram Panchayat",
      "block_name": "Example Block"
    }
  ],
  "upload_limits": {},
  "min_date": "2026-10-07",
  "max_date": "2026-10-21"
}
```

The allowed event date is today or within the previous 14 days. The exact
attachment limits are returned by `upload_limits` so clients can display
current server rules instead of hard-coding them.

### `POST /api/events`

**Why:** Stores a field event, its GPS data, flags, attachments, and any
resulting alert in one transaction.

**Authentication:** COHV bearer token.

**Content type:** `multipart/form-data`.

#### Event fields

| Field | Type | Description |
|---|---|---|
| `event_type_id` | integer | Sector-specific event type from metadata |
| `event_type_other` | string | Required when the selected event type has `is_other=true` |
| `date` | date | Today or up to 14 days in the past |
| `time` | time | Event time |
| `village_lgd_code` | integer | Event village from metadata |
| `is_out_of_area` | boolean | Required when reporting outside the registered district |
| `purpose_of_visit` | string | Required, max 300 characters |
| `location_type` | string | `Urban` or `Rural` |
| `total_visits` | integer | Zero or greater |
| `population_type_id` | integer | Sector-specific population option |
| `population_other` | string | Required when the population option is `Other` |
| `observations` | string | Optional, max 250 words |
| `action_taken` | string | Optional, max 250 words; required if an alert is generated |
| `description` | string | Optional caption, max 500 characters |
| `referral_generated` | boolean | Whether the event generated a referral |
| `alert_generated` | boolean | Whether the event generated an alert |
| `follow_up_required` | boolean | Whether follow-up is needed |
| `latitude` | decimal | Optional GPS latitude |
| `longitude` | decimal | Optional GPS longitude |
| `gps_accuracy_m` | integer | Optional GPS accuracy |
| `gps_unavailable_reason` | string | Optional reason GPS was unavailable |
| `device_id` | string | Optional device identifier |
| `client_ref` | string | Optional offline idempotency key, max 64 characters |
| `photos[]` | files | Event photographs |
| `videos[]` | files | Event videos |
| `documents[]` | files | Event documents |

Latitude and longitude must be submitted together. If `alert_generated=true`,
`action_taken` is required. If the selected village is outside the volunteer's
registered district, `is_out_of_area=true` is required.

**Response `201`:**

```json
{
  "message": "Event report submitted successfully.",
  "event_report_id": 45,
  "event_report_code": "VISIT-26-0045",
  "verification_status": "PENDING",
  "alert_code": "ALERT-26-0003",
  "attachments": 3,
  "duplicate": false
}
```

#### Offline retry behavior

When the device may retry a submission, generate a stable `client_ref` before
the first request. If the same volunteer submits the same `client_ref` again,
the API returns the existing event with `"duplicate": true` instead of
creating another event. Do not generate a new `client_ref` for every retry.

### `GET /api/events`

**Why:** Returns the signed-in volunteer's submitted event reports. Reports
are always filtered by the authenticated volunteer and ordered by event date
and time, newest first.

**Authentication:** COHV bearer token.

**Query parameters:**

- `limit`: 1-100, default `50`
- `offset`: zero or greater, default `0`

Example response:

```json
[
  {
    "event_report_id": 19,
    "event_report_code": "VISIT-26-0006",
    "volunteer_id": 45,
    "client_ref": "EVT-CLI-17924298912",
    "event_type_id": 1,
    "sector_code": "environment",
    "event_date": "2026-10-20",
    "event_time": "10:30:00",
    "village_lgd_code": 123,
    "is_out_of_area": false,
    "purpose_of_visit": "Field visit",
    "location_type": "RURAL",
    "total_visits": 1,
    "population_type_id": 16,
    "referral_generated": false,
    "alert_generated": false,
    "follow_up_required": false,
    "captured_at": "2026-10-20T10:45:00+00:00",
    "verification_status": "SUBMITTED",
    "created_at": "2026-10-20T10:45:01+00:00",
    "attachments": []
  }
]
```

An unauthenticated request returns `401 Unauthorized`. The endpoint never
returns another volunteer's reports.

### `GET /api/uploads/{path}`

**Why:** Serves a previously stored profile or event upload through the API's
static file mount.

Example:

```text
GET /api/uploads/volunteers/COHV-26-0001.jpg
```

Only use paths returned or known to be produced by the backend. Do not build
arbitrary filesystem paths from user input.

## 13. Typical end-to-end workflows

### Volunteer registration workflow

1. Load states.
2. Load districts using the selected `state_lgd_code`.
3. Load blocks using the selected `district_lgd_code`.
4. Load Gram Panchayats using the selected `block_lgd_code`.
5. Load villages using the selected `gram_panchayat_lgd_code`.
6. Load professions and educations.
7. Load eligible supervisors using COHV type, state, and district.
8. Submit `/api/volunteers/preview-id` to show a code preview.
9. Submit `/api/volunteers/register` with the same fields and optional photo.
10. The supervisor reviews the new `PENDING` registration.

### Volunteer sign-in and event workflow

1. Submit `/api/auth/login`.
2. Store the returned COHV token securely for the session.
3. Call `/api/auth/me` when the app starts or refreshes.
4. Call `/api/events/form-metadata`.
5. Build the event form from the returned sector options and limits.
6. Submit `/api/events` as multipart form data.
7. Reuse `client_ref` if an offline request must be retried.
8. Remove the token locally after `/api/auth/logout`.

### Supervisor workflow

1. Load states, districts, and blocks.
2. Load `/api/supervisors/by-location`.
3. Submit `/api/supervisors/login`.
4. Call `/api/supervisors/me/summary` for dashboard cards.
5. Call `/api/supervisors/me/team` for team activity.
6. Call `/api/supervisors/me/registrations` for approval rows.
7. Submit the registration action endpoint to approve, reject, suspend, or
   otherwise update a team member.

## 14. Frontend API helper behavior

The React client centralizes requests in
`frontend/web/src/lib/api.js`:

- `apiGet(path, params)` sends unauthenticated GET requests.
- `apiPost(path, body)` sends unauthenticated JSON POST requests.
- `apiAuthGet(path, params)` adds the COHV bearer token.
- `apiAuthPost(path, body)` adds the COHV bearer token.

Multipart endpoints such as registration and event reporting should use
`fetch` with `FormData`; do not manually set the `Content-Type` header because
the browser must add the multipart boundary.

## 15. Validation   and security notes

- Never log or display PINs, passwords, JWTs, or database passwords.
- Do not place a JWT in a URL query string.
- Treat all IDs returned by the server as untrusted input and handle
  `404`, `401`, `403`, and `422` responses.
- Keep `SECRET_KEY` private, use at least 32 random bytes for HS256, and
  replace development values before deployment. Generate one with
  `python -c "import secrets; print(secrets.token_urlsafe(32))"`. Rotating it
  invalidates existing JWTs.
- Use HTTPS outside local development.
- The API checks account status on protected requests, so a suspended or
  deactivated user loses access without waiting for token expiry.
- Database writes use parameterized queries and transaction handling.
- Uploaded files are processed by backend attachment helpers and should be
  sent only through the documented multipart fields.

## 16. Useful development checks

```powershell
# Backend syntax and import check
cd C:\Users\sagar\OneDrive\Desktop\OneHealth\backend
.\.venv\Scripts\python.exe -m compileall -q app
.\.venv\Scripts\python.exe -c "from app.main import app; print(app.title, len(app.routes))"

# Dependency check
.\.venv\Scripts\python.exe -m pip check

# Frontend production build
cd C:\Users\sagar\OneDrive\Desktop\OneHealth\frontend\web
npm run build
```

For the authoritative generated request and response schemas, open Swagger UI
at `/docs` while the backend is running.
