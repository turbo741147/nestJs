
BEGIN;

CREATE TEMP TABLE reassign_params (
  from_user_id text,
  to_user_id text
);

INSERT INTO reassign_params (from_user_id, to_user_id)
VALUES ('user-1', 'user-2');

WITH locked AS (
  SELECT
    tasks.id,
    reassign_params.from_user_id,
    reassign_params.to_user_id
  FROM tasks
  JOIN reassign_params ON tasks.assignee_id = reassign_params.from_user_id
  JOIN users ON users.id = reassign_params.to_user_id
    AND users.status = 'active'
    AND tasks.deleted_at IS NULL
    and tasks.status <> 'done'
  
),
updated AS (
  UPDATE tasks
  SET
    assignee_id = locked.to_user_id,
    updated_at = NOW()
  FROM locked
  WHERE tasks.id = locked.id
  RETURNING tasks.id
)


SELECT
  (SELECT COUNT(*)::integer FROM updated) AS reassigned_tasks_count,
  reassign_params.from_user_id,
  reassign_params.to_user_id
FROM reassign_params;
