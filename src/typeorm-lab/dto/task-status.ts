export const taskStatuses = ['todo', 'in_progress', 'done', 'blocked'] as const;

export type TaskStatus = (typeof taskStatuses)[number];
