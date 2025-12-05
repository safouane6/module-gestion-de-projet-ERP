export enum UserRole {
    ADMIN = 'ADMIN',
    PROJECT_MANAGER = 'PROJECT_MANAGER',
    MEMBER = 'MEMBER',
    MANAGER = 'MANAGER',
    CAB_APPROVER = 'CAB_APPROVER',
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

export enum ProjectStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    ON_HOLD = 'ON_HOLD',
    COMPLETED = 'COMPLETED',
    CLOSED = 'CLOSED',
}

export interface Project {
    id: string;
    code: string;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    status: ProjectStatus;
    budget: number;
    managerId: string;
    progress: number; // 0-100
}

export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    REVIEW = 'REVIEW',
    DONE = 'DONE',
}

export interface Task {
    id: string;
    projectId: string;
    name: string;
    startDate: string;
    endDate: string;
    assigneeId?: string;
    status: TaskStatus;
    progress: number;
    dependencies?: string[]; // IDs of prerequisite tasks
}

export enum CRStatus {
    SUBMITTED = 'SUBMITTED',
    IMPACT_ANALYSIS = 'IMPACT_ANALYSIS',
    CAB_REVIEW = 'CAB_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export interface ChangeRequest {
    id: string;
    projectId: string;
    title: string;
    description: string;
    impact: string; // Analysis text
    costImpact: number;
    timeImpactDays: number;
    status: CRStatus;
    requesterId: string;
    createdAt: string;
}

export interface TimesheetEntry {
    id: string;
    userId: string;
    projectId: string;
    taskId: string;
    date: string;
    hours: number;
    description: string;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED';
}