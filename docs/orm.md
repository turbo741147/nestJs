# TypeORM-лаба и выбор инструмента


Таблицы созданы раньше. Миграция TypeORM их не пересоздаёт: она добавляет индексы под отчёты.

команда в консоли
npm run migration:run

## Сущность, DTO и ответ API

- Сущности (`Task`, `Project`, `User`) 
- DTO запроса (`CreateTaskDto`, `UpdateTaskDto`) — то, что принимает API, с проверкой полей.
- DTO ответа (`TaskResponseDto`, `TasksByStatusDto`)  - то что отдает back

## CRUD задач

Префикс `/typeorm-lab`.

| Метод | Путь |
|---|---|
| `POST` | `/typeorm-lab/projects/:projectId/tasks` |
| `GET` | `/typeorm-lab/projects/:projectId/tasks?limit=20&offset=0` |
| `GET` | `/typeorm-lab/tasks/:taskId` |
| `PATCH` | `/typeorm-lab/tasks/:taskId` |
| `DELETE` | `/typeorm-lab/tasks/:taskId` |



```json
{
  "id": "…",
  "title": "…",
  "description": null,
  "status": "todo",
  "projectId": "project-1",
  "assigneeId": null,
  "createdAt": "2026-10-12T12:00:00.000Z",
  "updatedAt": "2026-10-12T12:00:00.000Z",
  "completedAt": null
}
```

## Отчёты

### Количество задач по статусам

`GET /typeorm-lab/reports/tasks-by-status`

### Пример запрос с фильтрацией 
`GET /typeorm-lab/reports/tasks-by-status?projectId=project-1`


```json
[
  {
    "projectId": "project-1",
    "status": "in_progress",
    "tasksCount": 4
  }
]
```


### Последняя задача каждого пользователя

`GET /typeorm-lab/reports/latest-tasks`



```json
[
  {
    "userId": "user-1",
    "userName": "Ada",
    "taskId": "task-9",
    "title": "Close the sprint",
    "status": "in_progress",
    "createdAt": "2026-10-01T08:00:00.000Z"
  }
]
```

### Кандидаты на эскалацию

`GET /typeorm-lab/reports/escalation-candidates`



```json
[
  {
    "projectId": "project-1",
    "taskId": "task-3",
    "title": "Stuck review",
    "ageDays": 21,
    "priorityRank": 1
  }
]
```

## Где какой инструмент

Призма удобнее для простых CRUD операций т.к не нужно создавать лишние классы entity и импортировать в Модули в отличие от typeOrm. Одна схема не нужно описывать данные они автоматом потягиваются

typeOrm удобнее при фильтраций т.к можно строить запросы в зависимости от условий , удобен для простых запросов inner join, left join , group by . Но есть нюансы с тем что посторитель запросов можно не соблюдать очередность как в sql. из-за этого сложнее воспринимается код

sql удобнее при сложной выборке использование временых таблиц, with , оконые функии 





