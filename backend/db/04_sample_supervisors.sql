-- =============================================================================
-- DUMMY supervisors for development - NOT real people.
--
-- One supervisor of every COHV type in each district that has sample
-- villages (03_sample_gp_village.sql), so any test volunteer can be assigned
-- a supervisor of their own type. Mobile numbers are fake and e-mails use the
-- reserved example.com domain.
--
-- Each is placed in that district's sample block and shares the demo password
-- "sup@oh2026" (one scrypt hash, fine for dummy accounts) so the web
-- supervisor sign-in works. Replace before go-live.
--
-- Remove before go-live:
--     DELETE FROM cohv_supervisor WHERE email LIKE '%@example.com';
-- =============================================================================

BEGIN;

INSERT INTO cohv_supervisor
    (supervisor_name, designation, mobile_no, email, role_id, cohv_type,
     state_lgd_code, district_lgd_code, block_lgd_code, password_hash)
SELECT x.name, x.designation, x.mobile, x.email, r.role_id, x.cohv_type, x.state, x.district,
       CASE x.district WHEN 694 THEN 5208 WHEN 518 THEN 5537 WHEN 587 THEN 6337 WHEN 573 THEN 6170 END,
       'scrypt$16384$8$1$8x5U+smPkyM2NrNfBAhc8w==$wUQeohblnG358fXWF9GcA2cQzulGfmRBlF7TCqgFeeY='
FROM (VALUES
    -- Telangana > Nagarkurnool (694)
    ('Dr. Ravi Kumar',       'Medical Officer, PHC',                 '9000000101', 'ravi.kumar@example.com',       'Public Health', 36, 694),
    ('Dr. Srinivas Rao',     'Veterinary Assistant Surgeon',         '9000000102', 'srinivas.rao@example.com',     'Animal',        36, 694),
    ('Lakshmi Prasanna',     'Forest Range Officer',                 '9000000103', 'lakshmi.prasanna@example.com', 'Wildlife',      36, 694),
    ('Mahesh Goud',          'Assistant Environmental Engineer',     '9000000104', 'mahesh.goud@example.com',      'Environment',   36, 694),
    -- Telangana > Ranga Reddy (518)
    ('Dr. Anitha Reddy',     'Medical Officer, PHC',                 '9000000105', 'anitha.reddy@example.com',     'Public Health', 36, 518),
    ('Dr. Venkatesh Naidu',  'Veterinary Assistant Surgeon',         '9000000106', 'venkatesh.naidu@example.com',  'Animal',        36, 518),
    ('Suresh Babu',          'Forest Section Officer',               '9000000107', 'suresh.babu@example.com',      'Wildlife',      36, 518),
    ('Kavitha Rani',         'Sanitary Inspector, Municipality',     '9000000108', 'kavitha.rani@example.com',     'Environment',   36, 518),
    -- Tamil Nadu > The Nilgiris (587)
    ('Dr. Meena Sundaram',   'Block Medical Officer',                '9000000109', 'meena.sundaram@example.com',   'Public Health', 33, 587),
    ('Dr. Arun Prakash',     'Veterinary Assistant Surgeon',         '9000000110', 'arun.prakash@example.com',     'Animal',        33, 587),
    ('Senthil Kumar',        'Forest Range Officer',                 '9000000111', 'senthil.kumar@example.com',    'Wildlife',      33, 587),
    ('Priya Natarajan',      'Assistant Engineer, TNPCB',            '9000000112', 'priya.natarajan@example.com',  'Environment',   33, 587),
    -- Tamil Nadu > Erode (573)
    ('Dr. Karthik Raja',     'Medical Officer, PHC',                 '9000000113', 'karthik.raja@example.com',     'Public Health', 33, 573),
    ('Dr. Divya Lakshmi',    'Veterinary Assistant Surgeon',         '9000000114', 'divya.lakshmi@example.com',    'Animal',        33, 573),
    ('Murugan Selvam',       'Forest Range Officer, Sathyamangalam', '9000000115', 'murugan.selvam@example.com',   'Wildlife',      33, 573),
    ('Revathi Krishnan',     'Sanitary Inspector, Panchayat Union',  '9000000116', 'revathi.krishnan@example.com', 'Environment',   33, 573)
) AS x(name, designation, mobile, email, cohv_type, state, district)
JOIN role_master r ON r.role_code = 'SUPERVISOR'
ON CONFLICT (mobile_no) DO NOTHING;

COMMIT;
