-- Same duplicate-seeding class of bug as centres: without a constraint,
-- re-running the seed script after 008's centre consolidation duplicated
-- mandi_officials rows onto the newly-canonical centre id.
DELETE FROM mandi_officials a USING mandi_officials b
  WHERE a.centre_id = b.centre_id AND a.name = b.name AND a.id > b.id;

ALTER TABLE mandi_officials ADD CONSTRAINT mandi_officials_centre_name_unique UNIQUE (centre_id, name);
