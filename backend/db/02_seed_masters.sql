-- =============================================================================
-- Seed data for reference masters, transcribed from cohv-app_prototype.html
-- (MASTER object). Location masters are NOT seeded here - load them from the
-- government LGD directory (03_copy_locations.py copies your existing
-- states/districts).
-- =============================================================================

BEGIN;

INSERT INTO role_master (role_code, role_name) VALUES
    ('COHV',           'COHV Volunteer'),
    ('SUPERVISOR',     'Supervisor'),
    ('DISTRICT_ADMIN', 'District Administrator'),
    ('STATE_ADMIN',    'State Administrator'),
    ('SUPER_ADMIN',    'Super Administrator');

INSERT INTO sector_master (sector_code, sector_name, section_code, population_label, accent_color, sort_order) VALUES
    ('human',       'Human Health',  'C1', 'Human Population',     '#5B8BB8', 1),
    ('animal',      'Animal Health', 'C2', 'Livestock Population', '#8B7EC4', 2),
    ('wildlife',    'Wildlife',      'C3', 'Wildlife Population',  '#7FA88C', 3),
    ('environment', 'Environmental', 'C4', 'Population Exposed',   '#D18F6F', 4);

-- COHV type has no master table; its value is stored as the label.

INSERT INTO education_master (education_name, sort_order) VALUES
    ('Secondary Education', 1), ('Higher Secondary', 2), ('Diploma', 3),
    ('Bachelor''s Degree', 4), ('Master''s Degree', 5), ('Doctorate / PhD', 6),
    ('Professional Degree', 7), ('Other', 99);

INSERT INTO profession_master (profession_name, sort_order) VALUES
    ('Farmer', 1), ('Agricultural labourer', 2), ('Livestock owner / rearer', 3),
    ('Para-veterinarian', 4), ('ASHA / Anganwadi worker', 5), ('Self-employed', 6),
    ('Teacher', 7), ('Student', 8), ('Homemaker', 9), ('Other', 99);

INSERT INTO population_type_master (sector_code, population_type_name, is_other, sort_order) VALUES
    ('human', 'General population', FALSE, 1), ('human', 'Children (under 5)', FALSE, 2),
    ('human', 'School children', FALSE, 3), ('human', 'Pregnant women', FALSE, 4),
    ('human', 'Elderly', FALSE, 5), ('human', 'Migrant / labour population', FALSE, 6), ('human', 'Other', TRUE, 99),
    ('animal', 'Livestock', FALSE, 1), ('animal', 'Companion animal', FALSE, 2), ('animal', 'Other', TRUE, 99),
    ('wildlife', 'Wild mammals', FALSE, 1), ('wildlife', 'Birds', FALSE, 2),
    ('wildlife', 'Reptiles / amphibians', FALSE, 3), ('wildlife', 'Primates', FALSE, 4), ('wildlife', 'Other', TRUE, 99),
    ('environment', 'Residential area', FALSE, 1), ('environment', 'School / Anganwadi', FALSE, 2),
    ('environment', 'Market / public place', FALSE, 3), ('environment', 'Water-source users', FALSE, 4),
    ('environment', 'Waste-site surroundings', FALSE, 5), ('environment', 'Other', TRUE, 99);

