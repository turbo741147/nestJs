-- Наполнение БД для задачи 07 (Express) и задачи 08 (Nest),
-- в объёме, на котором уже видно скорость запросов Романа.
--
-- Таблицы и колонки совпадают с SQL из программы:
--   projects, tasks                         — задача 07
--   users, comments, labels, task_labels    — задача 08
--   comments.parent_id, tasks.completed_at,
--   tasks.deleted_at, projects.status       — отчёты задач 09–13
--
-- Идентификаторы текстовые, как в условии Express: user-1, project-1, task-1.
-- Якорные строки:
--   user-1      roman@example.com, Роман Пусков, manager, active
--   project-1   Mentoring API, проект с большим числом задач
--   task-32001  задача user-1 в project-2, статус todo, без deleted_at
-- Пользователи user-4001 .. user-5000 не являются исполнителями ни одной задачи.
--
-- Цепочка комментариев для рекурсивного CTE, глубина 3:
--   comment-6 (корень) ← comment-7 ← comment-8 ← comment-9
--
-- Скрипт идемпотентный: создаёт недостающие таблицы и колонки,
-- затем полностью очищает эти таблицы и заполняет их заново.
-- TRUNCATE ... CASCADE затронет и другие таблицы, которые на них ссылаются.
--
-- Данные детерминированные: random() не используется, повторный запуск
-- даёт те же идентификаторы и те же даты. Возраст задач считается
-- от reference_time, а не от текущего времени.
--
-- Вторичные индексы внизу файла закомментированы.
-- Сначала снимите план без них, потом раскомментируйте и сравните.
--
-- Запуск:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "Программа/Задачи/seed-express-nestjs.sql"

DO $$
DECLARE
  -- Объём. Для слабой машины: task_count 100000, comment_count 200000.
  user_count constant integer := 5000;
  project_count constant integer := 1000;
  task_count constant integer := 400000;
  comment_count constant integer := 800000;
  idle_user_count constant integer := 1000;
  empty_project_count constant integer := 200;
  hot_project_count constant integer := 40;
  archived_project_count constant integer := 50;
  hot_task_percent constant integer := 92;
  hot_comment_percent constant integer := 60;
  hot_comment_task_pool constant integer := 50000;

  -- Предохранитель, чтобы случайно не залить диск.
  max_task_count constant integer := 2000000;
  max_comment_count constant integer := 5000000;

  -- Распределение.
  percent_bucket constant integer := 100;
  status_bucket constant integer := 20;
  todo_status_below constant integer := 8;
  in_progress_status_below constant integer := 13;
  done_status_below constant integer := 18;
  role_bucket constant integer := 20;
  manager_role_max_residue constant integer := 3;
  inactive_user_modulus constant integer := 12;
  inactive_assignee_slots constant integer := 40;
  unassigned_task_modulus constant integer := 8;
  blocked_stale_modulus constant integer := 2;
  soft_delete_modulus constant integer := 50;
  soft_delete_delay_days constant integer := 3;
  null_description_modulus constant integer := 10;
  labeled_task_modulus constant integer := 2;
  second_label_modulus constant integer := 5;
  second_label_shift constant integer := 2;
  comment_chain_mod constant integer := 7;
  comment_reply_residues constant integer := 3;
  created_by_stride constant integer := 3;
  completion_jitter_multiplier constant integer := 13;
  completion_jitter_days constant integer := 21;
  touch_delay_days constant integer := 5;
  comment_delay_hours constant integer := 240;

  -- Календарь набора. 23 сентября 2026 — дата, от которой считаются возрасты.
  reference_time constant timestamptz := timestamptz '2026-09-23 12:00:00+00';
  history_days constant integer := 240;
  seconds_per_day constant integer := 86400;
  id_series_start constant integer := 1;

  assignee_pool integer;
  cold_project_count integer;
  comment_task_pool integer;
  label_count integer;
  title_count integer;
  inserted_rows integer;
  started_at timestamptz;

  label_names text[] := ARRAY[
    'backend', 'frontend', 'sql', 'nestjs', 'express',
    'bug', 'feature', 'refactor', 'docs', 'test',
    'performance', 'security', 'migration', 'prisma', 'api',
    'validation', 'pagination', 'auth', 'logging', 'devops',
    'blocked', 'urgent', 'review', 'spike', 'chore',
    'database', 'index', 'transaction', 'report', 'seed'
  ];

  title_samples text[] := ARRAY[
    'Подключить PostgreSQL',
    'Перенести API на Nest',
    'Добавить Guard',
    'Добавить пагинацию',
    'Починить фильтр статуса',
    'Описать DTO для задач',
    'Разобрать падение миграции',
    'Добавить retry',
    'Подключить Prisma',
    'Покрыть список задач индексами'
  ];
