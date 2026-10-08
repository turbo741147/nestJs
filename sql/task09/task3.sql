SELECT
  projects.id as project_id,
  projects.name as project_name,
  COUNT(tasks.id) AS open_task_count
FROM tasks
JOIN projects ON tasks.project_id = projects.id
WHERE tasks.status IN ('todo','in_progress','blocked')
GROUP BY projects.id, projects.name
HAVING COUNT(tasks.id) > 100
ORDER BY open_task_count DESC;
