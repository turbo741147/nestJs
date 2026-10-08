with task_position_by_create_date as (
	SELECT 
	assignee_id,
	id as task_id,
	title,
	created_at::date ,
	ROW_NUMBER() OVER (
        PARTITION BY assignee_id 
        ORDER BY date(created_at) ASC
    ) AS row_num
	FROM TASKS 

)

SELECT 
    assignee_id,
	task_id ,
	title,
	created_at
	FROM task_position_by_create_date
	WHERE row_num = 1
	
	


