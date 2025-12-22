import React, { useEffect, useMemo, useState } from 'react';
import EmployeeCaseCard from './EmployeeCaseCard';
import EmployeeCaseDetailView from './EmployeeCaseDetailView';
import './MyCasesPage.css';
import { disciplinaryCaseAPI, getUserProfile } from '../../services/api';

const MyCasesPage = ({ currentUser: currentUserProp = null, cases: casesProp }) => {
    const initialCases = useMemo(() => (Array.isArray(casesProp) ? casesProp : []), [casesProp]);
    const [currentUser, setCurrentUser] = useState(currentUserProp);
    const [caseRecords, setCaseRecords] = useState(initialCases);
    const [selectedCase, setSelectedCase] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(() => !(currentUserProp && initialCases.length > 0));
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [lastReloadValue, setLastReloadValue] = useState(0);
    const [hasFetched, setHasFetched] = useState(() => initialCases.length > 0);

    useEffect(() => {
        setCurrentUser(currentUserProp);
    }, [currentUserProp]);

    useEffect(() => {
        if (Array.isArray(casesProp)) {
            setCaseRecords(casesProp);
            setHasFetched(casesProp.length > 0);
            if (casesProp.length > 0) {
                setLoading(false);
                setError(null);
            }
        }
    }, [casesProp]);

    useEffect(() => {
        const reloadRequested = reloadKey !== lastReloadValue;
        const needsInitialFetch = !hasFetched;

        if (!reloadRequested && !needsInitialFetch) {
            if (!currentUser && currentUserProp) {
                setCurrentUser(currentUserProp);
            }
            return;
        }

        let isMounted = true;

        (async () => {
            try {
                setLoading(true);

                // Use the new getMyCases endpoint which doesn't require employee ID
                const response = await disciplinaryCaseAPI.getMyCases();
                if (!isMounted) return;

                const rawCases = Array.isArray(response.data)
                    ? response.data
                    : (response.data?.data || []);

                const mappedCases = rawCases.map(caseItem => ({
                    caseId: caseItem.id,
                    employeeId: caseItem.employee_id,
                    actionType: caseItem.action_type,
                    description: caseItem.description,
                    issueDate: caseItem.incident_date ? String(caseItem.incident_date).slice(0, 10) : '',
                    reason: caseItem.reason,
                    status: caseItem.status,
                    approvalStatus: caseItem.approval_status,
                    submittedBy: caseItem.reported_by,
                    nextSteps: caseItem.resolution_taken,
                    actionLog: (caseItem.action_logs || []).map(log => ({
                        id: log.id,
                        date: (log.date_created || log.created_at || log.date || '').slice(0, 10),
                        action: log.description || log.action || 'Updated',
                        user: log.user ? {
                            id: log.user.id,
                            first_name: log.user.first_name,
                            last_name: log.user.last_name,
                            imageUrl: log.user.image_url || log.user.profile_image_url,
                            position: log.user.position
                        } : null
                    })),
                    attachments: caseItem.attachment ? [caseItem.attachment] : [],
                }));

                setCaseRecords(mappedCases);
                setError(null);
                
                // Fetch current user profile for display purposes
                if (!currentUser && !currentUserProp) {
                    const profile = await getUserProfile();
                    if (isMounted) {
                        setCurrentUser(profile);
                    }
                }
            } catch (err) {
                console.error('Failed to load cases for current user:', err);
                if (!isMounted) return;
                setCaseRecords([]);
                setError('Failed to load your cases. Please try again later.');
            } finally {
                if (isMounted) {
                    setHasFetched(true);
                    setLastReloadValue(reloadKey);
                    setLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [currentUserProp, currentUser, hasFetched, reloadKey, lastReloadValue]);

    const myCases = useMemo(() => {
        if (!currentUser) return [];

        const employeeId = currentUser?.id || currentUser?.data?.id;

        return caseRecords
            .filter(c => (employeeId ? c.employeeId === employeeId : true))
            .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
    }, [caseRecords, currentUser]);

    const stats = useMemo(() => {
        return myCases.reduce((acc, caseInfo) => {
            acc.All++;
            if (caseInfo.status === 'Ongoing') acc.Ongoing++;
            if (caseInfo.status === 'Closed') acc.Closed++;
            return acc;
        }, { All: 0, Ongoing: 0, Closed: 0 });
    }, [myCases]);

    const filteredCases = useMemo(() => {
        if (statusFilter === 'All') return myCases;
        return myCases.filter(c => c.status === statusFilter);
    }, [myCases, statusFilter]);

    if (selectedCase) {
        const currentUserId = (currentUser?.id || currentUser?.data?.id);
        const canInteract = String(selectedCase.approvalStatus || '').toLowerCase() === 'approved'
            && String(selectedCase.submittedBy || '') === String(currentUserId || '');

        const handleSaveLog = async (caseId, logEntry) => {
            let saved;
            try {
                const response = await disciplinaryCaseAPI.addActionLog(caseId, {
                    description: logEntry.action,
                    date_created: logEntry.date,
                });
                saved = response?.data;
            } catch (e) {
                console.error('Failed to persist action log, updating UI optimistically:', e);
            }

            const uiLog = saved ? {
                id: saved.id,
                date: (saved.date_created || saved.created_at || logEntry.date || new Date().toISOString()).slice(0, 10),
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

            setSelectedCase(prev => prev && prev.caseId === caseId ? {
                ...prev,
                actionLog: [...(prev.actionLog || []), uiLog]
            } : prev);

            setCaseRecords(prev => prev.map(c => c.caseId === caseId ? {
                ...c,
                actionLog: [...(c.actionLog || []), uiLog]
            } : c));
        };

        return (
            <EmployeeCaseDetailView
                caseInfo={selectedCase}
                currentUser={currentUser}
                onBack={() => setSelectedCase(null)}
                onSaveLog={handleSaveLog}
                canInteract={canInteract}
            />
        );
    }

    return (
        <div className="container-fluid p-0 page-module-container">
            <header className="page-header mb-4">
                <h1 className="page-main-title">My Cases</h1>
                <p className="text-muted">A record of all disciplinary cases associated with your account.</p>
            </header>

            {loading ? (
                <div className="text-center p-5 bg-light rounded">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading cases...</span>
                    </div>
                    <p className="mt-3 text-muted">Loading your cases...</p>
                </div>
            ) : error ? (
                <div className="text-center p-5 bg-light rounded">
                    <i className="bi bi-exclamation-triangle-fill fs-1 text-warning mb-3 d-block"></i>
                    <h4 className="text-muted">{error}</h4>
                    <button className="btn btn-primary mt-3" onClick={() => setReloadKey(prev => prev + 1)}>Retry</button>
                </div>
            ) : (
                <>
                    <div className="my-cases-stats-grid">
                        <div className={`stat-card-my-cases all ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => setStatusFilter('All')}>
                            <span className="stat-value">{stats.All}</span>
                            <span className="stat-label">All Cases</span>
                        </div>
                        <div className={`stat-card-my-cases ongoing ${statusFilter === 'Ongoing' ? 'active' : ''}`} onClick={() => setStatusFilter('Ongoing')}>
                            <span className="stat-value">{stats.Ongoing}</span>
                            <span className="stat-label">Ongoing</span>
                        </div>
                        <div className={`stat-card-my-cases closed ${statusFilter === 'Closed' ? 'active' : ''}`} onClick={() => setStatusFilter('Closed')}>
                            <span className="stat-value">{stats.Closed}</span>
                            <span className="stat-label">Closed</span>
                        </div>
                    </div>

                    {filteredCases.length > 0 ? (
                        <div className="case-card-grid">
                            {filteredCases.map(caseInfo => (
                                <EmployeeCaseCard
                                    key={caseInfo.caseId}
                                    caseInfo={caseInfo}
                                    onView={() => setSelectedCase(caseInfo)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-5 bg-light rounded">
                            <i className="bi bi-patch-check-fill fs-1 text-success mb-3 d-block"></i>
                            <h4 className="text-muted">No Cases Found</h4>
                            <p className="text-muted">
                                {statusFilter === 'All'
                                    ? "You have a clean record with no disciplinary cases."
                                    : `You have no ${statusFilter.toLowerCase()} cases.`
                                }
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MyCasesPage;
