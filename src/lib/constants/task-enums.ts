export const TASK_STATUS_VALUES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];

export const TASK_PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITY_VALUES)[number];
