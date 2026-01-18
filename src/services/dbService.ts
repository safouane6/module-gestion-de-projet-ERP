import { supabase } from '../lib/supabaseClient';
import { Project, Task, ChangeRequest, TimesheetEntry, ProjectLog } from '../types';

export const dbService = {
    // Profiles
    async getProfile(userId: string): Promise<any> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    },

    // Projects
    async getProjects(userId?: string, role?: string): Promise<Project[]> {
        let query = supabase.from('projects').select('*');

        // If not admin and userId is provided, filter projects the user is a member of
        if (role !== 'ADMIN' && userId) {
            const { data: memberProjects, error: memberError } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('user_id', userId);

            if (memberError) throw memberError;
            const projectIds = memberProjects.map((mp: any) => mp.project_id);
            query = query.in('id', projectIds);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((p: any) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description,
            startDate: p.start_date,
            endDate: p.end_date,
            status: p.status,
            budget: Number(p.budget),
            managerId: p.manager_id,
            progress: p.progress
        }));
    },

    async addProject(project: Partial<Project>): Promise<Project> {
        const { data, error } = await supabase
            .from('projects')
            .insert([{
                code: project.code,
                name: project.name,
                description: project.description,
                start_date: project.startDate,
                end_date: project.endDate,
                status: project.status,
                budget: project.budget,
                manager_id: project.managerId && project.managerId.length > 5 ? project.managerId : null, // Handle non-UUID mock IDs
                progress: project.progress || 0
            }])
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            code: data.code,
            name: data.name,
            description: data.description,
            startDate: data.start_date,
            endDate: data.end_date,
            status: data.status,
            budget: Number(data.budget),
            managerId: data.manager_id,
            progress: data.progress
        };
    },

    async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
        const { error } = await supabase
            .from('projects')
            .update({
                name: updates.name,
                description: updates.description,
                start_date: updates.startDate,
                end_date: updates.endDate,
                status: updates.status,
                budget: updates.budget,
                progress: updates.progress
            })
            .eq('id', projectId);
        if (error) throw error;
    },

    // Tasks
    async getTasks(projectId?: string): Promise<Task[]> {
        let query = supabase.from('tasks').select('*');
        if (projectId) query = query.eq('project_id', projectId);

        const { data, error } = await query;
        if (error) throw error;

        return data.map((t: any) => ({
            id: t.id,
            projectId: t.project_id,
            name: t.name,
            startDate: t.start_date,
            endDate: t.end_date,
            assigneeId: t.assignee_id,
            status: t.status,
            progress: t.progress,
            dependencies: t.dependencies
        }));
    },

    async addTask(task: Partial<Task>): Promise<Task> {
        const { data, error } = await supabase
            .from('tasks')
            .insert([{
                project_id: task.projectId,
                name: task.name,
                start_date: task.startDate,
                end_date: task.endDate,
                assignee_id: task.assigneeId,
                status: task.status,
                progress: task.progress || 0,
                dependencies: task.dependencies || []
            }])
            .select()
            .single();

        if (error) throw error;
        return {
            id: data.id,
            projectId: data.project_id,
            name: data.name,
            startDate: data.start_date,
            endDate: data.end_date,
            assigneeId: data.assignee_id,
            status: data.status,
            progress: data.progress,
            dependencies: data.dependencies
        };
    },

    async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
        const { error } = await supabase
            .from('tasks')
            .update({
                name: updates.name,
                status: updates.status,
                progress: updates.progress,
                assignee_id: updates.assigneeId,
                start_date: updates.startDate,
                end_date: updates.endDate
            })
            .eq('id', taskId);

        if (error) throw error;
    },

    // Change Requests
    async getChangeRequests(): Promise<ChangeRequest[]> {
        const { data, error } = await supabase
            .from('change_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((cr: any) => ({
            id: cr.id,
            projectId: cr.project_id,
            title: cr.title,
            description: cr.description,
            impact: cr.impact,
            costImpact: Number(cr.cost_impact),
            timeImpactDays: cr.time_impact_days,
            status: cr.status,
            requesterId: cr.requester_id,
            createdAt: cr.created_at
        }));
    },

    // Timesheets
    async getTimesheets(): Promise<TimesheetEntry[]> {
        const { data, error } = await supabase
            .from('timesheets')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        return data.map((ts: any) => ({
            id: ts.id,
            userId: ts.user_id,
            projectId: ts.project_id,
            taskId: ts.task_id,
            date: ts.date,
            hours: Number(ts.hours),
            description: ts.description,
            status: ts.status as any
        }));
    },

    // Collaborators
    async searchUsersByEmail(email: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', `%${email}%`);
        if (error) throw error;
        return data;
    },

    async addProjectMember(projectId: string, userId: string, role: string = 'MEMBER'): Promise<void> {
        const { error } = await supabase
            .from('project_members')
            .insert([{ project_id: projectId, user_id: userId, role }]);
        if (error) throw error;
    },

    async getProjectMembers(projectId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('project_members')
            .select('*, profiles(*)')
            .eq('project_id', projectId);
        if (error) throw error;
        return data;
    },

    async updateProjectMemberRole(memberId: string, role: string): Promise<void> {
        const { error } = await supabase
            .from('project_members')
            .update({ role })
            .eq('id', memberId);
        if (error) throw error;
    },

    // Project Logging Methods
    async logProjectAction(projectId: string, userId: string, action: string, details: any = {}): Promise<void> {
        if (!userId || userId.length < 5) return; // Skip logging for mock/none users
        await supabase.from('project_logs').insert([{
            project_id: projectId,
            user_id: userId,
            action: action,
            details: details
        }]);
    },

    async getProjectLogs(projectId: string): Promise<ProjectLog[]> {
        const { data, error } = await supabase
            .from('project_logs')
            .select('*, profiles(name)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map((d: any) => ({
            id: d.id,
            projectId: d.project_id,
            userId: d.user_id,
            action: d.action,
            details: d.details,
            createdAt: d.created_at,
            userName: d.profiles?.name || 'Unknown User'
        }));
    }
};
