import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, Task, TaskStatus } from '../types';
import { generateProjectWBS, generateStatusReport } from '../services/geminiService';
import { Calendar, CheckSquare, BarChart2, Plus, Wand2, FileDown, X, Link, GripVertical, ZoomIn, ZoomOut, Percent, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';

interface ProjectDetailProps {
    project: Project;
    tasks: Task[];
    onAddTask: (task: Partial<Task>) => void;
    onUpdateProject: (id: string, updates: Partial<Project>) => void;
    onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

const parseDate = (str: string) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const getDaysDiff = (start: string, end: string) => {
    const d1 = parseDate(start);
    const d2 = parseDate(end);
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

const addDays = (dateStr: string, days: number) => {
    const date = parseDate(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

const TASK_STYLES = {
    [TaskStatus.TODO]: { base: 'bg-slate-100 border-slate-300', fill: 'bg-slate-500', text: 'text-slate-700' },
    [TaskStatus.IN_PROGRESS]: { base: 'bg-blue-100 border-blue-300', fill: 'bg-blue-600', text: 'text-blue-700' },
    [TaskStatus.REVIEW]: { base: 'bg-purple-100 border-purple-300', fill: 'bg-purple-600', text: 'text-purple-700' },
    [TaskStatus.DONE]: { base: 'bg-emerald-100 border-emerald-300', fill: 'bg-emerald-600', text: 'text-emerald-700' },
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, tasks, onAddTask, onUpdateProject, onUpdateTask }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'wbs' | 'gantt'>('overview');
    const [isGeneratingWBS, setIsGeneratingWBS] = useState(false);
    const [reportText, setReportText] = useState('');

    const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('comfortable');
    const [showGanttSidebar, setShowGanttSidebar] = useState(true);
    const pxPerDay = viewMode === 'comfortable' ? 50 : 20;

    const [showTaskModal, setShowTaskModal] = useState(false);
    const [dependencySearch, setDependencySearch] = useState('');
    const [newTask, setNewTask] = useState<Partial<Task>>({
        name: '',
        startDate: project.startDate,
        endDate: project.endDate,
        status: TaskStatus.TODO,
        progress: 0,
        dependencies: [],
        assigneeId: ''
    });

    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOffsetPixels, setDragOffsetPixels] = useState<number>(0);

    const [progressModalTaskId, setProgressModalTaskId] = useState<string | null>(null);
    const progressModalTask = tasks.find(t => t.id === progressModalTaskId);

    const dragRef = useRef<{
        id: string | null;
        startX: number;
        mode: 'move' | 'progress' | 'resize-left' | 'resize-right';
        initialLeft: number;
        initialWidth: number;
    }>({ id: null, startX: 0, mode: 'move', initialLeft: 0, initialWidth: 0 });

    const handleUpdateProgress = (taskId: string, newProgress: number) => {
        const progress = Math.min(100, Math.max(0, newProgress));
        let newStatus = TaskStatus.IN_PROGRESS;
        if (progress === 100) newStatus = TaskStatus.DONE;
        if (progress === 0) newStatus = TaskStatus.TODO;

        const currentTask = tasks.find(t => t.id === taskId);
        if (currentTask?.status === TaskStatus.REVIEW && progress < 100 && progress > 0) {
            newStatus = TaskStatus.REVIEW;
        }

        onUpdateTask(taskId, {
            progress,
            status: newStatus
        });
    };

    useEffect(() => {
        const handleWindowMouseMove = (e: MouseEvent) => {
            if (!dragRef.current.id) return;

            if (dragRef.current.mode === 'move' || dragRef.current.mode === 'resize-left' || dragRef.current.mode === 'resize-right') {
                const diff = e.clientX - dragRef.current.startX;
                setDragOffsetPixels(diff);
            } else if (dragRef.current.mode === 'progress') {
                const { initialLeft, initialWidth, id } = dragRef.current;
                const relativeX = e.clientX - initialLeft;
                let newProgress = Math.round((relativeX / initialWidth) * 100);
                newProgress = Math.round(newProgress / 5) * 5;
                newProgress = Math.max(0, Math.min(100, newProgress));
                handleUpdateProgress(id!, newProgress);
            }
        };

        const handleWindowMouseUp = (e: MouseEvent) => {
            if (dragRef.current.id) {
                const taskId = dragRef.current.id;
                const diffPixels = e.clientX - dragRef.current.startX;
                const diffDays = Math.round(diffPixels / pxPerDay);
                const task = tasks.find(t => t.id === taskId);

                if (task) {
                    if (dragRef.current.mode === 'move' && diffDays !== 0) {
                        const newStart = addDays(task.startDate, diffDays);
                        const duration = getDaysDiff(task.startDate, task.endDate);
                        const newEnd = addDays(newStart, duration);
                        onUpdateTask(taskId, { startDate: newStart, endDate: newEnd });
                    } else if (dragRef.current.mode === 'resize-left' && diffDays !== 0) {
                        const newStart = addDays(task.startDate, diffDays);
                        if (getDaysDiff(newStart, task.endDate) >= 0) {
                            onUpdateTask(taskId, { startDate: newStart });
                        }
                    } else if (dragRef.current.mode === 'resize-right' && diffDays !== 0) {
                        const newEnd = addDays(task.endDate, diffDays);
                        if (getDaysDiff(task.startDate, newEnd) >= 0) {
                            onUpdateTask(taskId, { endDate: newEnd });
                        }
                    }
                }

                setDraggedTaskId(null);
                setDragOffsetPixels(0);
                dragRef.current = { id: null, startX: 0, mode: 'move', initialLeft: 0, initialWidth: 0 };
            }
        };

        window.addEventListener('mousemove', handleWindowMouseMove);
        window.addEventListener('mouseup', handleWindowMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleWindowMouseMove);
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [tasks, onUpdateTask, pxPerDay]);

    const handleMouseDownMove = (e: React.MouseEvent, task: Task) => {
        if ((e.target as HTMLElement).closest('.cursor-col-resize') || (e.target as HTMLElement).closest('.cursor-ew-resize')) return;

        e.preventDefault();
        if (dragRef.current.id) return;

        setDraggedTaskId(task.id);
        setDragOffsetPixels(0);
        dragRef.current = {
            id: task.id,
            startX: e.clientX,
            mode: 'move',
            initialLeft: 0,
            initialWidth: 0
        };
    };

    const handleMouseDownResize = (e: React.MouseEvent, task: Task, direction: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        if (dragRef.current.id) return;

        const barElement = (e.currentTarget as HTMLElement).closest('[data-task-bar]');
        if (!barElement) return;
        const rect = barElement.getBoundingClientRect();

        setDraggedTaskId(task.id);
        setDragOffsetPixels(0);
        dragRef.current = {
            id: task.id,
            startX: e.clientX,
            mode: direction === 'left' ? 'resize-left' : 'resize-right',
            initialLeft: rect.left,
            initialWidth: rect.width
        };
    };

    const handleMouseDownProgress = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        e.stopPropagation();

        const barElement = (e.currentTarget as HTMLElement).closest('[data-task-bar]');
        if (!barElement) return;
        const rect = barElement.getBoundingClientRect();

        setDraggedTaskId(task.id);
        dragRef.current = {
            id: task.id,
            startX: e.clientX,
            mode: 'progress',
            initialLeft: rect.left,
            initialWidth: rect.width
        };
    };

    const handleGenerateWBS = async () => {
        setIsGeneratingWBS(true);
        const jsonString = await generateProjectWBS(project.description);
        try {
            const generatedTasks = JSON.parse(jsonString);
            if (Array.isArray(generatedTasks)) {
                generatedTasks.forEach(t => {
                    onAddTask({
                        name: t.name,
                        projectId: project.id,
                        status: TaskStatus.TODO,
                        startDate: project.startDate,
                        endDate: project.endDate,
                        progress: 0
                    });
                });
            }
        } catch (e) {
            console.error("Failed to parse WBS", e);
        }
        setIsGeneratingWBS(false);
    };

    const handleGenerateReport = async () => {
        setReportText('Generating report...');
        const text = await generateStatusReport({ project, tasks });
        setReportText(text);
    };

    const toggleDependency = (taskId: string) => {
        setNewTask(prev => {
            const currentDeps = prev.dependencies || [];
            if (currentDeps.includes(taskId)) {
                return { ...prev, dependencies: currentDeps.filter(id => id !== taskId) };
            } else {
                return { ...prev, dependencies: [...currentDeps, taskId] };
            }
        });
    };

    const handleSaveTask = () => {
        if (!newTask.name) return;
        onAddTask({
            ...newTask,
            projectId: project.id
        });
        setShowTaskModal(false);
        setNewTask({
            name: '',
            startDate: project.startDate,
            endDate: project.endDate,
            status: TaskStatus.TODO,
            progress: 0,
            dependencies: [],
            assigneeId: ''
        });
        setDependencySearch('');
    };

    const projectDuration = Math.max(getDaysDiff(project.startDate, project.endDate), 1);
    const chartStartDate = addDays(project.startDate, -3);
    const chartEndDate = addDays(project.endDate, 14);
    const totalChartDays = Math.max(getDaysDiff(chartStartDate, chartEndDate), projectDuration + 14);
    const timelineDates = Array.from({ length: totalChartDays }, (_, i) => addDays(chartStartDate, i));

    const monthGroups: { label: string; days: number }[] = [];
    let currentMonthLabel = '';
    let currentMonthCount = 0;
    timelineDates.forEach(date => {
        const d = parseDate(date);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (label !== currentMonthLabel) {
            if (currentMonthLabel) monthGroups.push({ label: currentMonthLabel, days: currentMonthCount });
            currentMonthLabel = label;
            currentMonthCount = 1;
        } else {
            currentMonthCount++;
        }
    });
    if (currentMonthLabel) monthGroups.push({ label: currentMonthLabel, days: currentMonthCount });

    const taskIndices = useMemo(() => {
        return tasks.reduce((acc, t, i) => {
            acc[t.id] = i;
            return acc;
        }, {} as Record<string, number>);
    }, [tasks]);

    const getTaskCoordinates = (task: Task) => {
        const daysFromStart = getDaysDiff(chartStartDate, task.startDate);
        const duration = Math.max(getDaysDiff(task.startDate, task.endDate), 1);
        const left = daysFromStart * pxPerDay;
        const width = duration * pxPerDay;

        const isDraggingMove = draggedTaskId === task.id && dragRef.current.mode === 'move';
        const isResizingLeft = draggedTaskId === task.id && dragRef.current.mode === 'resize-left';
        const isResizingRight = draggedTaskId === task.id && dragRef.current.mode === 'resize-right';

        let currentLeft = left;
        let currentWidth = width;

        if (isDraggingMove) {
            currentLeft += dragOffsetPixels;
        } else if (isResizingLeft) {
            currentWidth = Math.max(pxPerDay, width - dragOffsetPixels);
            currentLeft = left + (width - currentWidth);
        } else if (isResizingRight) {
            currentWidth = Math.max(pxPerDay, width + dragOffsetPixels);
        }

        return {
            startX: currentLeft,
            endX: currentLeft + currentWidth,
        };
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">{project.status}</span>
                        </div>
                        <p className="text-gray-500 max-w-2xl">{project.description}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Budget</p>
                        <p className="text-xl font-bold text-gray-900">${project.budget.toLocaleString()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 mt-8 border-b border-gray-200 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart2 },
                        { id: 'wbs', label: 'WBS & Tasks', icon: CheckSquare },
                        { id: 'gantt', label: 'Gantt Chart', icon: Calendar },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] flex flex-col">

                {activeTab === 'overview' && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold">Project Status Report</h3>
                            <button onClick={handleGenerateReport} className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg hover:bg-purple-100">
                                <Wand2 size={16} />
                                Generate AI Report
                            </button>
                        </div>
                        {reportText ? (
                            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 prose prose-sm max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-gray-700">{reportText}</pre>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <FileDown size={48} className="mx-auto mb-4 text-gray-300" />
                                <p>No report generated yet. Use AI to create a draft.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'wbs' && (
                    <div className="p-6">
                        <div className="flex justify-between mb-4 flex-wrap gap-2">
                            <h3 className="text-lg font-semibold">Work Breakdown Structure</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleGenerateWBS}
                                    disabled={isGeneratingWBS}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                                >
                                    <Wand2 size={16} />
                                    {isGeneratingWBS ? 'Generating...' : 'AI Suggest Tasks'}
                                </button>
                                <button
                                    onClick={() => setShowTaskModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    <Plus size={16} />
                                    Add Task
                                </button>
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-gray-50 text-gray-700 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Task Name</th>
                                    <th className="px-4 py-3">Assignee</th>
                                    <th className="px-4 py-3">Dependencies</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 w-40">Progress</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                {tasks.length === 0 && (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-500">No tasks defined yet.</td></tr>
                                )}
                                {tasks.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                                        <td className="px-4 py-3 text-gray-500">{t.assigneeId ? 'Charlie Dev' : 'Unassigned'}</td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {t.dependencies?.length ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {t.dependencies.map(depId => {
                                                        const depTask = tasks.find(tsk => tsk.id === depId);
                                                        return depTask ? (
                                                            <span key={depId} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                                                            {depTask.name.substring(0, 10)}{depTask.name.length > 10 ? '...' : ''}
                                                        </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            ) : <span className="text-gray-400 italic">None</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs border ${
                                            t.status === TaskStatus.DONE ? 'bg-green-50 text-green-700 border-green-200' :
                                                t.status === TaskStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}>
                                            {t.status}
                                        </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={t.progress}
                                                    onChange={(e) => handleUpdateProgress(t.id, parseInt(e.target.value))}
                                                    className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-gray-300 transition-colors"
                                                />
                                                <span className="text-xs font-medium text-gray-700 w-8 text-right">{t.progress}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'gantt' && (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b bg-gray-50 gap-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowGanttSidebar(!showGanttSidebar)}
                                    className="p-1.5 text-gray-500 hover:bg-gray-100 rounded border border-gray-200"
                                    title={showGanttSidebar ? "Hide Sidebar" : "Show Sidebar"}
                                >
                                    {showGanttSidebar ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                                </button>
                                <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-600">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded border border-emerald-600"></div> Done</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded border border-blue-600"></div> In Progress</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 rounded border border-slate-500"></div> Todo</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                                    <button
                                        onClick={() => setViewMode('comfortable')}
                                        className={`p-1.5 rounded ${viewMode === 'comfortable' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
                                        title="Comfortable View"
                                    >
                                        <ZoomIn size={16} />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('compact')}
                                        className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
                                        title="Compact View"
                                    >
                                        <ZoomOut size={16} />
                                    </button>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2 hidden sm:flex">
                                    <GripVertical size={14} />
                                    Drag bar to move • Drag edges to resize
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto relative bg-white">
                            <div className="min-w-fit h-full flex flex-col">
                                <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
                                    <div className="flex h-8 border-b border-gray-100 bg-gray-50">
                                        <div className={`sticky left-0 bg-gray-50 border-r z-40 flex-shrink-0 transition-all duration-300 ${showGanttSidebar ? 'w-32 md:w-56' : 'w-0 border-none'}`}></div>
                                        {monthGroups.map((group, i) => (
                                            <div
                                                key={i}
                                                className="flex-shrink-0 border-r border-gray-200 px-2 flex items-center text-xs font-bold text-gray-600"
                                                style={{ width: group.days * pxPerDay }}
                                            >
                                                <span className="sticky left-0">{group.label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex h-10">
                                        <div className={`sticky left-0 bg-white border-r z-40 flex items-center px-4 font-semibold text-xs text-gray-500 flex-shrink-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${showGanttSidebar ? 'w-32 md:w-56' : 'w-0 border-none'}`}>
                                            {showGanttSidebar && "Task Name"}
                                        </div>
                                        {timelineDates.map((date) => {
                                            const d = parseDate(date);
                                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                            return (
                                                <div
                                                    key={date}
                                                    className={`flex-shrink-0 border-r flex flex-col justify-center items-center text-[10px] ${isWeekend ? 'bg-gray-50' : 'bg-white'}`}
                                                    style={{ width: pxPerDay }}
                                                >
                                                    <span className="font-bold text-gray-700">{d.getDate()}</span>
                                                    {viewMode === 'comfortable' && (
                                                        <span className="text-gray-400">{d.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="relative flex-1">
                                    <div className={`absolute inset-0 flex pointer-events-none transition-all duration-300 ${showGanttSidebar ? 'left-32 md:left-56' : 'left-0'}`}>
                                        {timelineDates.map((date, i) => (
                                            <div key={i} className="border-r border-gray-100 h-full" style={{ width: pxPerDay }}></div>
                                        ))}
                                    </div>

                                    <svg
                                        className={`absolute top-0 h-full pointer-events-none z-0 transition-all duration-300 ${showGanttSidebar ? 'left-32 md:left-56' : 'left-0'}`}
                                        style={{ width: timelineDates.length * pxPerDay, height: tasks.length * 48 }}
                                    >
                                        <defs>
                                            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                                <path d="M0,0 L6,2 L0,4" fill="#94a3b8" />
                                            </marker>
                                        </defs>
                                        {tasks.map((task, index) => {
                                            if (!task.dependencies || task.dependencies.length === 0) return null;

                                            return task.dependencies.map(depId => {
                                                const depIndex = taskIndices[depId];
                                                if (depIndex === undefined) return null;
                                                const depTask = tasks[depIndex];

                                                const startCoords = getTaskCoordinates(depTask);
                                                const endCoords = getTaskCoordinates(task);

                                                const startX = startCoords.endX;
                                                const startY = depIndex * 48 + 24;
                                                const endX = endCoords.startX;
                                                const endY = index * 48 + 24;

                                                const deltaX = 20;
                                                const path = `M ${startX} ${startY} 
                                                    C ${startX + deltaX} ${startY}, 
                                                        ${endX - deltaX} ${endY}, 
                                                        ${endX} ${endY}`;

                                                return (
                                                    <path
                                                        key={`${depId}-${task.id}`}
                                                        d={path}
                                                        fill="none"
                                                        stroke="#94a3b8"
                                                        strokeWidth="1.5"
                                                        markerEnd="url(#arrowhead)"
                                                    />
                                                );
                                            });
                                        })}
                                    </svg>

                                    <div className="pb-8">
                                        {tasks.map((task) => {
                                            const daysFromStart = getDaysDiff(chartStartDate, task.startDate);
                                            const duration = Math.max(getDaysDiff(task.startDate, task.endDate), 1);
                                            const left = daysFromStart * pxPerDay;
                                            const width = duration * pxPerDay;

                                            const isDraggingMove = draggedTaskId === task.id && dragRef.current.mode === 'move';
                                            const isResizingLeft = draggedTaskId === task.id && dragRef.current.mode === 'resize-left';
                                            const isResizingRight = draggedTaskId === task.id && dragRef.current.mode === 'resize-right';

                                            let currentLeft = left;
                                            let currentWidth = width;

                                            if (isDraggingMove) {
                                                currentLeft += dragOffsetPixels;
                                            } else if (isResizingLeft) {
                                                currentWidth = Math.max(pxPerDay, width - dragOffsetPixels);
                                                currentLeft = left + (width - currentWidth);
                                            } else if (isResizingRight) {
                                                currentWidth = Math.max(pxPerDay, width + dragOffsetPixels);
                                            }

                                            const style = TASK_STYLES[task.status];

                                            return (
                                                <div key={task.id} className="flex h-12 border-b border-gray-50 group hover:bg-blue-50/30 transition-colors">
                                                    <div className={`sticky left-0 bg-white group-hover:bg-blue-50/30 border-r flex items-center px-4 z-20 flex-shrink-0 transition-all duration-300 overflow-hidden whitespace-nowrap ${showGanttSidebar ? 'w-32 md:w-56' : 'w-0 border-none'}`}>
                                                        {showGanttSidebar && <p className="text-sm text-gray-900 truncate w-full" title={task.name}>{task.name}</p>}
                                                    </div>

                                                    <div className="relative flex-1">
                                                        <div
                                                            data-task-bar
                                                            className={`absolute top-2 h-8 rounded-md shadow-sm border text-xs flex items-center select-none overflow-visible
                                                        ${style.base}
                                                        ${isDraggingMove ? 'ring-2 ring-opacity-50 z-20 cursor-grabbing' : 'z-10 cursor-move'}
                                                    `}
                                                            style={{
                                                                left: `${currentLeft}px`,
                                                                width: `${currentWidth}px`,
                                                                transition: (isDraggingMove || isResizingLeft || isResizingRight) ? 'none' : 'all 0.2s'
                                                            }}
                                                            onMouseDown={(e) => handleMouseDownMove(e, task)}
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                setProgressModalTaskId(task.id);
                                                            }}
                                                        >
                                                            <div
                                                                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 z-30 rounded-l-md"
                                                                onMouseDown={(e) => handleMouseDownResize(e, task, 'left')}
                                                            />

                                                            <div
                                                                className={`absolute top-0 left-0 h-full ${style.fill} opacity-90 rounded-l-md transition-all duration-75`}
                                                                style={{ width: `${task.progress}%` }}
                                                            />

                                                            <div
                                                                className={`absolute top-0 bottom-0 w-4 -ml-2 cursor-col-resize flex items-center justify-center transition-opacity z-30
                                                            ${dragRef.current.mode === 'progress' && draggedTaskId === task.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                                        `}
                                                                style={{ left: `${task.progress}%` }}
                                                                onMouseDown={(e) => handleMouseDownProgress(e, task)}
                                                            >
                                                                <div className="w-1.5 h-4 bg-white border border-gray-400 rounded-full shadow-md" />
                                                            </div>

                                                            <div
                                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-black/10 z-30 rounded-r-md"
                                                                onMouseDown={(e) => handleMouseDownResize(e, task, 'right')}
                                                            />

                                                            {(!isDraggingMove && !isResizingLeft && !isResizingRight && draggedTaskId !== task.id) && (
                                                                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-50 pointer-events-none">
                                                                    {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
                                                                    <br/>{task.progress}% Complete
                                                                </div>
                                                            )}

                                                            {(currentWidth > 40 && viewMode === 'comfortable') && (
                                                                <span className={`relative z-10 px-2 truncate font-medium mix-blend-multiply ${style.text}`}>
                                                            {task.progress}%
                                                        </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {progressModalTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Update Progress</h3>
                            <button onClick={() => setProgressModalTaskId(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-gray-500 mb-2">Task: <span className="font-medium text-gray-900">{progressModalTask.name}</span></p>
                            <div className="flex justify-center items-center py-4 gap-2">
                                <span className="text-4xl font-bold text-blue-600">{progressModalTask.progress}</span>
                                <Percent className="text-blue-400 mt-2" size={24} />
                            </div>
                            <input
                                type="range"
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max="100"
                                step="5"
                                value={progressModalTask.progress}
                                onChange={(e) => handleUpdateProgress(progressModalTask.id, parseInt(e.target.value))}
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setProgressModalTaskId(null)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTaskModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Add New Task</h2>
                            <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    value={newTask.name}
                                    onChange={e => setNewTask({...newTask, name: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg p-2"
                                        value={newTask.startDate}
                                        onChange={e => setNewTask({...newTask, startDate: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg p-2"
                                        value={newTask.endDate}
                                        onChange={e => setNewTask({...newTask, endDate: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    className="w-full border rounded-lg p-2"
                                    value={newTask.status}
                                    onChange={e => setNewTask({...newTask, status: e.target.value as TaskStatus})}
                                >
                                    {Object.values(TaskStatus).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Link size={16} /> Dependencies
                                </label>

                                {tasks.length > 5 && (
                                    <div className="relative mb-2">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search tasks..."
                                            className="w-full border rounded-lg pl-8 pr-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                            value={dependencySearch}
                                            onChange={e => setDependencySearch(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="border rounded-lg p-2 max-h-40 overflow-y-auto bg-gray-50 space-y-1">
                                    {tasks.length > 0 ? (
                                        tasks
                                            .filter(t => t.name.toLowerCase().includes(dependencySearch.toLowerCase()))
                                            .map(t => (
                                                <label key={t.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md bg-white border border-transparent hover:border-gray-200 transition-all">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={newTask.dependencies?.includes(t.id) || false}
                                                        onChange={() => toggleDependency(t.id)}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-gray-700 truncate">{t.name}</div>
                                                        <div className="text-[10px] text-gray-400 flex justify-between">
                                                            <span>{parseDate(t.startDate).toLocaleDateString()} - {parseDate(t.endDate).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))
                                    ) : (
                                        <p className="text-sm text-gray-400 italic p-2">No existing tasks to depend on.</p>
                                    )}
                                    {tasks.length > 0 && tasks.filter(t => t.name.toLowerCase().includes(dependencySearch.toLowerCase())).length === 0 && (
                                        <p className="text-sm text-gray-400 italic p-2">No matching tasks found.</p>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Select tasks that must be completed before this one starts.</p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowTaskModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTask}
                                disabled={!newTask.name}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;