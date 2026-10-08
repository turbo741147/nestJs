
WITH escalation_candidates AS (
  SELECT
    tasks.project_id,
    tasks.id AS task_id,
    tasks.title,
    (CURRENT_DATE - tasks.created_at::date) AS age_days
  FROM tasks
  JOIN projects ON projects.id = tasks.project_id
  WHERE tasks.status <> 'done'
    AND tasks.deleted_at IS NULL
    AND projects.status = 'active'
    AND (CURRENT_DATE - tasks.created_at::date) > 7
),
ranked AS (
  SELECT
    project_id,
    task_id,
    title,
    age_days,
    ROW_NUMBER() OVER (
      PARTITION BY project_id
      ORDER BY age_days DESC, task_id
    ) AS priority_rank
  FROM escalation_candidates
)
SELECT
  project_id,
  task_id,
  title,
  age_days,
  priority_rank
FROM ranked
WHERE priority_rank <= 5
ORDER BY project_id, priority_rank;
