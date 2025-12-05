import React from 'react';
import { ChangeRequest, CRStatus } from '../types';
import { analyzeCRImpact } from '../services/geminiService';
import { AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';

interface ChangeRequestsProps {
    crs: ChangeRequest[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

const ChangeRequests: React.FC<ChangeRequestsProps> = ({ crs, onApprove, onReject }) => {
    const [analysisResult, setAnalysisResult] = React.useState<Record<string, string>>({});
    const [analyzingId, setAnalyzingId] = React.useState<string | null>(null);

    const handleAnalyze = async (cr: ChangeRequest) => {
        setAnalyzingId(cr.id);
        const result = await analyzeCRImpact(cr.description, "Current project timeline is tight with only 2 weeks buffer.");
        setAnalysisResult(prev => ({ ...prev, [cr.id]: result }));
        setAnalyzingId(null);
    };

    const getStatusBadge = (status: CRStatus) => {
        switch (status) {
            case CRStatus.APPROVED: return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">APPROVED</span>;
            case CRStatus.REJECTED: return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">REJECTED</span>;
            case CRStatus.CAB_REVIEW: return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">CAB REVIEW</span>;
            default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Change Requests</h1>
                    <p className="text-sm text-gray-500">Review and approve scope changes</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
                    Create Change Request
                </button>
            </div>

            <div className="grid gap-6">
                {crs.map((cr) => (
                    <div key={cr.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{cr.title}</h3>
                                    <p className="text-sm text-gray-500">Requested by Project Manager • {new Date(cr.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            {getStatusBadge(cr.status)}
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Description</h4>
                                <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">{cr.description}</p>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Initial Impact Assessment</h4>
                                <div className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                                    <p><span className="font-medium">Cost:</span> ${cr.costImpact}</p>
                                    <p><span className="font-medium">Time:</span> +{cr.timeImpactDays} days</p>
                                    <p className="mt-1">{cr.impact}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                    <span className="text-lg">✨</span> Gemini Risk Analysis
                                </h4>
                                {!analysisResult[cr.id] && (
                                    <button
                                        onClick={() => handleAnalyze(cr)}
                                        disabled={analyzingId === cr.id}
                                        className="text-xs bg-white text-indigo-600 border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-50"
                                    >
                                        {analyzingId === cr.id ? 'Analyzing...' : 'Run Analysis'}
                                    </button>
                                )}
                            </div>
                            {analysisResult[cr.id] ? (
                                <p className="text-sm text-indigo-800 leading-relaxed">{analysisResult[cr.id]}</p>
                            ) : (
                                <p className="text-xs text-indigo-400 italic">Click "Run Analysis" to get an AI-powered second opinion on this change.</p>
                            )}
                        </div>

                        {cr.status !== CRStatus.APPROVED && cr.status !== CRStatus.REJECTED && (
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button onClick={() => onReject(cr.id)} className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50">
                                    <XCircle size={18} /> Reject
                                </button>
                                <button onClick={() => onApprove(cr.id)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm">
                                    <CheckCircle size={18} /> Approve Change
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChangeRequests;