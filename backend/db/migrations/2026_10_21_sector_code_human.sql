-- Migration: normalize the legacy Public Health sector code.
--
-- The application maps "Public Health" COHV volunteers to the "human"
-- reporting sector. Older databases used "public" in sector_master and
-- population_type_master, which caused event metadata lookups to fail.

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.sector_master WHERE sector_code = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM public.sector_master WHERE sector_code = 'human'
    ) THEN
        UPDATE public.sector_master
           SET sector_name = 'Public Health (legacy)'
         WHERE sector_code = 'public';

        INSERT INTO public.sector_master (
            sector_code, sector_name, section_code, population_label,
            accent_color, sort_order, created_at, updated_at
        )
        SELECT
            'human', 'Public Health', section_code, population_label,
            accent_color, sort_order, created_at, updated_at
        FROM public.sector_master
        WHERE sector_code = 'public';

        UPDATE public.population_type_master
           SET sector_code = 'human'
         WHERE sector_code = 'public';

        DELETE FROM public.sector_master
         WHERE sector_code = 'public';
    END IF;
END
$$;

COMMIT;
