-- =============================================================================
-- Migration: COHV type stored as its label instead of a cohv_type_master FK.
--
-- For a database built from the earlier 01_schema.sql. A fresh build from the
-- current 01_schema.sql already has this shape - do not run it there.
-- Assumes volunteer_registration and cohv_supervisor are still empty (the
-- NOT NULL column is added without a default).
-- =============================================================================

BEGIN;

CREATE DOMAIN cohv_type_label AS VARCHAR(20)
    CHECK (VALUE IN ('Public Health', 'Animal', 'Wildlife', 'Environment'));

CREATE OR REPLACE FUNCTION cohv_type_sector(p_type TEXT) RETURNS VARCHAR AS $$
    SELECT CASE p_type
        WHEN 'Public Health' THEN 'human'
        WHEN 'Animal'        THEN 'animal'
        WHEN 'Wildlife'      THEN 'wildlife'
        WHEN 'Environment'   THEN 'environment'
    END;
$$ LANGUAGE sql IMMUTABLE;

-- institution_type_master: copy the label across, then drop the id.
ALTER TABLE volunteer_registration DROP CONSTRAINT fk_volunteer_institution;

ALTER TABLE institution_type_master ADD COLUMN cohv_type cohv_type_label;
UPDATE institution_type_master i
   SET cohv_type = t.cohv_type_name
  FROM cohv_type_master t
 WHERE t.cohv_type_id = i.cohv_type_id;
ALTER TABLE institution_type_master ALTER COLUMN cohv_type SET NOT NULL;
ALTER TABLE institution_type_master DROP COLUMN cohv_type_id;   -- drops its FK and uniques
ALTER TABLE institution_type_master
    ADD CONSTRAINT uq_institution_type UNIQUE (cohv_type, institution_type_name),
    ADD CONSTRAINT uq_institution_type_owner UNIQUE (institution_type_id, cohv_type);

ALTER TABLE volunteer_registration DROP COLUMN cohv_type_id;
ALTER TABLE volunteer_registration ADD COLUMN cohv_type cohv_type_label NOT NULL;
ALTER TABLE volunteer_registration
    ADD CONSTRAINT fk_volunteer_institution FOREIGN KEY (institution_type_id, cohv_type)
        REFERENCES institution_type_master (institution_type_id, cohv_type);

ALTER TABLE cohv_supervisor DROP COLUMN cohv_type_id;
ALTER TABLE cohv_supervisor ADD COLUMN cohv_type cohv_type_label;

DROP TABLE cohv_type_master;

COMMIT;
