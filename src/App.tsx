import React, { useState } from 'react';
import {
    MOCK_USERS,
    MOCK_PROJECTS,
    MOCK_TASKS,
    MOCK_CRS,
    MOCK_TIMESHEETS
} from './services/mockData';
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

type Page = 'dashboard' | 'projects' | 'project-detail' | 'changes' | 'timesheets' | 'settings';

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [currentUser] = useState(MOCK_USERS[1]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
    const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
    const [crs, setCrs] = useState<ChangeRequest[]>(MOCK_CRS);

    const handleNavigate = (page: string) => {
        setCurrentPage(page as Page);
        if (page !== 'project-detail') setSelectedProjectId(null);
    };

    const handleProjectSelect = (id: string) => {
        setSelectedProjectId(id);
        setCurrentPage('project-detail');
    };

    const handleAddProject = (p: Partial<Project>) => {
        const newProject: Project = {
            ...p as Project,
            id: `p${Date.now()}`,
            code: `PRJ-2024-${Math.floor(Math.random() * 1000)}`,
            status: p.status || ProjectStatus.DRAFT,
            progress: 0,
            managerId: currentUser.id
        };
        setProjects([...projects, newProject]);
    };

    const handleAddTask = (t: Partial<Task>) => {
        const newTask: Task = {
            ...t as Task,
            id: `t${Date.now()}`,
            progress: 0
        };
        setTasks([...tasks, newTask]);
    };

    const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    };

    const handleApproveCR = (id: string) => {
        setCrs(crs.map(cr => cr.id === id ? { ...cr, status: CRStatus.APPROVED } : cr));
        const cr = crs.find(c => c.id === id);
        if (cr) {
            setProjects(projects.map(p =>
                p.id === cr.projectId
                    ? { ...p, budget: p.budget + cr.costImpact }
                    : p
            ));
        }
    };

    const handleRejectCR = (id: string) => {
        setCrs(crs.map(cr => cr.id === id ? { ...cr, status: CRStatus.REJECTED } : cr));
    };

    const renderContent = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard projects={projects} tasks={tasks} />;
            case 'projects':
                return <ProjectList projects={projects} onSelectProject={handleProjectSelect} onAddProject={handleAddProject} />;
            case 'project-detail':
                const project = projects.find(p => p.id === selectedProjectId);
                if (!project) return <div>Project not found</div>;
                return (
                    <ProjectDetail
                        project={project}
                        tasks={tasks.filter(t => t.projectId === project.id)}
                        onAddTask={handleAddTask}
                        onUpdateProject={() => {}}
                        onUpdateTask={handleUpdateTask}
                    />
                );
            case 'changes':
                return <ChangeRequests crs={crs} onApprove={handleApproveCR} onReject={handleRejectCR} />;
            case 'timesheets':
                return <Timesheets entries={MOCK_TIMESHEETS} projects={projects} tasks={tasks} />;
            case 'settings':
                return (
                    <div className="p-8 text-center text-gray-500">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">System Configuration</h2>
                        <p>Webhook configuration and RBAC settings would go here.</p>
                        <div className="mt-8 bg-white p-6 rounded-lg border max-w-2xl mx-auto text-left">
                            <h3 className="font-mono text-sm font-bold mb-2">Integration Points (OpenAPI)</h3>
                            <code className="block bg-gray-100 p-4 rounded text-xs font-mono">
                                POST /webhooks/subscribe {"{ event: 'project.closed', url: 'https://finance.nexus/api/close' }"}
                            </code>
                        </div>
                    </div>
                );
            default:
                return <div>Page not found</div>;
        }
    };

    return (
        <Layout currentUser={currentUser} onNavigate={handleNavigate} currentPage={currentPage}>
            {renderContent()}
        </Layout>
    );
}

export default App;