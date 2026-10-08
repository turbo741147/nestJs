WITH closed_tasks AS (
  SELECT
    updated_at::date AS day,
    COUNT(*) FILTER (WHERE status = 'done') AS closed_count
  FROM tasks
  GROUP BY updated_at::date
)
SELECT
  day,
  closed_count,
  SUM(closed_count) OVER (
    ORDER BY day
  ) AS running_total
FROM closed_tasks
ORDER BY day;