-- Section D event types (EVENT_BASED, sector-tagged) ...
INSERT INTO event_type_master (event_type_name, event_kind, applicable_sectors, is_zoonotic, is_other, sort_order) VALUES
    ('Suspected disease outbreaks',  'EVENT_BASED', ARRAY['human','animal','wildlife','environment'], FALSE, FALSE, 1),
    ('Human disease clusters',       'EVENT_BASED', ARRAY['human'],                  FALSE, FALSE, 2),
    ('Mass animal deaths',           'EVENT_BASED', ARRAY['animal'],                 FALSE, FALSE, 3),
    ('Mass bird deaths',             'EVENT_BASED', ARRAY['animal','wildlife'],      FALSE, FALSE, 4),
    ('Food poisoning events',        'EVENT_BASED', ARRAY['human','environment'],    FALSE, FALSE, 5),
    ('Chemical exposure',            'EVENT_BASED', ARRAY['human','environment'],    FALSE, FALSE, 6),
    ('Animal-borne disease events',  'EVENT_BASED', ARRAY['human','animal'],         TRUE,  FALSE, 7),
    ('Unusual wildlife mortality',   'EVENT_BASED', ARRAY['wildlife'],               FALSE, FALSE, 8),
    ('Heat-wave events',             'EVENT_BASED', ARRAY['environment'],            FALSE, FALSE, 9),
    ('Floods',                       'EVENT_BASED', ARRAY['environment'],            FALSE, FALSE, 10),
    ('Cyclones',                     'EVENT_BASED', ARRAY['environment'],            FALSE, FALSE, 11),
    ('Landslides',                   'EVENT_BASED', ARRAY['environment'],            FALSE, FALSE, 12),
    ('Drought emergencies',          'EVENT_BASED', ARRAY['environment'],            FALSE, FALSE, 13),
    ('Fire incidents affecting community / animals', 'EVENT_BASED', ARRAY['environment'], FALSE, FALSE, 14);

-- ... plus section C routine activities (ROUTINE, one sector each) ...
INSERT INTO event_type_master (event_type_name, event_kind, applicable_sectors, is_zoonotic, sort_order)
SELECT x.name, 'ROUTINE', ARRAY[x.sector]::VARCHAR(20)[],
       x.name ~* '(zoonotic|rabies|animal-bite|animal bite|dog-bite|cat-bite)', 100 + x.ord
FROM (VALUES
    ('human', 'Household visits conducted', 1), ('human', 'Fever cases identified', 2),
    ('human', 'Diarrhoea cases identified', 3), ('human', 'Acute respiratory illness identified', 4),
    ('human', 'Skin disease cases identified', 5), ('human', 'Suspected zoonotic disease cases', 6),
    ('human', 'Animal-bite exposure cases', 7), ('human', 'Suspected rabies exposure', 8),
    ('human', 'Unusual disease clusters', 9), ('human', 'Maternal health referrals', 10),
    ('human', 'Child health referrals', 11), ('human', 'Deaths reported', 12), ('human', 'Unusual deaths', 13),
    ('human', 'Public health alerts generated', 14), ('human', 'Other significant health events', 15),

    ('animal', 'Livestock inspected / observed', 1), ('animal', 'Poultry flocks visited', 2),
    ('animal', 'Animal disease events identified', 3), ('animal', 'Sudden livestock deaths', 4),
    ('animal', 'Poultry mortality events', 5), ('animal', 'Suspected zoonotic animal cases', 6),
    ('animal', 'Animal-bite incidents', 7), ('animal', 'Dog-bite cases reported', 8),
    ('animal', 'Cat-bite cases reported', 9), ('animal', 'Livestock vaccination campaigns supported', 10),
    ('animal', 'Poultry vaccination campaigns supported', 11), ('animal', 'Deworming campaigns supported', 12),
    ('animal', 'Unusual animal behaviour', 13), ('animal', 'Animal disease clusters', 14),
    ('animal', 'Carcass disposal issues', 15), ('animal', 'Veterinary referrals', 16),

    ('wildlife', 'Wildlife mortality events reported', 1), ('wildlife', 'Sick / injured wildlife reported', 2),
    ('wildlife', 'Human-wildlife conflict incidents', 3), ('wildlife', 'Wildlife entering villages', 4),
    ('wildlife', 'Wildlife rescue coordination', 5), ('wildlife', 'Wildlife bite / scratch incidents', 6),
    ('wildlife', 'Unusual wildlife behaviour', 7), ('wildlife', 'Wildlife carcasses observed', 8),
    ('wildlife', 'Wildlife disease alerts', 9),

    ('environment', 'Suspected water contamination events', 1), ('environment', 'Illegal carcass disposal', 2),
    ('environment', 'Open dumping sites identified', 3), ('environment', 'Vector breeding sites identified', 4),
    ('environment', 'Flood-related risks', 5), ('environment', 'Drought-related risks', 6),
    ('environment', 'Waste-management issues', 7), ('environment', 'Sewage contamination', 8),
    ('environment', 'Unsafe drinking-water sources', 9), ('environment', 'Dead animal disposal sites', 10),
    ('environment', 'Chemical / pesticide exposure risks', 11), ('environment', 'Food safety / environmental risks', 12),
    ('environment', 'Other environmental hazards', 13)
) AS x(sector, name, ord);

