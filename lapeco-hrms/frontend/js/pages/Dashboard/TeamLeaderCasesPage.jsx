import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TeamLeaderCaseDetailView from './TeamLeaderCaseDetailView';
import { disciplinaryCaseAPI, employeeAPI } from '../../services/api';

const TeamLeaderCasesPage = () => {
    const { caseId } = useParams();
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [caseData, setCaseData] = useState(null);
    const [employeeData, setEmployeeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                setCurrentUser(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to parse current user for TeamLeaderCasesPage', e);
        }
    }, []);

    useEffect(() => {
        if (!caseId || !currentUser) return;

        const fetchCaseData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch the specific case
                const caseResponse = await disciplinaryCaseAPI.getById(caseId);
                const caseInfo = caseResponse.data;

                // Verify the team leader has access to this case
                const reportedBy = caseInfo.reported_by || caseInfo.submittedBy;
                const currentUserId = currentUser.id || currentUser.employee_id;
                
                if (reportedBy !== currentUserId) {
                    setError('You do not have permission to view this case.');
                    setLoading(false);
                    return;
                }

                // Fetch employee data for the case
                const employeeResponse = await employeeAPI.getById(caseInfo.employee_id);
                const employeeInfo = employeeResponse.data;

                // Transform data to match expected format
                const transformedCase = {
                    caseId: caseInfo.id,
                    employeeId: caseInfo.employee_id,
                    actionType: caseInfo.action_type,
                    description: caseInfo.description,
                    incidentDate: caseInfo.incident_date ? String(caseInfo.incident_date).slice(0, 10) : '',
                    reason: caseInfo.reason,
                    status: caseInfo.status,
                    resolutionTaken: caseInfo.resolution_taken,
                    attachment: caseInfo.attachment,
                    issueDate: caseInfo.incident_date ? String(caseInfo.incident_date).slice(0, 10) : '',
                    approvalStatus: caseInfo.approval_status,
                    submittedBy: caseInfo.reported_by ?? null,
                    actionLog: (caseInfo.action_logs || []).map(log => ({
                        id: log.id,
                        date: log.date_created ? new Date(log.date_created).toISOString().slice(0, 10) : log.date,
                        action: log.description || log.action,
                        user: log.user ? {
                            id: log.user.id,
                            first_name: log.user.first_name,
                            last_name: log.user.last_name,
                            imageUrl: log.user.image_url || log.user.profile_image_url,
                            position: log.user.position
                        } : null
                    })),
                    attachments: caseInfo.attachment ? [caseInfo.attachment] : [],
                    nextSteps: caseInfo.resolution_taken,
                };

                const transformedEmployee = {
                    id: employeeInfo.id,
                    name: employeeInfo.name || `${employeeInfo.first_name} ${employeeInfo.last_name}`.trim(),
                    email: employeeInfo.email,
                    position: employeeInfo.position?.name || 'N/A',
                    imageUrl: employeeInfo.image_url || employeeInfo.profile_image,
                };

                setCaseData(transformedCase);
                setEmployeeData(transformedEmployee);
            } catch (err) {
                console.error('Error fetching case data:', err);
                setError('Failed to load case details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchCaseData();
    }, [caseId, currentUser]);

    const handleBack = () => {
        navigate('/dashboard');
    };

    const handleSaveLog = async (caseId, logEntry) => {
        try {
            const response = await disciplinaryCaseAPI.addActionLog(caseId, {
                description: logEntry.action,
                date_created: logEntry.date,
            });
            const saved = response?.data;
            const uiLog = saved ? {
                id: saved.id,
                date: saved.date_created ? new Date(saved.date_created).toISOString().slice(0, 10) : (logEntry.date || new Date().toISOString().slice(0,10)),
                action: saved.description || logEntry.action,
                user: saved.user ? {
                    id: saved.user.id,
                    first_name: saved.user.first_name,
                    middle_name: saved.user.middle_name,
                    last_name: saved.user.last_name,
                    imageUrl: saved.user.image_url || saved.user.profile_image_url,
                    position: saved.user.position,
                } : (currentUser ? {
                    id: currentUser.id,
                    first_name: currentUser.first_name,
                    middle_name: currentUser.middle_name,
                    last_name: currentUser.last_name,
                    imageUrl: currentUser.image_url,
                    position: currentUser.position,
                } : null),
            } : logEntry;

            setCaseData(prev => ({
                ...prev,
                actionLog: [...(prev.actionLog || []), uiLog]
            }));
        } catch (err) {
            console.error('Error saving log entry:', err);
            setError('Failed to save log entry. Please try again.');
        }
    };

    const handleUploadAttachment = async (caseId, file) => {
        try {
            // Upload attachment via API
            await disciplinaryCaseAPI.uploadAttachment(caseId, file);
            
            // Update local state
            setCaseData(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), file.name]
            }));
        } catch (err) {
            console.error('Error uploading attachment:', err);
            setError('Failed to upload attachment. Please try again.');
        }
    };

    const handleDownloadAttachment = async (caseId, fileName) => {
        try {
            await disciplinaryCaseAPI.downloadAttachment(caseId, fileName);
        } catch (err) {
            console.error('Error downloading attachment:', err);
            setError('Failed to download attachment. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="container-fluid p-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading case details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid p-4">
                <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {error}
                </div>
                <button className="btn btn-primary" onClick={handleBack}>
                    <i className="bi bi-arrow-left me-2"></i>Back to Dashboard
                </button>
            </div>
        );
    }

    if (!caseData || !employeeData) {
        return (
            <div className="container-fluid p-4">
                <div className="alert alert-warning" role="alert">
                    Case not found or you don't have permission to view it.
                </div>
                <button className="btn btn-primary" onClick={handleBack}>
                    <i className="bi bi-arrow-left me-2"></i>Back to Dashboard
                </button>
            </div>
        );
    }

    const isApproved = String(caseData.approvalStatus || '').toLowerCase() === 'approved';
    const submitterId = String(caseData.submittedBy ?? '');
    const currentUserId = String((currentUser?.id ?? currentUser?.employee_id) || '');
    const canInteract = isApproved && submitterId === currentUserId;

    return (
        <div className="container-fluid p-0 page-module-container">
            <TeamLeaderCaseDetailView
                caseInfo={caseData}
                employee={employeeData}
                currentUser={currentUser}
                onBack={handleBack}
                onSaveLog={handleSaveLog}
                onUploadAttachment={handleUploadAttachment}
                onDownloadAttachment={handleDownloadAttachment}
                canInteract={canInteract}
            />
        </div>
    );
};

export default TeamLeaderCasesPage;
