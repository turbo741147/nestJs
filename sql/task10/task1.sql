WITH open_tasks as (
  SELECT
    tasks.id,
    tasks.project_id
  FROM tasks
  WHERE tasks.status IN ('todo', 'in_progress', 'blocked')
)
SELECT
  projects.id as project_id,
  projects.name as project_name,
  COUNT(open_tasks.id) as open_task_count
FROM open_tasks
JOIN projects ON open_tasks.project_id = projects.id
GROUP BY projects.id, projects.name
HAVING COUNT(open_tasks.id) > 100
ORDER BY open_task_count DESC;