-- ... and "Other" last, which opens the specify box.
INSERT INTO event_type_master (event_type_name, event_kind, applicable_sectors, is_other, sort_order) VALUES
    ('Other', 'EVENT_BASED', ARRAY['human','animal','wildlife','environment'], TRUE, 999);

INSERT INTO alert_category_master (alert_category_name, applicable_sectors, is_zoonotic, sort_order) VALUES
    ('Human health alert',                 ARRAY['human'],                                    FALSE, 1),
    ('Animal health alert',                ARRAY['animal'],                                   FALSE, 2),
    ('Wildlife alert',                     ARRAY['wildlife'],                                 FALSE, 3),
    ('Environmental alert',                ARRAY['environment'],                              FALSE, 4),
    ('Zoonotic disease alert',             ARRAY['human','animal','wildlife'],                TRUE,  5),
    ('Mass mortality',                     ARRAY['animal','wildlife'],                        FALSE, 6),
    ('Animal bite / rabies alert',         ARRAY['human','animal'],                           TRUE,  7),
    ('Food / water safety alert',          ARRAY['human','environment'],                      FALSE, 8),
    ('Disaster / environmental emergency', ARRAY['human','animal','wildlife','environment'],  FALSE, 9),
    ('Other unusual event',                ARRAY['human','animal','wildlife','environment'],  FALSE, 10);

INSERT INTO department_master (department_name, is_other, sort_order) VALUES
    ('Public Health Department', FALSE, 1), ('Animal Department', FALSE, 2),
    ('Wildlife Department', FALSE, 3), ('Environment Department', FALSE, 4),
    ('Rural Department', FALSE, 5), ('Urban Department', FALSE, 6);

INSERT INTO cohv_institution_type_master (
    department_id, field_label, option_name, is_other, sort_order
)
SELECT d.department_id, x.field_label, x.option_name, x.is_other, x.sort_order
FROM (
    VALUES
        ('Public Health Department', 'Health facility', 'PHC', FALSE, 1),
        ('Public Health Department', 'Health facility', 'CHC', FALSE, 2),
        ('Public Health Department', 'Health facility', 'Other', TRUE, 3),
        ('Animal Department', 'Veterinary institution', 'Veterinary Dispensary', FALSE, 1),
        ('Animal Department', 'Veterinary institution', 'Veterinary Hospital', FALSE, 2),
        ('Animal Department', 'Veterinary institution', 'Other', TRUE, 3),
        ('Wildlife Department', 'Forest institution', 'Forest Beat Office', FALSE, 1),
        ('Wildlife Department', 'Forest institution', 'Forest Range Office', FALSE, 2),
        ('Wildlife Department', 'Forest institution', 'Forest Division Office (DFO)', FALSE, 3),
        ('Wildlife Department', 'Forest institution', 'Wildlife Sanctuary', FALSE, 4),
        ('Wildlife Department', 'Forest institution', 'National Park', FALSE, 5),
        ('Wildlife Department', 'Forest institution', 'Tiger Reserve', FALSE, 6),
        ('Wildlife Department', 'Forest institution', 'Other', TRUE, 7),
        ('Environment Department', 'Environment institution', 'State Pollution Control Board - Regional / District Office', FALSE, 1),
        ('Environment Department', 'Environment institution', 'Urban Local Body (Municipal Corporation / Municipality)', FALSE, 2),
        ('Environment Department', 'Environment institution', 'Gram Panchayat (Sanitation)', FALSE, 3),
        ('Environment Department', 'Environment institution', 'District Environment Committee', FALSE, 4),
        ('Environment Department', 'Environment institution', 'Other', TRUE, 5)
) AS x(department_name, field_label, option_name, is_other, sort_order)
JOIN department_master d ON d.department_name = x.department_name;

