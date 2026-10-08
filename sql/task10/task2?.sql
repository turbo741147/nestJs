//не понял как отсортировать 

with recursive comment_tree as (
    SELECT id as comment_id, parent_id, 1 as depth, body 
    FROM comments
    WHERE parent_id is null

    union all

    select c.id , c.parent_id, ct.depth + 1, c.body 
    from comments c
    join comment_tree ct on c.parent_id = ct.comment_id
)
select * from comment_tree
