import React from 'react';
import { Project, Task, ProjectStatus, TaskStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface DashboardProps {
    projects: Project[];
    tasks: Task[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const Dashboard: React.FC<DashboardProps> = ({ projects, tasks }) => {
    const activeProjects = projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
    const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
    const pendingTasks = tasks.filter(t => t.status !== TaskStatus.DONE).length;
    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalSpent = projects.reduce((acc, p) => acc + (p.budget * (p.progress / 100)), 0);
    const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const overdueTasks = tasks.filter(t => t.status !== TaskStatus.DONE && new Date(t.endDate) < new Date()).length;

    const budgetData = projects.map(p => ({
        name: p.code,
        budget: p.budget,
        spent: p.budget * (p.progress / 100)
    }));

    const statusData = [
        { name: 'Active', value: activeProjects },
        { name: 'Completed', value: completedProjects },
        { name: 'On Hold', value: projects.filter(p => p.status === ProjectStatus.ON_HOLD).length },
        { name: 'Draft', value: projects.filter(p => p.status === ProjectStatus.DRAFT).length },
    ];

    const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon size={24} className="text-white" />
                </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">{subtext}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
                <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
                    Download Report (PDF)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Active Projects" value={activeProjects} icon={Activity} color="bg-blue-500" subtext={`${completedProjects} completed total`} />
                <StatCard title="Budget Utilization" value={`$${(totalSpent / 1000).toFixed(1)}K`} icon={CheckCircle} color="bg-green-500" subtext={`${utilization}% of $${(totalBudget / 1000).toFixed(1)}K`} />
                <StatCard title="Pending Tasks" value={pendingTasks} icon={Clock} color="bg-orange-500" subtext={`${overdueTasks} overdue`} />
                <StatCard title="Change Requests" value={projects.length > 0 ? "Healthy" : "N/A"} icon={AlertTriangle} color="bg-red-500" subtext="No critical blockers" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Budget vs Actual</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={budgetData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="budget" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Allocated" />
                                <Bar dataKey="spent" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Spent" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Project Portfolio Health</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-sm text-gray-500 mt-2">
                        {statusData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span>{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;