BEGIN
  started_at := clock_timestamp();
  PERFORM set_config('statement_timeout', '0', true);

  label_count := coalesce(array_length(label_names, 1), 0);
  title_count := coalesce(array_length(title_samples, 1), 0);
  assignee_pool := user_count - idle_user_count;
  cold_project_count := project_count - empty_project_count - hot_project_count;
  comment_task_pool := least(hot_comment_task_pool, task_count);

  IF task_count > max_task_count OR comment_count > max_comment_count THEN
    RAISE EXCEPTION
      'Volume is above the safety cap (tasks %, comments %)',
      max_task_count, max_comment_count;
  END IF;

  IF label_count < 1 OR title_count < 1 THEN
    RAISE EXCEPTION 'label_names and title_samples must not be empty';
  END IF;

  IF assignee_pool < 1
    OR cold_project_count < 1
    OR hot_project_count < 1
    OR empty_project_count < 0
    OR archived_project_count > empty_project_count
    OR inactive_assignee_slots < 1
    OR comment_task_pool < 1
    OR user_count < inactive_user_modulus * inactive_assignee_slots
    OR assignee_pool < inactive_user_modulus * inactive_assignee_slots
  THEN
    RAISE EXCEPTION 'Volume constants are inconsistent. Check pools and project splits.';
  END IF;

  CREATE TABLE IF NOT EXISTS public.users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    role text NOT NULL,
    status text NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'manager', 'developer')),
    CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive'))
  );

  CREATE TABLE IF NOT EXISTS public.projects (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL,
    CONSTRAINT projects_status_check CHECK (status IN ('active', 'archived'))
  );

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.projects
      ADD COLUMN status text DEFAULT 'active';
  END IF;

  CREATE TABLE IF NOT EXISTS public.tasks (
    id text PRIMARY KEY,
    project_id text NOT NULL REFERENCES public.projects (id),
    title text NOT NULL,
    description text,
    status text NOT NULL,
    assignee_id text REFERENCES public.users (id),
    created_by_id text REFERENCES public.users (id),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    completed_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT tasks_status_check CHECK (
      status IN ('todo', 'in_progress', 'done', 'blocked')
    )
  );

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'created_by_id'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN created_by_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN deleted_at timestamptz;
  END IF;

  CREATE TABLE IF NOT EXISTS public.comments (
    id text PRIMARY KEY,
    task_id text NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
    author_id text NOT NULL REFERENCES public.users (id),
    parent_id text REFERENCES public.comments (id) ON DELETE CASCADE,
    body text NOT NULL,
    created_at timestamptz NOT NULL
  );

  CREATE TABLE IF NOT EXISTS public.labels (
    id text PRIMARY KEY,
    name text NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS public.task_labels (
    task_id text NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
    label_id text NOT NULL REFERENCES public.labels (id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
  );

  TRUNCATE TABLE
    public.task_labels,
    public.comments,
    public.tasks,
    public.labels,
    public.projects,
    public.users
  CASCADE;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    JOIN pg_attribute AS attribute_row
      ON attribute_row.attrelid = constraint_row.conrelid
     AND attribute_row.attnum = ANY (constraint_row.conkey)
    WHERE constraint_row.conrelid = 'public.tasks'::regclass
      AND constraint_row.contype = 'f'
      AND attribute_row.attname = 'project_id'
      AND array_length(constraint_row.conkey, 1) = 1
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    JOIN pg_attribute AS attribute_row
      ON attribute_row.attrelid = constraint_row.conrelid
     AND attribute_row.attnum = ANY (constraint_row.conkey)
    WHERE constraint_row.conrelid = 'public.tasks'::regclass
      AND constraint_row.contype = 'f'
      AND attribute_row.attname = 'assignee_id'
      AND array_length(constraint_row.conkey, 1) = 1
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_assignee_id_fkey
      FOREIGN KEY (assignee_id) REFERENCES public.users (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    JOIN pg_attribute AS attribute_row
      ON attribute_row.attrelid = constraint_row.conrelid
     AND attribute_row.attnum = ANY (constraint_row.conkey)
    WHERE constraint_row.conrelid = 'public.tasks'::regclass
      AND constraint_row.contype = 'f'
      AND attribute_row.attname = 'created_by_id'
      AND array_length(constraint_row.conkey, 1) = 1
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_created_by_id_fkey
      FOREIGN KEY (created_by_id) REFERENCES public.users (id);
  END IF;

  RAISE NOTICE 'Inserting % users', user_count;
  INSERT INTO public.users (id, email, name, role, status, created_at)
  SELECT
    'user-' || gs,
    CASE
      WHEN gs = id_series_start THEN 'roman@example.com'
      ELSE 'user-' || gs || '@example.com'
    END,
    CASE
      WHEN gs = id_series_start THEN 'Роман Пусков'
      ELSE 'User ' || gs
    END,
    CASE
      WHEN gs = id_series_start THEN 'manager'
      WHEN gs % role_bucket = 0 THEN 'admin'
      WHEN gs % role_bucket <= manager_role_max_residue THEN 'manager'
      ELSE 'developer'
    END,
    CASE
      WHEN gs = id_series_start THEN 'active'
      WHEN gs % inactive_user_modulus = 0 THEN 'inactive'
      ELSE 'active'
    END,
    reference_time - ((gs % history_days) * interval '1 day')
  FROM generate_series(id_series_start, user_count) AS gs;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RAISE NOTICE 'users: %', inserted_rows;

  RAISE NOTICE 'Inserting % projects', project_count;
  INSERT INTO public.projects (id, name, description, status, created_at)
  SELECT
    'project-' || gs,
    CASE
      WHEN gs = id_series_start THEN 'Mentoring API'
      ELSE 'Project ' || gs
    END,
    CASE
      WHEN gs % null_description_modulus = 0 THEN NULL
      ELSE 'Проект для проверки списков, фильтров и отчётов. Номер ' || gs
    END,
    CASE
      WHEN gs > project_count - archived_project_count THEN 'archived'
      ELSE 'active'
    END,
    reference_time - ((gs % history_days) * interval '1 day')
  FROM generate_series(id_series_start, project_count) AS gs;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RAISE NOTICE 'projects: %', inserted_rows;

  RAISE NOTICE 'Inserting % labels', label_count;
  INSERT INTO public.labels (id, name)
  SELECT
    'label-' || gs,
    label_names[gs]
  FROM generate_series(id_series_start, label_count) AS gs;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RAISE NOTICE 'labels: %', inserted_rows;

  RAISE NOTICE 'Inserting % tasks', task_count;
  INSERT INTO public.tasks (
    id,
    project_id,
    title,
    description,
    status,
    assignee_id,
    created_by_id,
    created_at,
    updated_at,
    completed_at,
    deleted_at
  )
  SELECT
    'task-' || src.gs,
    'project-' || src.project_number,
    title_samples[id_series_start + (src.gs % title_count)] || ' #' || src.gs,
    CASE
      WHEN src.gs % null_description_modulus = 0 THEN NULL
      ELSE 'Задача для проверки фильтров status, assignee_id и пагинации. Номер ' || src.gs
    END,
    src.status,
    CASE
      WHEN src.gs % unassigned_task_modulus = 0 THEN NULL
      WHEN src.status = 'blocked' AND src.gs % blocked_stale_modulus = 0 THEN
        'user-' || (
          inactive_user_modulus * (
            id_series_start + (src.gs % inactive_assignee_slots)
          )
        )
      ELSE 'user-' || (
        id_series_start + (
          (src.gs / unassigned_task_modulus) % assignee_pool
        )
      )
    END,
    'user-' || (
      id_series_start + ((src.gs * created_by_stride) % user_count)
    ),
    src.created_at,
    CASE
      WHEN src.status = 'blocked' AND src.gs % blocked_stale_modulus = 0 THEN src.created_at
      WHEN src.status = 'done' THEN src.completed_at
      ELSE least(
        reference_time,
        src.created_at + ((src.gs % touch_delay_days) * interval '1 day')
      )
    END,
    CASE
      WHEN src.status = 'done' THEN src.completed_at
      ELSE NULL
    END,
    CASE
      WHEN src.gs % soft_delete_modulus = 0 THEN
        least(
          reference_time,
          src.created_at + (soft_delete_delay_days * interval '1 day')
        )
      ELSE NULL
    END
  FROM (
    SELECT
      gs,
      CASE
        WHEN gs % percent_bucket < hot_task_percent THEN
          id_series_start + (gs % hot_project_count)
        ELSE
          -- Деление, а не второй остаток: 100 и cold_project_count не взаимно просты,
          -- и повторный modulo оставлял бы часть холодных проектов пустыми.
          hot_project_count + id_series_start
            + ((gs / percent_bucket) % cold_project_count)
      END AS project_number,
      CASE
        WHEN gs % status_bucket < todo_status_below THEN 'todo'
        WHEN gs % status_bucket < in_progress_status_below THEN 'in_progress'
        WHEN gs % status_bucket < done_status_below THEN 'done'
        ELSE 'blocked'
      END AS status,
      reference_time
        - ((gs % history_days) * interval '1 day')
        - ((gs % seconds_per_day) * interval '1 second') AS created_at,
      least(
        reference_time,
        (
          reference_time
            - ((gs % history_days) * interval '1 day')
            - ((gs % seconds_per_day) * interval '1 second')
        ) + (
          ((gs::bigint * completion_jitter_multiplier) % completion_jitter_days)
          * interval '1 day'
        )
      ) AS completed_at
    FROM generate_series(id_series_start, task_count) AS gs
  ) AS src;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RAISE NOTICE 'tasks: %', inserted_rows;

  RAISE NOTICE 'Inserting % comments', comment_count;
  INSERT INTO public.comments (
    id,
    task_id,
    author_id,
    parent_id,
    body,
    created_at
  )
  SELECT
    'comment-' || src.gs,
    'task-' || src.task_number,
    'user-' || (id_series_start + (src.gs % user_count)),
    CASE
      WHEN src.gs > comment_reply_residues
       AND (src.gs % comment_chain_mod) < comment_reply_residues
      THEN 'comment-' || (src.gs - id_series_start)
      ELSE NULL
    END,
    'Комментарий ' || src.gs || ' к задаче ' || src.task_number,
    least(
      reference_time,
      task_row.created_at + ((src.gs % comment_delay_hours) * interval '1 hour')
    )
  FROM (
    SELECT
      gs,
      CASE
        WHEN gs % percent_bucket < hot_comment_percent THEN
          id_series_start + (gs % comment_task_pool)
        ELSE
          id_series_start + (gs % task_count)
      END AS task_number
    FROM generate_series(id_series_start, comment_count) AS gs
  ) AS src
  JOIN public.tasks AS task_row
    ON task_row.id = 'task-' || src.task_number;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RAISE NOTICE 'comments: %', inserted_rows;

  RAISE NOTICE 'Inserting task labels';
  INSERT INTO public.task_labels (task_id, label_id)
  SELECT
    'task-' || gs,
    'label-' || (id_series_start + (gs % label_count))
  FROM generate_series(id_series_start, task_count) AS gs
  WHERE gs % labeled_task_modulus = 0;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RAISE NOTICE 'task_labels first pass: %', inserted_rows;

  INSERT INTO public.task_labels (task_id, label_id)
  SELECT
    'task-' || gs,
    'label-' || (id_series_start + ((gs / second_label_shift) % label_count))
  FROM generate_series(id_series_start, task_count) AS gs
  WHERE gs % second_label_modulus = 0
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;
  RAISE NOTICE 'task_labels second pass: %', inserted_rows;

  ANALYZE public.users;
  ANALYZE public.projects;
  ANALYZE public.labels;
  ANALYZE public.tasks;
  ANALYZE public.comments;
  ANALYZE public.task_labels;

  RAISE NOTICE 'Seed finished in % seconds',
    round(extract(epoch FROM clock_timestamp() - started_at)::numeric, 1);
END $$;
