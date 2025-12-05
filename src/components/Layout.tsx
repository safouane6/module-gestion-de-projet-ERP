import React from 'react';
import {
    LayoutDashboard,
    FolderKanban,
    Clock,
    FileText,
    Settings,
    Bell,
    Menu
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    currentUser: User;
    onNavigate: (page: string) => void;
    currentPage: string;
}

const Layout: React.FC<LayoutProps> = ({ children, currentUser, onNavigate, currentPage }) => {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

    const NavItem = ({ page, icon: Icon, label }: { page: string, icon: any, label: string }) => (
        <button
            onClick={() => onNavigate(page)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-150 ${
                currentPage === page
                    ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
        >
            <Icon size={20} />
            {label}
        </button>
    );

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col z-20`}
            >
                <div className="h-16 flex items-center justify-center border-b border-gray-200 px-4">
                    <div className="flex items-center gap-2 font-bold text-xl text-blue-700 overflow-hidden whitespace-nowrap">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            N
                        </div>
                        {isSidebarOpen && <span>NEXUS ERP</span>}
                    </div>
                </div>

                <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
                    <NavItem page="dashboard" icon={LayoutDashboard} label={isSidebarOpen ? "Dashboard" : ""} />
                    <NavItem page="projects" icon={FolderKanban} label={isSidebarOpen ? "Projects" : ""} />
                    <NavItem page="timesheets" icon={Clock} label={isSidebarOpen ? "Timesheets" : ""} />
                    <NavItem page="changes" icon={FileText} label={isSidebarOpen ? "Change Requests" : ""} />
                    <NavItem page="settings" icon={Settings} label={isSidebarOpen ? "Settings" : ""} />
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                        <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                        {isSidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                                <p className="text-xs text-gray-500 truncate">{currentUser.role}</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                        <Menu size={20} />
                    </button>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                        <div className="h-8 w-px bg-gray-300 mx-2"></div>
                        <span className="text-sm text-gray-500 italic">Environment: Dev (Local)</span>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-6 scroll-smooth">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;