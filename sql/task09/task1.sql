SELECT
  projects.id as project_id,
  projects.name as project_name,
  tasks.status,
  COUNT(tasks.id) AS task_count
FROM tasks 
JOIN projects ON tasks.project_id = projects.id
GROUP BY projects.id,  tasks.status
ORDER BY projects.id, tasks.status;
	 