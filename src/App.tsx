import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { dbService } from './services/dbService';
import {
    Project,
    Task,
    ChangeRequest,
    CRStatus,
    ProjectStatus
} from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import ProjectDetail from './components/ProjectDetail';
import ChangeRequests from './components/ChangeRequests';
import Timesheets from './components/Timesheets';
import Auth from './components/Auth';

function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();
    const [session, setSession] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [crs, setCrs] = useState<ChangeRequest[]>([]);
    const [timesheets, setTimesheets] = useState<any[]>([]);

    useEffect(() => {
        // Handle Auth state
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!session) return;

        const loadInitialData = async () => {
            try {
                const userProfile = await dbService.getProfile(session.user.id);
                setProfile(userProfile);

                const [fetchedProjects, fetchedTasks, fetchedCrs, fetchedTimesheets] = await Promise.all([
                    dbService.getProjects(session.user.id, userProfile.role),
                    dbService.getTasks(),
                    dbService.getChangeRequests(),
                    dbService.getTimesheets()
                ]);
                setProjects(fetchedProjects);
                setTasks(fetchedTasks);
                setCrs(fetchedCrs);
                setTimesheets(fetchedTimesheets);
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [session]);

    if (!session) {
        return <Auth />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const currentPath = location.pathname.split('/')[1] || 'dashboard';

    const handleAddProject = async (p: Partial<Project>) => {
        try {
            const projectData = {
                ...p,
                code: `PRJ-2024-${Math.floor(Math.random() * 1000)}`,
                status: p.status || ProjectStatus.DRAFT,
                progress: 0,
                managerId: session.user.id
            };
            const newProject = await dbService.addProject(projectData as Project);
            setProjects([newProject, ...projects]);
        } catch (error) {
            console.error('Error adding project:', error);
        }
    };

    const handleAddTask = async (t: Partial<Task>): Promise<Task | undefined> => {
        try {
            const newTask = await dbService.addTask(t);
            setTasks(prev => [...prev, newTask]);
            return newTask;
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    const handleUpdateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
        try {
            await dbService.updateTask(taskId, updates);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleUpdateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
        try {
            await dbService.updateProject(projectId, updates);
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    const handleApproveCR = (id: string) => {
        setCrs(crs.map(cr => cr.id === id ? { ...cr, status: CRStatus.APPROVED } : cr));
    };

    const handleRejectCR = (id: string) => {
        setCrs(crs.map(cr => cr.id === id ? { ...cr, status: CRStatus.REJECTED } : cr));
    };

    return (
        <Layout
            currentUser={{
                id: session.user.id,
                name: profile?.name || session.user.user_metadata.name || session.user.email,
                email: session.user.email,
                role: profile?.role || 'MEMBER',
                avatar: `https://ui-avatars.com/api/?name=${profile?.name || session.user.email}&background=3b82f6&color=fff`
            }}
            onNavigate={(page) => navigate(`/${page}`)}
            currentPage={currentPath}
        >
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard projects={projects} tasks={tasks} />} />
                <Route path="/projects" element={<ProjectList projects={projects} onSelectProject={(id) => navigate(`/projects/${id}`)} onAddProject={handleAddProject} />} />
                <Route path="/projects/:id" element={
                    <ProjectDetailWrapper
                        projects={projects}
                        tasks={tasks}
                        currentUser={profile}
                        onAddTask={handleAddTask}
                        onUpdateProject={handleUpdateProject}
                        onUpdateTask={handleUpdateTask}
                    />
                } />
                <Route path="/changes" element={<ChangeRequests crs={crs} onApprove={handleApproveCR} onReject={handleRejectCR} />} />
                <Route path="/timesheets" element={<Timesheets entries={timesheets} projects={projects} tasks={tasks} />} />
                <Route path="/settings" element={
                    <div className="p-8 text-center text-gray-500">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">System Configuration</h2>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                            Log Out
                        </button>
                    </div>
                } />
            </Routes>
        </Layout>
    );
}

function ProjectDetailWrapper({ projects, tasks, currentUser, onAddTask, onUpdateProject, onUpdateTask }: any) {
    const { id } = useParams();
    const project = projects.find((p: any) => p.id === id);
    if (!project) return <div>Project not found</div>;
    return (
        <ProjectDetail
            project={project}
            tasks={tasks.filter((t: any) => t.projectId === project.id)}
            currentUser={currentUser}
            onAddTask={onAddTask}
            onUpdateProject={onUpdateProject}
            onUpdateTask={onUpdateTask}
        />
    );
}

import { useParams } from 'react-router-dom';

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;