INSERT INTO referral_facility_master (referral_stream, referral_facility_name, is_other, sort_order) VALUES
    ('HUMAN', 'Sub-Centre / HWC', FALSE, 1), ('HUMAN', 'PHC', FALSE, 2), ('HUMAN', 'CHC', FALSE, 3),
    ('HUMAN', 'District Hospital', FALSE, 4), ('HUMAN', 'Medical College / Tertiary Facility', FALSE, 5),
    ('HUMAN', 'Mobile Health Unit', FALSE, 6), ('HUMAN', 'Emergency Referral', FALSE, 7), ('HUMAN', 'Other', TRUE, 99),
    ('ANIMAL', 'Veterinary Dispensary', FALSE, 1), ('ANIMAL', 'Veterinary Hospital', FALSE, 2),
    ('ANIMAL', 'Veterinary Polyclinic', FALSE, 3), ('ANIMAL', 'Other', TRUE, 99);

INSERT INTO sample_type_master (sample_type_name, applicable_sectors, is_other, sort_order) VALUES
    ('Human samples',            ARRAY['human'],                                   FALSE, 1),
    ('Livestock samples',        ARRAY['animal'],                                  FALSE, 2),
    ('Poultry samples',          ARRAY['animal'],                                  FALSE, 3),
    ('Companion animal samples', ARRAY['animal','human'],                          FALSE, 4),
    ('Wildlife samples',         ARRAY['wildlife'],                                FALSE, 5),
    ('Water samples',            ARRAY['environment'],                             FALSE, 6),
    ('Food samples',             ARRAY['human','environment'],                     FALSE, 7),
    ('Environmental samples',    ARRAY['environment'],                             FALSE, 8),
    ('Other',                    ARRAY['human','animal','wildlife','environment'], TRUE,  99);

INSERT INTO awareness_activity_master (awareness_activity_name, applicable_sectors, is_other, sort_order) VALUES
    ('Village meetings',                       ARRAY['human','animal','wildlife','environment'], FALSE, 1),
    ('School awareness sessions',              ARRAY['human','animal','wildlife','environment'], FALSE, 2),
    ('Household awareness visits',             ARRAY['human','animal','wildlife','environment'], FALSE, 3),
    ('IEC materials distributed',              ARRAY['human','animal','wildlife','environment'], FALSE, 4),
    ('Street plays',                           ARRAY['human','animal','wildlife','environment'], FALSE, 5),
    ('Health camps supported',                 ARRAY['human','animal'],                          FALSE, 6),
    ('Vaccination awareness campaigns',        ARRAY['human','animal'],                          FALSE, 7),
    ('Disease awareness sessions',             ARRAY['human','animal','wildlife','environment'], FALSE, 8),
    ('Food-safety awareness sessions',         ARRAY['human','environment'],                     FALSE, 9),
    ('Water, sanitation and hygiene sessions', ARRAY['human','environment'],                     FALSE, 10),
    ('Rabies awareness sessions',              ARRAY['human','animal'],                          FALSE, 11),
    ('Zoonotic disease awareness sessions',    ARRAY['human','animal','wildlife'],               FALSE, 12),
    ('Animal husbandry awareness sessions',    ARRAY['animal'],                                  FALSE, 13),
    ('Wildlife-risk awareness sessions',       ARRAY['human','wildlife'],                        FALSE, 14),
    ('Other',                                  ARRAY['human','animal','wildlife','environment'], TRUE,  99);

