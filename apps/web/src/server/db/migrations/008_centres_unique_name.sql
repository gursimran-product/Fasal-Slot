-- Seeding re-inserted "Karnal Mandi" etc. on every `npm run seed` run because
-- centres had no uniqueness constraint, silently duplicating centre rows.
-- Consolidate each (name, state) group onto one canonical row -- preferring
-- whichever duplicate an agent is actually assigned to, since that's the one
-- in active use -- repoint every foreign key at it, delete the rest, and add
-- a real constraint so seeding becomes idempotent going forward.
WITH canonical AS (
  SELECT DISTINCT ON (c.name, COALESCE(c.state, ''))
    c.id, c.name, c.state
  FROM centres c
  LEFT JOIN agents a ON a.centre_id = c.id
  ORDER BY c.name, COALESCE(c.state, ''), (a.id IS NOT NULL) DESC, c.created_at ASC
),
mapping AS (
  SELECT c.id AS old_id, canon.id AS new_id
  FROM centres c
  JOIN canonical canon
    ON canon.name = c.name AND COALESCE(canon.state, '') = COALESCE(c.state, '')
  WHERE c.id != canon.id
)
UPDATE bookings SET centre_id = mapping.new_id FROM mapping WHERE bookings.centre_id = mapping.old_id;

WITH canonical AS (
  SELECT DISTINCT ON (c.name, COALESCE(c.state, ''))
    c.id, c.name, c.state
  FROM centres c
  LEFT JOIN agents a ON a.centre_id = c.id
  ORDER BY c.name, COALESCE(c.state, ''), (a.id IS NOT NULL) DESC, c.created_at ASC
),
mapping AS (
  SELECT c.id AS old_id, canon.id AS new_id
  FROM centres c
  JOIN canonical canon
    ON canon.name = c.name AND COALESCE(canon.state, '') = COALESCE(c.state, '')
  WHERE c.id != canon.id
)
UPDATE agents SET centre_id = mapping.new_id FROM mapping WHERE agents.centre_id = mapping.old_id;

WITH canonical AS (
  SELECT DISTINCT ON (c.name, COALESCE(c.state, ''))
    c.id, c.name, c.state
  FROM centres c
  LEFT JOIN agents a ON a.centre_id = c.id
  ORDER BY c.name, COALESCE(c.state, ''), (a.id IS NOT NULL) DESC, c.created_at ASC
),
mapping AS (
  SELECT c.id AS old_id, canon.id AS new_id
  FROM centres c
  JOIN canonical canon
    ON canon.name = c.name AND COALESCE(canon.state, '') = COALESCE(c.state, '')
  WHERE c.id != canon.id
)
UPDATE govt_users SET centre_id = mapping.new_id FROM mapping WHERE govt_users.centre_id = mapping.old_id;

WITH canonical AS (
  SELECT DISTINCT ON (c.name, COALESCE(c.state, ''))
    c.id, c.name, c.state
  FROM centres c
  LEFT JOIN agents a ON a.centre_id = c.id
  ORDER BY c.name, COALESCE(c.state, ''), (a.id IS NOT NULL) DESC, c.created_at ASC
),
mapping AS (
  SELECT c.id AS old_id, canon.id AS new_id
  FROM centres c
  JOIN canonical canon
    ON canon.name = c.name AND COALESCE(canon.state, '') = COALESCE(c.state, '')
  WHERE c.id != canon.id
)
UPDATE mandi_officials SET centre_id = mapping.new_id FROM mapping WHERE mandi_officials.centre_id = mapping.old_id;

WITH canonical AS (
  SELECT DISTINCT ON (c.name, COALESCE(c.state, ''))
    c.id, c.name, c.state
  FROM centres c
  LEFT JOIN agents a ON a.centre_id = c.id
  ORDER BY c.name, COALESCE(c.state, ''), (a.id IS NOT NULL) DESC, c.created_at ASC
),
mapping AS (
  SELECT c.id AS old_id, canon.id AS new_id
  FROM centres c
  JOIN canonical canon
    ON canon.name = c.name AND COALESCE(canon.state, '') = COALESCE(c.state, '')
  WHERE c.id != canon.id
)
DELETE FROM centre_yard_status y USING mapping
  WHERE y.centre_id = mapping.old_id
    AND EXISTS (SELECT 1 FROM centre_yard_status WHERE centre_id = mapping.new_id);

WITH canonical AS (
  SELECT DISTINCT ON (c.name, COALESCE(c.state, ''))
    c.id, c.name, c.state
  FROM centres c
  LEFT JOIN agents a ON a.centre_id = c.id
  ORDER BY c.name, COALESCE(c.state, ''), (a.id IS NOT NULL) DESC, c.created_at ASC
),
mapping AS (
  SELECT c.id AS old_id, canon.id AS new_id
  FROM centres c
  JOIN canonical canon
    ON canon.name = c.name AND COALESCE(canon.state, '') = COALESCE(c.state, '')
  WHERE c.id != canon.id
)
UPDATE centre_yard_status SET centre_id = mapping.new_id FROM mapping WHERE centre_yard_status.centre_id = mapping.old_id;

-- Capacity rows for abandoned duplicate centres aren't worth merging cell by
-- cell (overlapping (date, time_window) rows across duplicates would still
-- collide with each other after remapping) -- just drop them; the canonical
-- centre keeps its own capacity rows untouched.
WITH canonical AS (
  SELECT DISTINCT ON (c.name, COALESCE(c.state, ''))
    c.id, c.name, c.state
  FROM centres c
  LEFT JOIN agents a ON a.centre_id = c.id
  ORDER BY c.name, COALESCE(c.state, ''), (a.id IS NOT NULL) DESC, c.created_at ASC
),
mapping AS (
  SELECT c.id AS old_id
  FROM centres c
  JOIN canonical canon
    ON canon.name = c.name AND COALESCE(canon.state, '') = COALESCE(c.state, '')
  WHERE c.id != canon.id
)
DELETE FROM centre_capacity cc USING mapping WHERE cc.centre_id = mapping.old_id;

WITH canonical AS (
  SELECT DISTINCT ON (c.name, COALESCE(c.state, ''))
    c.id, c.name, c.state
  FROM centres c
  LEFT JOIN agents a ON a.centre_id = c.id
  ORDER BY c.name, COALESCE(c.state, ''), (a.id IS NOT NULL) DESC, c.created_at ASC
)
DELETE FROM centres c
WHERE NOT EXISTS (SELECT 1 FROM canonical WHERE canonical.id = c.id);

ALTER TABLE centres ADD CONSTRAINT centres_name_state_unique UNIQUE (name, state);
