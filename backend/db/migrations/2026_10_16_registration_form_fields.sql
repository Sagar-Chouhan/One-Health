-- =============================================================================
-- Migration: volunteer_registration matches the registration form exactly.
--
-- Drops the columns the form does not have (designation, the "Other" text
-- boxes, linked institution, preferred language) and the institution master
-- that only that field used. Reporting Supervisor is now chosen on the form;
-- supervisor_id already exists.
--
-- For a database built before this date. A fresh build from the current
-- 01_schema.sql already has this shape.
-- =============================================================================

BEGIN;

ALTER TABLE volunteer_registration
    DROP CONSTRAINT IF EXISTS fk_volunteer_institution,
    DROP COLUMN designation,
    DROP COLUMN education_other,
    DROP COLUMN profession_other,
    DROP COLUMN institution_type_id,
    DROP COLUMN institution_other,
    DROP COLUMN preferred_language;

DROP TABLE institution_type_master;

ALTER TABLE education_master  DROP COLUMN is_other;
ALTER TABLE profession_master DROP COLUMN is_other;

COMMIT;