INSERT INTO awareness_topic_master (awareness_topic_name, is_other, sort_order) VALUES
    ('Personal hygiene and handwashing', FALSE, 1), ('Safe drinking water', FALSE, 2),
    ('Sanitation and waste disposal', FALSE, 3), ('Rabies and animal bites', FALSE, 4),
    ('Zoonotic diseases', FALSE, 5), ('Safe milk and meat handling', FALSE, 6), ('Food safety', FALSE, 7),
    ('Vector control', FALSE, 8), ('Livestock vaccination', FALSE, 9), ('Animal husbandry practices', FALSE, 10),
    ('Antimicrobial resistance', FALSE, 11), ('Wildlife contact risks', FALSE, 12),
    ('Outbreak reporting and early warning', FALSE, 13), ('Other', TRUE, 99);

INSERT INTO training_master (training_name, is_other, sort_order) VALUES
    ('Initial COHV Training', FALSE, 1), ('Refresher Training', FALSE, 2), ('Disease-specific Training', FALSE, 3),
    ('Emergency Response', FALSE, 4), ('Digital Reporting', FALSE, 5), ('Rabies / Animal Bite Management', FALSE, 6),
    ('One Health Surveillance', FALSE, 7), ('Other', TRUE, 99);

INSERT INTO meeting_type_master (meeting_type_name, applicable_sectors, is_other, sort_order) VALUES
    ('Village Health, Sanitation & Nutrition Committee', ARRAY['human','environment'],                     FALSE, 1),
    ('Panchayat Meetings',                ARRAY['human','animal','wildlife','environment'], FALSE, 2),
    ('Veterinary Coordination Meetings',  ARRAY['animal','wildlife'],                       FALSE, 3),
    ('Health Department Meetings',        ARRAY['human'],                                   FALSE, 4),
    ('Forest Department Meetings',        ARRAY['wildlife','environment'],                  FALSE, 5),
    ('One Health Meetings',               ARRAY['human','animal','wildlife','environment'], FALSE, 6),
    ('District Review Meetings',          ARRAY['human','animal','wildlife','environment'], FALSE, 7),
    ('Emergency Coordination Meetings',   ARRAY['human','animal','wildlife','environment'], FALSE, 8),
    ('Other Meetings',                    ARRAY['human','animal','wildlife','environment'], TRUE,  99);

INSERT INTO coverage_parameter_master (coverage_parameter_code, coverage_parameter_name, applicable_sectors, sort_order) VALUES
    ('villages_covered',                  'Villages Covered',                   ARRAY['human','animal','wildlife','environment'], 1),
    ('hamlets_covered',                   'Hamlets Covered',                    ARRAY['human','animal','wildlife','environment'], 2),
    ('households_covered',                'Households Covered',                 ARRAY['human','animal','wildlife','environment'], 3),
    ('estimated_human_population',        'Estimated Human Population',         ARRAY['human','environment'],                     4),
    ('estimated_livestock_population',    'Estimated Livestock Population',     ARRAY['animal'],                                  5),
    ('poultry_population',                'Poultry Population',                 ARRAY['animal'],                                  6),
    ('companion_animals',                 'Companion Animals',                  ARRAY['animal','human'],                          7),
    ('major_wildlife_interface_areas',    'Major Wildlife Interface Areas',     ARRAY['wildlife','environment'],                  8),
    ('water_bodies_covered',              'Water Bodies Covered',               ARRAY['wildlife','environment'],                  9),
    ('markets_weekly_haats_covered',      'Markets / Weekly Haats Covered',     ARRAY['human','animal','environment'],            10),
    ('schools_hostels_covered',           'Schools / Hostels Covered',          ARRAY['human','environment'],                     11),
    ('farms_livestock_premises_visited',  'Farms / Livestock Premises Visited', ARRAY['animal'],                                  12),
    ('high_risk_locations_identified',    'High-Risk Locations Identified',     ARRAY['human','animal','wildlife','environment'], 13);

COMMIT;
