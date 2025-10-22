import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import ScoreDonutChart from '../pages/Performance-Management/ScoreDonutChart';
import StarRating from '../pages/Performance-Management/StarRating';
import ScoreIndicator from '../pages/Performance-Management/ScoreIndicator';
import './ViewEvaluationModal.css';
import { evaluationFactorsConfig } from '../config/evaluation.config';
import placeholderAvatar from '../assets/placeholder-profile.jpg';
import { performanceAPI } from '../services/api';

const SCORE_FIELD_TO_FACTOR_MAP = {
  factor_attendance: 'attendance',
  factor_dedication: 'dedication',
  factor_job_knowledge: 'performance_job_knowledge',
  factor_efficiency: 'performance_work_efficiency_professionalism',
  factor_task_acceptance: 'cooperation_task_acceptance',
  factor_adaptability: 'cooperation_adaptability',
  factor_autonomy: 'initiative_autonomy',
  factor_pressure: 'initiative_under_pressure',
  factor_communication: 'communication',
  factor_teamwork: 'teamwork',
  factor_character: 'character',
  factor_responsiveness: 'responsiveness',
  factor_personality: 'personality',
  factor_appearance: 'appearance',
  factor_work_habits: 'work_habits',
};

const ViewEvaluationModal = ({
    show,
    onClose,
    evaluationContext,
    employeeId, 
    employees,
    positions,
    evaluations,
    evaluationFactors,
    onError, 
}) => {
    const [view, setView] = useState('history');
    const [selectedEvaluation, setSelectedEvaluation] = useState(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [isLoadingPeriodResponses, setIsLoadingPeriodResponses] = useState(false);
    
    // State for fetched data
    const [employeeHistoryData, setEmployeeHistoryData] = useState(null);
    const [selectedPeriodResponses, setSelectedPeriodResponses] = useState([]);
    const [responseDetailsMap, setResponseDetailsMap] = useState({});

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
    const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);

    const factorsCatalog = useMemo(() => {
        if (evaluationFactors && evaluationFactors.length > 0) {
            return evaluationFactors;
        }
        return evaluationFactorsConfig;
    }, [evaluationFactors]);
    
    // Determine the primary context and subject employee
    const primaryContext = useMemo(() => employeeHistoryData || evaluationContext, [employeeHistoryData, evaluationContext]);
    const subjectEmployee = useMemo(() => {
        if (!primaryContext) return null;
        return employeeMap.get(primaryContext.employeeId) || primaryContext.employee || null;
    }, [primaryContext, employeeMap]);

    // Fetch employee history when modal opens with employeeId
    useEffect(() => {
        if (!show) return;
        
        const targetEmployeeId = employeeId || evaluationContext?.employeeId;
        if (!targetEmployeeId) return;

        // If we already have history data for this employee, don't refetch
        if (employeeHistoryData?.employeeId === targetEmployeeId) return;

        const fetchEmployeeHistory = async () => {
            setIsHistoryLoading(true);
            try {
                const response = await performanceAPI.getEmployeeHistory(targetEmployeeId);
                const payload = response.data || {};
                const apiHistory = payload.history || [];

                if (!apiHistory.length) {
                    onError?.({
                        message: 'No evaluation history found for this employee.',
                        type: 'warning',
                    });
                    setEmployeeHistoryData(null);
                    return;
                }

                const normalizedHistory = apiHistory.map(evaluation => {
                    const periodStart = evaluation.periodStart;
                    const periodEnd = evaluation.periodEnd;
                    const periodName = evaluation.periodName;
                    const periodId = evaluation.periodId;
                    const responsesCount = evaluation.responsesCount ?? 0;
                    const averageScorePercentage = typeof evaluation.averageScore === 'number' ? evaluation.averageScore * 20 : null;

                    return {
                        id: `evaluation-${evaluation.evaluationId}`,
                        evaluationId: evaluation.evaluationId,
                        employeeId: payload.employee?.id || targetEmployeeId,
                        evaluatorId: null,
                        evaluator: null,
                        overallScore: averageScorePercentage,
                        evaluationDate: null,
                        periodStart,
                        periodEnd,
                        periodName,
                        periodId,
                        responsesCount,
                        evaluationAverage: averageScorePercentage,
                        commentSummary: null,
                        commentDevelopment: null,
                        factorScores: {},
                        isPlaceholder: responsesCount === 0,
                    };
                });

                const periodSummaries = apiHistory.map(evaluation => ({
                    periodId: evaluation.periodId,
                    periodName: evaluation.periodName,
                    periodStart: evaluation.periodStart,
                    periodEnd: evaluation.periodEnd,
                    responsesCount: evaluation.responsesCount ?? 0,
                }));

                const historyContext = {
                    employeeId: payload.employee?.id || targetEmployeeId,
                    employee: payload.employee || null,
                    history: normalizedHistory,
                    periodSummaries,
                };

                setEmployeeHistoryData(historyContext);
            } catch (error) {
                console.error('Failed to load employee evaluation history', error);
                onError?.({
                    message: 'Failed to load evaluation history.',
                    type: 'error',
                });
            } finally {
                setIsHistoryLoading(false);
            }
        };

        fetchEmployeeHistory();
    }, [show, employeeId, evaluationContext?.employeeId]);

    // Initialize modal state based on the context provided
    useEffect(() => {
        if (!show) return;

        const historyEntries = employeeHistoryData?.history || [];

        if (selectedPeriodResponses.length > 0) {
            setSelectedEvaluation(selectedPeriodResponses[0]);
            setView('list');
            return;
        }

        if (evaluationContext && !employeeHistoryData) {
            setSelectedEvaluation(evaluationContext);
            setView('list');
            return;
        }

        if (historyEntries.length > 0) {
            setSelectedEvaluation(null);
            setView('history');
        }
    }, [show, employeeHistoryData, evaluationContext, selectedPeriodResponses]);

    useEffect(() => {
        if (!show) return;
        if (selectedPeriodResponses.length > 0) {
            setSelectedEvaluation(selectedPeriodResponses[0]);
            setView('list');
        }
    }, [selectedPeriodResponses, show]);

    // Reset state when modal closes
    useEffect(() => {
        if (!show) {
            setView('history');
            setSelectedEvaluation(null);
            setEmployeeHistoryData(null);
            setSelectedPeriodResponses([]);
            setResponseDetailsMap({});
        }
    }, [show]);

    // Derived data for the 'history' view
    const employeeHistory = useMemo(() => {
        if (!employeeHistoryData) return [];

        const historyEntries = employeeHistoryData.history || [];
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
    }, [employeeHistoryData]);

    // Derived data for the 'list' view
    const { positionTitle, evaluatorList, currentPeriodContext } = useMemo(() => {
        const baseContext = selectedEvaluation
            || evaluationContext
            || (employeeHistoryData?.history?.[0] ?? null);

        if (!baseContext || !subjectEmployee) {
            return { positionTitle: '', evaluatorList: [], currentPeriodContext: null };
        }

        const title = positionMap.get(subjectEmployee.positionId) || 'Unassigned';
        const buildEvaluator = (rawEvaluator, fallbackId) => {
            const evaluatorFromMap = fallbackId ? employeeMap.get(fallbackId) : null;
            const source = evaluatorFromMap || rawEvaluator || null;

            if (!source) return null;

            const firstName = source.first_name ?? source.firstName ?? null;
            const middleName = source.middle_name ?? source.middleName ?? null;
            const lastName = source.last_name ?? source.lastName ?? null;
            const name = source.name || [firstName, middleName, lastName].filter(Boolean).join(' ');
            const positionName = source.position
                || (source.positionId ? positionMap.get(source.positionId) : null)
                || source.position_name
                || (source.position?.name ?? null)
                || 'N/A';
            const imageUrl = source.imageUrl
                || source.profilePictureUrl
                || (source.image_url ? `${source.image_url.startsWith('http') ? '' : ''}${source.image_url}` : null);

            return {
                id: source.id ?? fallbackId ?? null,
                name: name || 'Unknown Evaluator',
                position: positionName,
                positionId: source.positionId ?? source.position_id ?? null,
                imageUrl,
            };
        };

        const evaluatorEntries = selectedPeriodResponses.length > 0
            ? selectedPeriodResponses.map(ev => ({
                evaluator: buildEvaluator(ev.evaluator, ev.evaluatorId),
                evaluation: ev,
            }))
            : [{
                evaluator: buildEvaluator(baseContext?.evaluator, baseContext?.evaluatorId),
                evaluation: baseContext,
            }];

        return { positionTitle: title, evaluatorList: evaluatorEntries, currentPeriodContext: baseContext };
    }, [selectedEvaluation, evaluationContext, employeeHistoryData, selectedPeriodResponses, employeeMap, positionMap, subjectEmployee]);

    const handleSelectPeriod = async (period) => {
        if (!period) return;
        const firstEval = period.evals?.[0];
        if (!firstEval) return;

        setSelectedEvaluation(firstEval);
        setView('list');
        setResponseDetailsMap({});
        setIsLoadingPeriodResponses(true);

        try {
            const evaluationId = firstEval.evaluationId || firstEval.id || firstEval.periodId;
            const response = await performanceAPI.getEvaluationResponses(evaluationId);
            const payload = response.data || {};
            const responses = (payload.responses || []).map(item => {
                const normalizedEvaluator = item.evaluator
                    ? {
                        id: item.evaluator.id,
                        name: item.evaluator.name,
                        email: item.evaluator.email,
                        role: item.evaluator.role,
                        position: item.evaluator.position,
                        positionId: item.evaluator.positionId ?? null,
                        imageUrl: item.evaluator.profilePictureUrl,
                    }
                    : null;

                return {
                    id: item.id,
                    evaluationId: item.evaluationId,
                    employeeId: payload.employee?.id || firstEval.employeeId || period.employeeId,
                    evaluatorId: item.evaluatorId,
                    evaluator: normalizedEvaluator,
                    overallScore: typeof item.overallScore === 'number' ? item.overallScore * 20 : null,
                    evaluationDate: item.evaluatedOn ? item.evaluatedOn.split(' T')[0] : null,
                    periodStart: payload.evaluation?.periodStart || firstEval.periodStart,
                    periodEnd: payload.evaluation?.periodEnd || firstEval.periodEnd,
                    periodName: payload.evaluation?.periodName || firstEval.periodName,
                    periodId: payload.evaluation?.periodId || firstEval.periodId,
                    responsesCount: payload.responses?.length || firstEval.responsesCount || 0,
                    evaluationAverage: payload.evaluation?.averageScore
                        ? payload.evaluation.averageScore * 20
                        : typeof firstEval.evaluationAverage === 'number' ? firstEval.evaluationAverage : null,
                    commentSummary: item.commentSummary,
                    commentDevelopment: item.commentDevelopment,
                    factorScores: {},
                };
            });

            if (responses.length === 0) {
                setSelectedPeriodResponses([{
                    id: `evaluation-${payload.evaluation?.id || evaluationId}`,
                    evaluationId: payload.evaluation?.id || evaluationId,
                    employeeId: payload.employee?.id || firstEval.employeeId || period.employeeId,
                    evaluatorId: null,
                    evaluator: null,
                    overallScore: payload.evaluation?.averageScore ? payload.evaluation.averageScore * 20 : null,
                    evaluationDate: null,
                    periodStart: payload.evaluation?.periodStart || firstEval.periodStart,
                    periodEnd: payload.evaluation?.periodEnd || firstEval.periodEnd,
                    periodName: payload.evaluation?.periodName || firstEval.periodName,
                    periodId: payload.evaluation?.periodId || firstEval.periodId,
                    responsesCount: payload.responses?.length || firstEval.responsesCount || 0,
                    evaluationAverage: payload.evaluation?.averageScore
                        ? payload.evaluation.averageScore * 20
                        : typeof firstEval.evaluationAverage === 'number' ? firstEval.evaluationAverage : null,
                    commentSummary: null,
                    commentDevelopment: null,
                    factorScores: {},
                    isPlaceholder: true,
                }]);
            } else {
                setSelectedPeriodResponses(responses);
            }

            if (responses.length > 0) {
                setSelectedEvaluation(responses[0]);
            } else {
                setSelectedEvaluation({
                    evaluationId: payload.evaluation?.id || evaluationId,
                    employeeId: payload.employee?.id || firstEval.employeeId || period.employeeId,
                    periodStart: payload.evaluation?.periodStart || firstEval.periodStart,
                    periodEnd: payload.evaluation?.periodEnd || firstEval.periodEnd,
                    periodName: payload.evaluation?.periodName || firstEval.periodName,
                    overallScore: payload.evaluation?.averageScore ? payload.evaluation.averageScore * 20 : null,
                    responsesCount: payload.responses?.length || firstEval.responsesCount || 0,
                    factorScores: {},
                    isPlaceholder: true,
                });
            }
        } catch (err) {
            console.error('Failed to load evaluation responses', err);
            onError?.({
                message: 'Unable to fetch evaluation details for this period. Please try again.',
                type: 'error',
            });
        } finally {
            setIsLoadingPeriodResponses(false);
        }
    };

    const handleViewDetails = async (evaluation) => {
        if (!evaluation || evaluation.isPlaceholder) return;

        setView('detail');

        if (responseDetailsMap[evaluation.id]) {
            setSelectedEvaluation(prev => ({
                ...evaluation,
                ...responseDetailsMap[evaluation.id],
            }));
            return;
        }

        setIsDetailLoading(true);
        try {
            const response = await performanceAPI.getEvaluationResponseDetail(evaluation.id);
            const payload = response.data || {};
            const detail = payload.response || null;

            if (!detail) {
                setSelectedEvaluation(evaluation);
                return;
            }

            const { scores = {}, ...detailRest } = detail;

            const factorScores = Object.entries(SCORE_FIELD_TO_FACTOR_MAP).reduce((acc, [factorId, scoreField]) => {
                if (typeof scores[scoreField] === 'number') {
                    acc[factorId] = { score: scores[scoreField] };
                }
                return acc;
            }, {});

            const normalized = {
                ...detailRest,
                factorScores,
                overallScore: typeof detail.overallScore === 'number' ? detail.overallScore * 20 : null,
                commentSummary: detail.commentSummary,
                commentDevelopment: detail.commentDevelopment,
                evaluator: payload.evaluator ? {
                    id: payload.evaluator.id,
                    name: payload.evaluator.name,
                    position: payload.evaluator.position,
                    positionId: payload.evaluator.positionId,
                    imageUrl: payload.evaluator.profilePictureUrl,
                } : null,
                periodStart: payload.evaluation?.periodStart,
                periodEnd: payload.evaluation?.periodEnd,
                periodName: payload.evaluation?.periodName,
            };

            setResponseDetailsMap(prev => ({ ...prev, [evaluation.id]: normalized }));
            setSelectedEvaluation({
                ...evaluation,
                ...normalized,
            });
        } catch (error) {
            console.error('Failed to load evaluation response detail', error);
            onError?.({
                message: 'Unable to load evaluator response details.',
                type: 'error',
            });
            setSelectedEvaluation(evaluation);
        } finally {
            setIsDetailLoading(false);
        }
    };
    
    const handleBackToList = () => {
        setView(employeeHistoryData ? 'history' : 'list');
        setSelectedEvaluation(null);
    };
    
    const handleBackToHistory = () => {
        setView('history');
        setSelectedEvaluation(null);
    };

    if (!show) return null;

    // --- RENDER FUNCTIONS ---
    const renderHistoryView = () => (
        <>
            <div className="modal-header">
                <h5 className="modal-title">
                    Evaluation History for {subjectEmployee?.name || 'Employee'}
                </h5>
            </div>
            <div className="modal-body evaluator-list-body">
                {isHistoryLoading ? (
                    <div className="text-center p-4">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading evaluation history...</p>
                    </div>
                ) : employeeHistory.length === 0 ? (
                    <div className="text-center text-muted p-4">
                        No evaluation history found for this employee.
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </>
    );

    const renderListView = () => (
        <>
            <div className="modal-header">
                {employeeHistoryData && <button className="btn btn-sm btn-light me-2 back-to-list-btn" onClick={handleBackToHistory}><i className="bi bi-arrow-left"></i></button>}
                <div className="header-info">
                    <h5 className="modal-title">Evaluations for {subjectEmployee?.name || 'Employee'}</h5>
                    {currentPeriodContext ? (
                        <p className="text-muted mb-0">Period: {currentPeriodContext.periodStart} to {currentPeriodContext.periodEnd}</p>
                    ) : (
                        <p className="text-muted mb-0">Select a period to view evaluator responses.</p>
                    )}
                </div>
            </div>
            <div className="modal-body evaluator-list-body">
                {isLoadingPeriodResponses ? (
                    <div className="text-center p-4">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading evaluations...</p>
                    </div>
                ) : !currentPeriodContext ? (
                    <div className="text-center text-muted">No evaluation period selected.</div>
                ) : evaluatorList.length === 0 || evaluatorList.every(item => item.evaluation.isPlaceholder) ? (
                    <div className="text-center text-muted">No evaluations submitted for this period yet.</div>
                ) : (
                    evaluatorList.map(({ evaluator, evaluation }) => (
                        <div key={evaluation.id} className="evaluator-card">
                            <div className="evaluator-info">
                                {evaluator ? (
                                    <>
                                        <img src={evaluator.imageUrl || placeholderAvatar} alt={evaluator.name} className="evaluator-avatar" />
                                        <div>
                                            <div className="evaluator-name">{evaluator.name}</div>
                                            <div className="evaluator-position">{evaluator.position || (evaluator.positionId ? positionMap.get(evaluator.positionId) : null) || 'N/A'}</div>
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
        if (!selectedEvaluation) {
            return (
                <>
                    <div className="modal-header">
                        <button className="btn btn-sm btn-light me-2 back-to-list-btn" onClick={handleBackToList}><i className="bi bi-arrow-left"></i></button>
                        <div className="header-info">
                            <h5 className="modal-title">Evaluation details</h5>
                            <p className="text-muted mb-0">Select an evaluation to see the details.</p>
                        </div>
                    </div>
                    <div className="modal-body text-center text-muted" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                        No evaluation selected.
                    </div>
                </>
            );
        }
        
        const evaluator = employeeMap.get(selectedEvaluation.evaluatorId) || selectedEvaluation.evaluator || null;
        const criteria = factorsCatalog.filter(f => f.type === 'criterion');
        const textAreas = factorsCatalog.filter(f => f.type === 'textarea');
        const getFactorData = (factorId) => selectedEvaluation.factorScores?.[factorId] || {};

        return (
            <>
                <div className="modal-header">
                    <button className="btn btn-sm btn-light me-2 back-to-list-btn" onClick={handleBackToList}><i className="bi bi-arrow-left"></i></button>
                    <ScoreDonutChart score={selectedEvaluation.overallScore} />
                    <div className="header-info">
                        <h5 className="modal-title">{subjectEmployee?.name || 'Employee'}</h5>
                        <p className="text-muted mb-0">Period: {selectedEvaluation.periodStart} to {selectedEvaluation.periodEnd}</p>
                        {evaluator && (
                            <div className="evaluator-info d-flex align-items-center gap-2">
                                <img src={evaluator.imageUrl || placeholderAvatar} alt={evaluator.name} className="evaluator-avatar" />
                                <div>
                                    <div><strong>{evaluator.name}</strong></div>
                                    <small className="text-muted">{evaluator.position || (evaluator.positionId ? positionMap.get(evaluator.positionId) : null) || 'N/A'}</small>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                    {isDetailLoading && (
                        <div className="text-center text-muted py-4">
                            <div className="spinner-border spinner-border-sm me-2" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            Loading evaluation details…
                        </div>
                    )}

                    {!isDetailLoading && criteria.map(criterion => (
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

                    {!isDetailLoading && textAreas.length > 0 && (
                        <div className="card">
                            <div className="card-body">
                                {textAreas.map(area => {
                                    const data = getFactorData(area.id);
                                    const value = data.comments || selectedEvaluation[area.id === 'factor_evaluator_summary' ? 'commentSummary' : area.id === 'factor_development_areas' ? 'commentDevelopment' : ''];
                                    if (!value) return null;
                                    return (
                                        <div key={area.id} className="mb-3">
                                            <h6 className="fw-bold mb-1">{area.title}</h6>
                                            <p className="text-muted mb-0">{value}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    };

    const renderContent = () => {
        if (!subjectEmployee && isHistoryLoading) {
            return (
                <div className="text-center p-5">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading employee data...</p>
                </div>
            );
        }

        if (!subjectEmployee) {
            return (
                <div className="text-center p-5">
                    <p className="text-muted">No employee data available.</p>
                </div>
            );
        }

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