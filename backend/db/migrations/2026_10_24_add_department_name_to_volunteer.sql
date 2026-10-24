-- Migration: Add department_name column to volunteer_registration if missing
BEGIN;

ALTER TABLE public.volunteer_registration 
    ADD COLUMN IF NOT EXISTS department_name VARCHAR(150);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'volunteer_registration' AND column_name = 'cohv_type'
    ) THEN
        UPDATE public.volunteer_registration 
        SET department_name = cohv_type::text 
        WHERE department_name IS NULL;
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'volunteer_registration' AND column_name = 'department_id'
    ) THEN
        UPDATE public.volunteer_registration v
        SET department_name = dm.department_name
        FROM public.department_master dm
        WHERE v.department_id = dm.department_id AND v.department_name IS NULL;
    END IF;
END $$;

COMMIT;
