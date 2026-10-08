
BEGIN;

WITH candidates AS (
  SELECT tasks.id
  FROM tasks
  WHERE tasks.status = 'blocked'
    AND tasks.deleted_at IS NULL
    AND tasks.updated_at < NOW() - INTERVAL '1000 days'
    AND NOT EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = tasks.assignee_id
        AND users.status = 'active'
    )
  FOR UPDATE
),
updated AS (
  UPDATE tasks
  SET
    status = 'done',
    completed_at = COALESCE(tasks.completed_at, NOW()),
    updated_at = NOW()
  FROM candidates
  WHERE tasks.id = candidates.id
  RETURNING tasks.id
)
SELECT COUNT(*)::integer AS updated_tasks_count
FROM updated;
