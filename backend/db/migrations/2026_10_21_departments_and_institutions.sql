-- Migration: expose COHV department and institution selections on registration.
-- Safe for databases where these objects were already provisioned.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cohv_institution_type_master (
    institution_type_id SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_id       SMALLINT NOT NULL REFERENCES public.department_master (department_id),
    field_label         VARCHAR(100) NOT NULL,
    option_name         VARCHAR(200) NOT NULL,
    is_other            BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order          SMALLINT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.volunteer_registration
    ADD COLUMN IF NOT EXISTS department_id SMALLINT
        REFERENCES public.department_master (department_id),
    ADD COLUMN IF NOT EXISTS institution_type_id SMALLINT
        REFERENCES public.cohv_institution_type_master (institution_type_id),
    ADD COLUMN IF NOT EXISTS institution_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS other_institution_name VARCHAR(200);

COMMIT;
