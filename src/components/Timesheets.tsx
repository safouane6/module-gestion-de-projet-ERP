import React from 'react';
import { TimesheetEntry, Task, Project } from '../types';
import { Save, Check } from 'lucide-react';

interface TimesheetsProps {
    entries: TimesheetEntry[];
    projects: Project[];
    tasks: Task[];
}

const Timesheets: React.FC<TimesheetsProps> = ({ entries, projects, tasks }) => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Timesheet</h1>
                    <p className="text-sm text-gray-500">Week of Mar 11, 2024</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                        <Save size={18} /> Save Draft
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
                        <Check size={18} /> Submit for Approval
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-4 font-medium text-gray-700 text-sm">Project / Task</th>
                        {weekDays.map(d => (
                            <th key={d} className="px-4 py-4 font-medium text-gray-700 text-sm w-24 text-center">{d}</th>
                        ))}
                        <th className="px-6 py-4 font-medium text-gray-700 text-sm text-right">Total</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    <tr>
                        <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">ERP Migration Phase 1</div>
                            <div className="text-sm text-gray-500">API Development (Task #3)</div>
                        </td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={8} /></td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={8} /></td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={8} /></td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={4} /></td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={0} /></td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">28.0</td>
                    </tr>
                    <tr>
                        <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">Mobile App Redesign</div>
                            <div className="text-sm text-gray-500">User Research (Task #5)</div>
                        </td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={0} /></td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={0} /></td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={0} /></td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={4} /></td>
                        <td className="p-2"><input type="number" className="w-full text-center border rounded p-2" defaultValue={8} /></td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">12.0</td>
                    </tr>
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                        <td className="px-6 py-4 font-bold text-gray-900">Total Hours</td>
                        <td className="text-center font-medium text-gray-700 py-4">8</td>
                        <td className="text-center font-medium text-gray-700 py-4">8</td>
                        <td className="text-center font-medium text-gray-700 py-4">8</td>
                        <td className="text-center font-medium text-gray-700 py-4">8</td>
                        <td className="text-center font-medium text-gray-700 py-4">8</td>
                        <td className="text-right font-bold text-blue-600 px-6 py-4 text-lg">40.0</td>
                    </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default Timesheets;