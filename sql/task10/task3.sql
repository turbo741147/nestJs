-- 1. Считаем комментарии для каждой задачи
WITH count_comment_in_task AS (
    SELECT 
        t.project_id,
        t.id AS task_id,
		title as task_title,
        COUNT(c.id) AS count_comment
    FROM tasks t
    LEFT JOIN comments c ON t.id = c.task_id
    GROUP BY t.project_id, t.id
),


-- 2. Нумеруем задачи внутри каждого проекта (от большего к меньшему)
ranked_tasks AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (
            PARTITION BY project_id 
            ORDER BY count_comment DESC
        ) AS rank_in_project 
    FROM count_comment_in_task

),
-- 3. Оставляем ТОЛЬКО ТОП-3
get_top_task_where_top_comment as (
	SELECT *
	FROM ranked_tasks
	WHERE rank_in_project <= 3
	ORDER by  count_comment DESC,project_id DESC, rank_in_project ASC
)

SELECT 
    *
FROM get_top_task_where_top_comment


