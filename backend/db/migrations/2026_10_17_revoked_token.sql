-- =============================================================================
-- Migration: logout support.
--
-- Adds the revoked_token denylist used by POST /api/auth/logout. For a
-- database built before this date. A fresh build from the current
-- 01_schema.sql already has this table.
-- =============================================================================

BEGIN;

CREATE TABLE revoked_token (
    jti          VARCHAR(64)  PRIMARY KEY,
    volunteer_id BIGINT       NOT NULL REFERENCES volunteer_registration (volunteer_id) ON DELETE CASCADE,
    expires_at   TIMESTAMPTZ  NOT NULL,
    revoked_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_revoked_token_expires ON revoked_token (expires_at);

COMMIT;
