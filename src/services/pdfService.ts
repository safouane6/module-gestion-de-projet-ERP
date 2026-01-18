import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, Task, TaskStatus, ProjectStatus } from '../types';

interface DashboardReportData {
    projects: Project[];
    tasks: Task[];
    generatedAt: Date;
}

interface ProjectReportData {
    project: Project;
    tasks: Task[];
    reportText?: string;
    generatedAt: Date;
}

export const pdfService = {
    /**
     * Generate a comprehensive executive dashboard PDF report
     */
    async generateDashboardReport(data: DashboardReportData): Promise<void> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;

        // Helper function to add a new page if needed
        const checkPageBreak = (requiredSpace: number) => {
            if (yPosition + requiredSpace > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
                return true;
            }
            return false;
        };

        // Header
        doc.setFillColor(59, 130, 246); // Blue
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Executive Dashboard Report', 20, 25);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${data.generatedAt.toLocaleString()}`, 20, 35);

        yPosition = 50;

        // Summary Statistics
        const activeProjects = data.projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
        const completedProjects = data.projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
        const pendingTasks = data.tasks.filter(t => t.status !== TaskStatus.DONE).length;
        const overdueTasks = data.tasks.filter(t => t.status !== TaskStatus.DONE && new Date(t.endDate) < new Date()).length;
        const totalBudget = data.projects.reduce((acc, p) => acc + p.budget, 0);
        const totalSpent = data.projects.reduce((acc, p) => acc + (p.budget * (p.progress / 100)), 0);
        const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Executive Summary', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const summaryData = [
            ['Active Projects', activeProjects.toString()],
            ['Completed Projects', completedProjects.toString()],
            ['Pending Tasks', pendingTasks.toString()],
            ['Overdue Tasks', overdueTasks.toString()],
            ['Total Budget', `$${totalBudget.toLocaleString()}`],
            ['Total Spent', `$${Math.round(totalSpent).toLocaleString()}`],
            ['Budget Utilization', `${utilization}%`],
        ];

        autoTable(doc, {
            startY: yPosition,
            head: [['Metric', 'Value']],
            body: summaryData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 120, fontStyle: 'bold' },
                1: { cellWidth: 60, halign: 'right' }
            }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
        checkPageBreak(30);

        // Project Portfolio Overview
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Project Portfolio', 20, yPosition);
        yPosition += 10;

        const projectTableData = data.projects.length > 0 
            ? data.projects.map(p => [
                p.code || 'N/A',
                p.name || 'Unnamed Project',
                p.status || 'DRAFT',
                `$${(p.budget || 0).toLocaleString()}`,
                `${p.progress || 0}%`,
                p.startDate ? new Date(p.startDate).toLocaleDateString() : 'N/A',
                p.endDate ? new Date(p.endDate).toLocaleDateString() : 'N/A'
            ])
            : [['No projects available', '', '', '', '', '', '']];

        autoTable(doc, {
            startY: yPosition,
            head: [['Code', 'Project Name', 'Status', 'Budget', 'Progress', 'Start Date', 'End Date']],
            body: projectTableData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 50 },
                2: { cellWidth: 25 },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 30 },
                6: { cellWidth: 30 }
            },
            margin: { left: 20, right: 20 }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
        checkPageBreak(30);

        // Task Status Breakdown
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Task Status Breakdown', 20, yPosition);
        yPosition += 10;

        const taskStatusCounts = {
            [TaskStatus.TODO]: data.tasks.filter(t => t.status === TaskStatus.TODO).length,
            [TaskStatus.IN_PROGRESS]: data.tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
            [TaskStatus.REVIEW]: data.tasks.filter(t => t.status === TaskStatus.REVIEW).length,
            [TaskStatus.DONE]: data.tasks.filter(t => t.status === TaskStatus.DONE).length,
        };

        const taskStatusData = Object.entries(taskStatusCounts).map(([status, count]) => [
            status.replace('_', ' '),
            count.toString(),
            `${data.tasks.length > 0 ? Math.round((count / data.tasks.length) * 100) : 0}%`
        ]);

        autoTable(doc, {
            startY: yPosition,
            head: [['Status', 'Count', 'Percentage']],
            body: taskStatusData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 40, halign: 'center' },
                2: { cellWidth: 40, halign: 'center' }
            }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
        checkPageBreak(30);

        // Budget Analysis
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Budget Analysis by Project', 20, yPosition);
        yPosition += 10;

        const budgetData = data.projects.length > 0
            ? data.projects.map(p => {
                const budget = p.budget || 0;
                const spent = Math.round(budget * ((p.progress || 0) / 100));
                const remaining = budget - spent;
                return [
                    p.code || 'N/A',
                    p.name || 'Unnamed Project',
                    `$${budget.toLocaleString()}`,
                    `$${spent.toLocaleString()}`,
                    `${p.progress || 0}%`,
                    `$${remaining.toLocaleString()}`
                ];
            })
            : [['No projects available', '', '', '', '', '']];

        autoTable(doc, {
            startY: yPosition,
            head: [['Code', 'Project', 'Budget', 'Spent', 'Progress', 'Remaining']],
            body: budgetData,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 50 },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 25, halign: 'center' },
                5: { cellWidth: 30, halign: 'right' }
            }
        });

        // Footer on last page
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Page ${i} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        // Download the PDF
        const fileName = `Executive_Dashboard_Report_${data.generatedAt.toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    },

    /**
     * Generate a detailed project report PDF
     */
    async generateProjectReport(data: ProjectReportData): Promise<void> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;

        // Helper function to add a new page if needed
        const checkPageBreak = (requiredSpace: number) => {
            if (yPosition + requiredSpace > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
                return true;
            }
            return false;
        };

        // Header
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Project Status Report', 20, 30);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(data.project.name, 20, 40);
        
        doc.setFontSize(9);
        doc.text(`Generated: ${data.generatedAt.toLocaleString()}`, 20, 47);

        yPosition = 60;

        // Project Information
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Project Information', 20, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const startDate = data.project.startDate ? new Date(data.project.startDate) : new Date();
        const endDate = data.project.endDate ? new Date(data.project.endDate) : new Date();
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        const projectInfo = [
            ['Project Code', data.project.code || 'N/A'],
            ['Project Name', data.project.name || 'Unnamed Project'],
            ['Status', data.project.status || 'DRAFT'],
            ['Budget', `$${(data.project.budget || 0).toLocaleString()}`],
            ['Progress', `${data.project.progress || 0}%`],
            ['Start Date', data.project.startDate ? startDate.toLocaleDateString() : 'N/A'],
            ['End Date', data.project.endDate ? endDate.toLocaleDateString() : 'N/A'],
            ['Duration', `${duration} days`]
        ];

        autoTable(doc, {
            startY: yPosition,
            head: [['Field', 'Value']],
            body: projectInfo,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold' },
                1: { cellWidth: 120 }
            }
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
        checkPageBreak(30);

        // Project Description
        if (data.project.description) {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Description', 20, yPosition);
            yPosition += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const descriptionLines = doc.splitTextToSize(data.project.description, pageWidth - 40);
            doc.text(descriptionLines, 20, yPosition);
            yPosition += descriptionLines.length * 5 + 10;
            checkPageBreak(20);
        }

        // Task Breakdown
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Task Breakdown', 20, yPosition);
        yPosition += 10;

        if (data.tasks.length > 0) {
            const taskTableData = data.tasks.map(t => [
                t.name,
                t.status.replace('_', ' '),
                `${t.progress}%`,
                new Date(t.startDate).toLocaleDateString(),
                new Date(t.endDate).toLocaleDateString(),
                t.assigneeId ? 'Assigned' : 'Unassigned'
            ]);

            autoTable(doc, {
                startY: yPosition,
                head: [['Task Name', 'Status', 'Progress', 'Start Date', 'End Date', 'Assignment']],
                body: taskTableData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 60 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 25, halign: 'center' },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 30 },
                    5: { cellWidth: 30 }
                }
            });

            yPosition = (doc as any).lastAutoTable.finalY + 15;
            checkPageBreak(30);

            // Task Status Summary
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Task Status Summary', 20, yPosition);
            yPosition += 10;

            const taskStatusCounts = {
                [TaskStatus.TODO]: data.tasks.filter(t => t.status === TaskStatus.TODO).length,
                [TaskStatus.IN_PROGRESS]: data.tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
                [TaskStatus.REVIEW]: data.tasks.filter(t => t.status === TaskStatus.REVIEW).length,
                [TaskStatus.DONE]: data.tasks.filter(t => t.status === TaskStatus.DONE).length,
            };

            const taskStatusData = Object.entries(taskStatusCounts).map(([status, count]) => [
                status.replace('_', ' '),
                count.toString(),
                `${data.tasks.length > 0 ? Math.round((count / data.tasks.length) * 100) : 0}%`
            ]);

            autoTable(doc, {
                startY: yPosition,
                head: [['Status', 'Count', 'Percentage']],
                body: taskStatusData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 10, cellPadding: 5 },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 40, halign: 'center' },
                    2: { cellWidth: 40, halign: 'center' }
                }
            });

            yPosition = (doc as any).lastAutoTable.finalY + 15;
            checkPageBreak(30);
        } else {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(128, 128, 128);
            doc.text('No tasks defined for this project.', 20, yPosition);
            yPosition += 10;
        }

        // AI Generated Report (if available)
        if (data.reportText) {
            checkPageBreak(30);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('AI Generated Status Report', 20, yPosition);
            yPosition += 10;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const reportLines = doc.splitTextToSize(data.reportText, pageWidth - 40);
            doc.text(reportLines, 20, yPosition);
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Page ${i} of ${pageCount} | ${data.project.code}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        // Download the PDF
        const fileName = `Project_Report_${data.project.code}_${data.generatedAt.toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }
};

