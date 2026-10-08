SELECT
  u.id as user_id,
  u.email
FROM users u
LEFT JOIN tasks t ON t.assignee_id = u.id
WHERE t.assignee_id is null;