-- =============================================================================
-- SAMPLE gram panchayats and villages - PLACEHOLDER DATA, NOT LGD.
--
-- Names are the prototype's pilot hierarchy (MASTER.states), hung under real
-- LGD blocks loaded by load_blocks.py. The GP and village codes are made up
-- and deliberately sit outside the LGD range (GP 9000001+, village 90000001+)
-- so they can never be mistaken for, or collide with, real codes.
--
-- Remove before loading the real LGD GP / village directory:
--     DELETE FROM village_master        WHERE village_lgd_code        >= 90000000;
--     DELETE FROM gram_panchayat_master WHERE gram_panchayat_lgd_code >= 9000000;
-- =============================================================================

BEGIN;

INSERT INTO gram_panchayat_master
    (gram_panchayat_lgd_code, block_lgd_code, district_lgd_code, state_lgd_code, gram_panchayat_name)
VALUES
    -- Telangana > Nagarkurnool (694)
    (9000001, 5208, 694, 36, 'Mannanur'),          -- block Amrabad
    (9000002, 5208, 694, 36, 'Amrabad'),           -- block Amrabad
    (9000003, 5203, 694, 36, 'Achampet'),          -- block Achampeta
    -- Telangana > Ranga Reddy (518)
    (9000004, 5537, 518, 36, 'Shamshabad'),        -- block Shamshabad
    -- Tamil Nadu > The Nilgiris (587)
    (9000005, 6337, 587, 33, 'Udhagamandalam'),    -- block Udhagamandalam
    (9000006, 6335, 587, 33, 'Gudalur'),           -- block Gudalur
    -- Tamil Nadu > Erode (573)
    (9000007, 6170, 573, 33, 'Sathyamangalam')     -- block Satyamangalam
ON CONFLICT (gram_panchayat_lgd_code) DO NOTHING;

INSERT INTO village_master
    (village_lgd_code, gram_panchayat_lgd_code, block_lgd_code, district_lgd_code, state_lgd_code, village_name)
VALUES
    (90000001, 9000001, 5208, 694, 36, 'Mannanur'),
    (90000002, 9000001, 5208, 694, 36, 'Vatvarlapally'),
    (90000003, 9000001, 5208, 694, 36, 'Rampur'),
    (90000004, 9000002, 5208, 694, 36, 'Amrabad'),
    (90000005, 9000002, 5208, 694, 36, 'Macharam'),
    (90000006, 9000002, 5208, 694, 36, 'Sarlapally'),
    (90000007, 9000003, 5203, 694, 36, 'Achampet'),
    (90000008, 9000003, 5203, 694, 36, 'Uppununthala'),
    (90000009, 9000003, 5203, 694, 36, 'Balmoor'),
    (90000010, 9000004, 5537, 518, 36, 'Shamshabad'),
    (90000011, 9000004, 5537, 518, 36, 'Palmakula'),
    (90000012, 9000004, 5537, 518, 36, 'Ootpally'),
    (90000013, 9000005, 6337, 587, 33, 'Ithalar'),
    (90000014, 9000005, 6337, 587, 33, 'Emerald'),
    (90000015, 9000005, 6337, 587, 33, 'Thummanatty'),
    (90000016, 9000006, 6335, 587, 33, 'Devala'),
    (90000017, 9000006, 6335, 587, 33, 'Cherambadi'),
    (90000018, 9000006, 6335, 587, 33, 'Pandalur'),
    (90000019, 9000007, 6170, 573, 33, 'Thalamalai'),
    (90000020, 9000007, 6170, 573, 33, 'Germalam'),
    (90000021, 9000007, 6170, 573, 33, 'Ikkarai')
ON CONFLICT (village_lgd_code) DO NOTHING;

COMMIT;
