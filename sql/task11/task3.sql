WITH closed_tasks AS (
  SELECT
    assignee_id,
    id as task_id,
 
    updated_at::date as completed_at,
    LAG(completed_at::date) OVER (
      PARTITION BY assignee_id
      ORDER BY completed_at
    ) AS previous_completed_on
  FROM tasks
  WHERE status = 'done'
)
SELECT
  *
FROM closed_tasks
WHERE completed_at::date > previous_completed_on::date
ORDER BY assignee_id, completed_at;
