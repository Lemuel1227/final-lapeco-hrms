import React, { useEffect, useMemo, useState } from 'react';
import EmployeeCaseCard from './EmployeeCaseCard';
import EmployeeCaseDetailView from './EmployeeCaseDetailView';
import './MyCasesPage.css';
import { disciplinaryCaseAPI } from '../../services/api';
import { getUserProfile } from '../../services/accountService';

const MyCasesPage = ({ currentUser: currentUserProp = null, cases: casesProp = [] }) => {
    const [currentUser, setCurrentUser] = useState(currentUserProp);
    const [caseRecords, setCaseRecords] = useState(casesProp);
    const [selectedCase, setSelectedCase] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [loading, setLoading] = useState(!currentUserProp || casesProp.length === 0);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        setCurrentUser(currentUserProp);
    }, [currentUserProp]);

    useEffect(() => {
        setCaseRecords(casesProp);
    }, [casesProp]);

    useEffect(() => {
        const shouldFetch = !currentUserProp || casesProp.length === 0;
        if (!shouldFetch && currentUserProp && casesProp.length > 0) {
            setLoading(false);
            setError(null);
            return;
        }

        let isMounted = true;

        (async () => {
            try {
                setLoading(true);

                const userProfile = currentUserProp || await getUserProfile();
                if (!isMounted) return;

                const employeeId = userProfile?.id || userProfile?.data?.id;
                if (!employeeId) {
                    throw new Error('Unable to determine your employee profile.');
                }

                setCurrentUser(userProfile);

                const response = await disciplinaryCaseAPI.getByEmployee(employeeId);
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
                    nextSteps: caseItem.resolution_taken,
                    actionLog: (caseItem.action_logs || []).map(log => ({
                        id: log.id,
                        date: (log.date_created || log.created_at || log.date || '').slice(0, 10),
                        action: log.description || log.action || 'Updated',
                    })),
                }));

                setCaseRecords(mappedCases);
                setError(null);
            } catch (err) {
                console.error('Failed to load cases for current user:', err);
                if (!isMounted) return;
                setCaseRecords([]);
                setError('Failed to load your cases. Please try again later.');
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [currentUserProp, casesProp, reloadKey]);

    const myCases = useMemo(() => {
        if (!currentUser) return [];

        const employeeId = currentUser?.id || currentUser?.data?.id;
        const source = caseRecords.length > 0 ? caseRecords : casesProp;

        return source
            .filter(c => (employeeId ? c.employeeId === employeeId : true))
            .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
    }, [caseRecords, casesProp, currentUser]);

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
        return (
            <EmployeeCaseDetailView
                caseInfo={selectedCase}
                onBack={() => setSelectedCase(null)}
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