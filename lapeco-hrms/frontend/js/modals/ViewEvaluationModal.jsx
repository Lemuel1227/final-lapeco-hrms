import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import ScoreDonutChart from '../pages/Performance-Management/ScoreDonutChart';
import StarRating from '../pages/Performance-Management/StarRating';
import ScoreIndicator from '../pages/Performance-Management/ScoreIndicator';
import './ViewEvaluationModal.css';

const ViewEvaluationModal = ({
    show,
    onClose,
    evaluationContext, 
    employeeHistoryContext,
    employees,
    positions,
    evaluations,
    evaluationFactors
}) => {
    const [view, setView] = useState('list'); // 'history', 'list', or 'detail'
    const [selectedEvaluation, setSelectedEvaluation] = useState(null);

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
    const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);
    
    // Determine the primary context and subject employee
    const primaryContext = useMemo(() => employeeHistoryContext || evaluationContext, [employeeHistoryContext, evaluationContext]);
    const subjectEmployee = useMemo(() => primaryContext ? employeeMap.get(primaryContext.employeeId) : null, [primaryContext, employeeMap]);

    // Initialize modal state based on the context provided
    useEffect(() => {
        if (show) {
            setView(employeeHistoryContext ? 'history' : 'list');
            setSelectedEvaluation(null);
        }
    }, [show, employeeHistoryContext]);

    // Derived data for the 'history' view
    const employeeHistory = useMemo(() => {
        if (!employeeHistoryContext) return [];

        const historyEntries = employeeHistoryContext.history || [];
        if (!historyEntries.length) return [];

        const groupedByPeriod = historyEntries.reduce((acc, ev) => {
            const periodKey = `${ev.periodStart}_${ev.periodEnd}`;
            if (!acc[periodKey]) {
                acc[periodKey] = { periodStart: ev.periodStart, periodEnd: ev.periodEnd, evals: [] };
            }
            acc[periodKey].evals.push(ev);
            return acc;
        }, {});

        return Object.values(groupedByPeriod).sort((a,b) => new Date(b.periodStart) - new Date(a.periodStart));
    }, [employeeHistoryContext]);

    // Derived data for the 'list' view
    const { positionTitle, evaluatorList, currentPeriodContext } = useMemo(() => {
        const baseContext = selectedEvaluation
            || evaluationContext
            || (employeeHistoryContext?.history?.[0] ?? null);

        if (!baseContext || !subjectEmployee) {
            return { positionTitle: '', evaluatorList: [], currentPeriodContext: null };
        }

        const title = positionMap.get(subjectEmployee.positionId) || 'Unassigned';
        const sourceEvals = employeeHistoryContext ? employeeHistoryContext.history : evaluations;

        const evaluationsForSubject = sourceEvals.filter(ev =>
            ev.employeeId === baseContext.employeeId &&
            ev.periodStart === baseContext.periodStart &&
            ev.periodEnd === baseContext.periodEnd
        );

        const evaluatorEntries = evaluationsForSubject.length > 0
            ? evaluationsForSubject.map(ev => ({
                evaluator: ev.evaluatorId ? employeeMap.get(ev.evaluatorId) : null,
                evaluation: ev,
            }))
            : [{ evaluator: baseContext.evaluatorId ? employeeMap.get(baseContext.evaluatorId) : null, evaluation: baseContext }];

        return { positionTitle: title, evaluatorList: evaluatorEntries, currentPeriodContext: baseContext };
    }, [selectedEvaluation, evaluationContext, employeeHistoryContext, evaluations, employeeMap, positionMap, subjectEmployee]);

    if (!show || !subjectEmployee) return null;

    const handleSelectPeriod = (period) => {
        if (!employeeHistoryContext) return;
        const entries = employeeHistoryContext.history.filter(ev =>
            ev.employeeId === subjectEmployee.id &&
            ev.periodStart === period.periodStart &&
            ev.periodEnd === period.periodEnd
        );

        if (entries.length > 0) {
            setSelectedEvaluation(entries[0]);
            setView('list');
        }
    };

    const handleViewDetails = (evaluation) => {
        if (evaluation?.isPlaceholder) return;
        setSelectedEvaluation(evaluation);
        setView('detail');
    };
    
    const handleBackToList = () => {
        setView(employeeHistoryContext ? 'history' : 'list');
        setSelectedEvaluation(null); // Clear detailed selection
    };
    
    const handleBackToHistory = () => {
        setView('history');
        setSelectedEvaluation(null);
    };

    // --- RENDER FUNCTIONS ---
    const renderHistoryView = () => (
        <>
            <div className="modal-header"><h5 className="modal-title">Evaluation History for {subjectEmployee.name}</h5></div>
            <div className="modal-body evaluator-list-body">
                <p className="text-muted">Showing all evaluation periods for this employee. Select a period to view the evaluators.</p>
                <div className="evaluator-list">
                    {employeeHistory.map(period => {
                        const responseCount = period.evals[0]?.responsesCount ?? period.evals.filter(ev => !ev.isPlaceholder).length;
                        return (
                        <div key={`${period.periodStart}-${period.periodEnd}`} className="evaluator-card period-card" onClick={() => handleSelectPeriod(period)}>
                            <div className="evaluator-info">
                                <i className="bi bi-calendar-range fs-4 text-primary"></i>
                                <div>
                                    <div className="evaluator-name">{period.periodStart} to {period.periodEnd}</div>
                                    <div className="evaluator-position">{responseCount} submission(s)</div>
                                </div>
                            </div>
                            <div className="evaluation-actions">
                                <button className="btn btn-sm btn-outline-primary">View</button>
                            </div>
                        </div>
                    );
                    })}
                </div>
            </div>
        </>
    );

    const renderListView = () => (
        <>
            <div className="modal-header">
                {employeeHistoryContext && <button className="btn btn-sm btn-light me-2 back-to-list-btn" onClick={handleBackToHistory}><i className="bi bi-arrow-left"></i></button>}
                <div className="header-info">
                    <h5 className="modal-title">Evaluations for {subjectEmployee.name}</h5>
                    <p className="text-muted mb-0">Period: {currentPeriodContext.periodStart} to {currentPeriodContext.periodEnd}</p>
                </div>
            </div>
            <div className="modal-body evaluator-list-body">
                {evaluatorList.length === 0 || evaluatorList.every(item => item.evaluation.isPlaceholder) ? (
                    <div className="text-center text-muted">No evaluations submitted for this period yet.</div>
                ) : (
                    evaluatorList.map(({ evaluator, evaluation }) => (
                        <div key={evaluation.id} className="evaluator-card">
                            <div className="evaluator-info">
                                {evaluator ? (
                                    <>
                                        <img src={evaluator.imageUrl} alt={evaluator.name} size="md" />
                                        <div>
                                            <div className="evaluator-name">{evaluator.name}</div>
                                            <div className="evaluator-position">{positionMap.get(evaluator.positionId) || 'N/A'}</div>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <div className="evaluator-name">Pending evaluator submission</div>
                                        <div className="evaluator-position text-muted">Awaiting response</div>
                                    </div>
                                )}
                            </div>
                            <div className="evaluation-summary">
                                {typeof evaluation.overallScore === 'number'
                                    ? <ScoreIndicator score={evaluation.overallScore} />
                                    : <span className="text-muted">N/A</span>}
                            </div>
                            <div className="evaluation-actions">
                                {!evaluation.isPlaceholder && (
                                    <button className="btn btn-sm btn-outline-primary" onClick={() => handleViewDetails(evaluation)}>View Evaluation</button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );

    const renderDetailView = () => {
        const evaluator = employeeMap.get(selectedEvaluation.evaluatorId);
        const criteria = evaluationFactors.filter(f => f.type === 'criterion');
        const getFactorData = (factorId) => selectedEvaluation.factorScores[factorId] || {};

        return (
            <>
                <div className="modal-header">
                    <button className="btn btn-sm btn-light me-2 back-to-list-btn" onClick={handleBackToList}><i className="bi bi-arrow-left"></i></button>
                    <ScoreDonutChart score={selectedEvaluation.overallScore} />
                    <div className="header-info">
                        <h5 className="modal-title">{subjectEmployee.name}</h5>
                        <p className="text-muted mb-0">Period: {selectedEvaluation.periodStart} to {selectedEvaluation.periodEnd}</p>
                        {evaluator && <div className="evaluator-info">Evaluated by: <strong>{evaluator.name}</strong></div>}
                    </div>
                </div>
                <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                    {criteria.map(criterion => (
                        <div className="card mb-3" key={criterion.id}><div className="card-header fw-bold">{criterion.title}</div>
                            <ul className="list-group list-group-flush">
                                {criterion.items.map(item => {
                                    const data = getFactorData(item.id);
                                    return (
                                    <li key={item.id} className="list-group-item">
                                        <div className="evaluation-item">
                                            <div className="evaluation-item-info"><p className="name mb-0">{item.title}</p>{data.comments && <p className="comment mb-0">"{data.comments}"</p>}</div>
                                            <div className="evaluation-item-score"><StarRating score={data.score || 0} onRate={() => {}} /></div>
                                        </div>
                                    </li>
                                    )
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    const renderContent = () => {
        switch (view) {
            case 'history': return renderHistoryView();
            case 'list': return renderListView();
            case 'detail': return renderDetailView();
            default: return null;
        }
    };

    return (
        <div className="modal fade show d-block view-evaluation-modal" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    {renderContent()}
                    <div className="modal-footer"><button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button></div>
                </div>
            </div>
        </div>
    );
};

export default ViewEvaluationModal;