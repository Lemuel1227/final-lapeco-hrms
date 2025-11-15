import React, { useState, useMemo, useEffect } from 'react';
import ScoreIndicator from './ScoreIndicator';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import { performanceAPI } from '../../services/api';

const EvaluationHistory = ({
  employees = [],
  positions = [],
  evaluations = [],
  evaluationPeriods = [],
  theme = {},
  onGenerateReport,
  onViewEvaluation,
  onShowToast,
}) => {
  const [overviewData, setOverviewData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySortConfig, setHistorySortConfig] = useState({ key: 'employeeName', direction: 'ascending' });
  const [selectedPositionId, setSelectedPositionId] = useState('all');
  const [selectedPeriodId, setSelectedPeriodId] = useState('all');
  const [periodEvaluations, setPeriodEvaluations] = useState([]);
  const [isLoadingPeriodData, setIsLoadingPeriodData] = useState(false);

  const positionOptions = useMemo(() => {
    const opts = Array.isArray(positions) ? positions.map(p => ({ id: String(p.id), title: p.title })) : [];
    // Ensure unique titles in case of duplicates
    const dedupById = new Map(opts.map(o => [o.id, o]));
    return Array.from(dedupById.values());
  }, [positions]);

  const evaluationHistory = useMemo(() => {
    if (overviewData.length === 0) return [];

    const historyByEmployee = evaluations.reduce((acc, evaluationEntry) => {
      if (!acc[evaluationEntry.employeeId]) {
        acc[evaluationEntry.employeeId] = [];
      }
      acc[evaluationEntry.employeeId].push(evaluationEntry);
      return acc;
    }, {});

    let filteredData = overviewData.map(emp => {
      const employeeHistoryEntries = historyByEmployee[emp.id] || [];
      const toPercent = (v) => (v == null ? null : (Number(v) <= 5 ? Number(v) * 20 : Number(v)));

      // Compute All Period average as the average of per-period averages
      const periodGroups = new Map();
      employeeHistoryEntries.forEach(ev => {
        const pid = ev.periodId ?? ev.period_id;
        const start = ev.periodStart ?? ev.period_start;
        const end = ev.periodEnd ?? ev.period_end;
        let key = null;
        if (pid) key = `id:${pid}`;
        else if (start && end) key = `range:${start}|${end}`;
        // If we cannot identify a period, skip this evaluation from All Period calc
        if (!key) return;
        const arr = periodGroups.get(key) || [];
        arr.push(ev);
        periodGroups.set(key, arr);
      });
      const perPeriodAverages = Array.from(periodGroups.values()).map(group => {
        const scores = [];
        group.forEach(ev => {
          if (Array.isArray(ev.responses) && ev.responses.length) {
            ev.responses.forEach(r => {
              const p = toPercent(r.overallScore ?? r.overall_score);
              if (p != null) scores.push(p);
            });
          } else {
            const evalLevel = ev.overallScore ?? ev.overall_score ?? ev.averageScore ?? ev.average_score ?? ev.evaluationAverage;
            const p = toPercent(evalLevel);
            if (p != null) scores.push(p);
          }
        });
        if (!scores.length) return null;
        return scores.reduce((a,b) => a+b, 0) / scores.length;
      }).filter(v => v != null);
      let percentageScoreAllFinal = null;
      if (perPeriodAverages.length) {
        percentageScoreAllFinal = perPeriodAverages.reduce((a,b) => a+b, 0) / perPeriodAverages.length;
      } else {
        // Fallback: if we couldn't identify period groups, compute a flat average over all evaluations
        const flatScores = [];
        employeeHistoryEntries.forEach(ev => {
          if (Array.isArray(ev.responses) && ev.responses.length) {
            ev.responses.forEach(r => {
              const p = toPercent(r.overallScore ?? r.overall_score);
              if (p != null) flatScores.push(p);
            });
          } else {
            const evalLevel = ev.overallScore ?? ev.overall_score ?? ev.averageScore ?? ev.average_score ?? ev.evaluationAverage;
            const p = toPercent(evalLevel);
            if (p != null) flatScores.push(p);
          }
        });
        if (flatScores.length) {
          percentageScoreAllFinal = flatScores.reduce((a,b) => a+b, 0) / flatScores.length;
        } else {
          // Last resort: use overview average so a score still appears when no evals exist
          const overviewFallbackPercent = toPercent(emp.combinedAverageScore ?? emp.averageScore ?? emp.average_score);
          percentageScoreAllFinal = overviewFallbackPercent ?? null;
        }
      }
      // If a specific period is selected, compute per-period score for this employee
      let periodAwareScore = percentageScoreAllFinal;
      if (selectedPeriodId && selectedPeriodId !== 'all') {
        const selectedPeriod = Array.isArray(evaluationPeriods) ? evaluationPeriods.find(p => String(p.id) === String(selectedPeriodId)) : null;

        // Prefer fetched period evaluations if available
        if (Array.isArray(periodEvaluations) && periodEvaluations.length > 0) {
          const evsForEmployee = periodEvaluations.filter(pe => String(pe.employeeId) === String(emp.id));
          if (evsForEmployee.length > 0) {
            // Prefer averaging across ALL evaluator responses for true per-period average
            const responsePercents = evsForEmployee.flatMap(evItem => {
              const resp = Array.isArray(evItem.responses) ? evItem.responses : [];
              return resp.map(r => toPercent(r.overallScore)).filter(v => typeof v === 'number' && !Number.isNaN(v));
            });

            if (responsePercents.length > 0) {
              periodAwareScore = responsePercents.reduce((a,b) => a+b, 0) / responsePercents.length;
            } else {
              // Fallback to evaluation-level averageScore(s)
              const evalPercents = evsForEmployee.map(evItem => {
                const avg = evItem.averageScore;
                return typeof avg === 'number' ? toPercent(avg) : null;
              }).filter(v => typeof v === 'number' && !Number.isNaN(v));
              periodAwareScore = evalPercents.length ? (evalPercents.reduce((a,b) => a+b, 0) / evalPercents.length) : null;
            }
          } else {
            periodAwareScore = null;
          }
        } else {
          // Fallback: derive score by filtering existing evaluations to the selected period
          const inSelectedPeriod = (ev) => {
            const evPeriodId = ev.periodId ?? ev.period_id;
            if (evPeriodId && String(evPeriodId) === String(selectedPeriodId)) return true;
            if (!selectedPeriod) return false;
            const start = selectedPeriod.evaluationStart || selectedPeriod.periodStart || selectedPeriod.evaluation_start || selectedPeriod.period_start;
            const end = selectedPeriod.evaluationEnd || selectedPeriod.periodEnd || selectedPeriod.evaluation_end || selectedPeriod.period_end;
            if (!start || !end) return false;
            const evStart = ev.periodStart ?? ev.period_start;
            const evEnd = ev.periodEnd ?? ev.period_end;
            if (evStart && evEnd && evStart === start && evEnd === end) return true;
            try {
              const s = new Date(start);
              const e = new Date(end);
              const dates = [];
              if (Array.isArray(ev.responses)) {
                ev.responses.forEach(r => {
                  const d = r.evaluatedOn ?? r.evaluated_on;
                  if (d) dates.push(new Date(d));
                });
              }
              const evalDate = ev.evaluationDate ?? ev.evaluation_date;
              if (evalDate) dates.push(new Date(evalDate));
              if (evEnd) dates.push(new Date(evEnd));
              return dates.some(d => d && !Number.isNaN(d.getTime()) && d >= s && d <= e);
            } catch { return false; }
          };
          const periodEntries = employeeHistoryEntries.filter(inSelectedPeriod);
          const scores = [];
          periodEntries.forEach(ev => {
            if (Array.isArray(ev.responses) && ev.responses.length) {
              ev.responses.forEach(r => { const p = toPercent(r.overallScore); if (p != null) scores.push(p); });
            } else if (ev.evaluationAverage != null) {
              const p = toPercent(ev.evaluationAverage); if (p != null) scores.push(p);
            }
          });
          periodAwareScore = scores.length ? (scores.reduce((a,b) => a+b, 0) / scores.length) : null;
        }
      }
      return {
        ...emp,
        employeeId: emp.id,
        rawAverageScore: emp.combinedAverageScore,
        combinedAverageScore: periodAwareScore,
        history: employeeHistoryEntries,
      };
    });

    if (selectedPositionId && selectedPositionId !== 'all') {
      filteredData = filteredData.filter(emp => {
        const empPosId = emp.positionId ? String(emp.positionId) : null;
        const matchById = empPosId && empPosId === String(selectedPositionId);
        if (matchById) return true;
        const pos = emp.position || '';
        const sel = positionOptions.find(p => p.id === String(selectedPositionId));
        return sel ? String(pos).toLowerCase() === String(sel.title).toLowerCase() : false;
      });
    }

    if (historySearchTerm) {
      const lowerSearch = historySearchTerm.toLowerCase();
      filteredData = filteredData.filter(emp => emp.name.toLowerCase().includes(lowerSearch));
    }

    filteredData.sort((a, b) => {
      const key = historySortConfig.key;
      const direction = historySortConfig.direction === 'ascending' ? 1 : -1;
      let valA, valB;

      if (key === 'employeeName') {
        valA = a.name;
        valB = b.name;
      } else if (key === 'overallScore') {
        valA = a.combinedAverageScore || 0;
        valB = b.combinedAverageScore || 0;
      } else {
        valA = a[key];
        valB = b[key];
      }

      if (typeof valA === 'string') return valA.localeCompare(valB) * direction;
      if (typeof valA === 'number') return (valA - valB) * direction;
      return 0;
    });

    return filteredData;
  }, [overviewData, historySearchTerm, historySortConfig, evaluations, selectedPeriodId, evaluationPeriods, periodEvaluations]);

  const getSortIcon = (key) => {
    if (historySortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1 opacity-25"></i>;
    return historySortConfig.direction === 'ascending' ? (
      <i className="bi bi-sort-up sort-icon active ms-1"></i>
    ) : (
      <i className="bi bi-sort-down sort-icon active ms-1"></i>
    );
  };

  const requestHistorySort = (key) => {
    let direction = 'ascending';
    if (historySortConfig.key === key && historySortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setHistorySortConfig({ key, direction });
  };

  const refreshOverview = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await performanceAPI.getOverview();
      setOverviewData(response.data?.employees || []);
    } catch (error) {
      console.error('Failed to load evaluation history', error);
      onShowToast?.({ message: 'Failed to load evaluation history.', type: 'error' });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch evaluations for a selected period to ensure scores appear across all periods
  useEffect(() => {
    if (!selectedPeriodId || selectedPeriodId === 'all') {
      setPeriodEvaluations([]);
      return;
    }
    let isCancelled = false;
    const fetchPeriodEvaluations = async () => {
      try {
        setIsLoadingPeriodData(true);
        const response = await performanceAPI.getPeriodicEvaluations(selectedPeriodId);
        const payload = response.data || {};
        const fetchedPeriod = payload.period || {};
        const normalizedEvaluations = Array.isArray(fetchedPeriod.evaluations)
          ? fetchedPeriod.evaluations.map(ev => ({
              id: ev.id,
              employeeId: ev.employeeId ?? ev.employee_id,
              averageScore: ev.averageScore ?? ev.average_score,
              responses: Array.isArray(ev.responses)
                ? ev.responses.map(resp => ({ overallScore: resp.overallScore ?? resp.overall_score }))
                : [],
            }))
          : [];
        if (!isCancelled) setPeriodEvaluations(normalizedEvaluations);
      } catch (error) {
        console.error('Failed to load evaluations for selected period', error);
        if (!isCancelled) {
          setPeriodEvaluations([]);
          onShowToast?.({ message: 'Failed to load period evaluations.', type: 'error' });
        }
      } finally {
        if (!isCancelled) setIsLoadingPeriodData(false);
      }
    };
    fetchPeriodEvaluations();
    return () => { isCancelled = true; };
  }, [selectedPeriodId]);

  useEffect(() => {
    if (overviewData.length === 0) {
      refreshOverview();
    }
  }, []);

  return (
    <div className="performance-history-layout">
      {isLoadingHistory ? (
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading evaluation history...</p>
        </div>
      ) : (
        <div className="card dashboard-history-table">
          <div className="history-table-controls">
            <h6><i className="bi bi-clock-history me-2"></i>Evaluation History</h6>
            <div className='d-flex align-items-center gap-2'>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="positionFilter" className="small text-muted">Position</label>
                <select
                  id="positionFilter"
                  className="form-select form-select-sm"
                  value={selectedPositionId}
                  onChange={(e) => setSelectedPositionId(e.target.value)}
                  style={{ minWidth: '200px' }}
                >
                  <option value="all">All Positions</option>
                  {positionOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="periodFilter" className="small text-muted">Period</label>
                <select
                  id="periodFilter"
                  className="form-select form-select-sm"
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  style={{ minWidth: '220px' }}
                >
                  <option value="all">All Periods</option>
                  {Array.isArray(evaluationPeriods) && evaluationPeriods.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {isLoadingPeriodData && (
                  <span className="spinner-border spinner-border-sm text-muted" role="status" aria-hidden="true"></span>
                )}
              </div>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search by name..." 
                  value={historySearchTerm} 
                  onChange={e => setHistorySearchTerm(e.target.value)} 
                />
              </div>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table data-table mb-0 align-middle">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => requestHistorySort('employeeName')}>
                    Employee {getSortIcon('employeeName')}
                  </th>
                  <th className="sortable" onClick={() => requestHistorySort('overallScore')}>
                    Score {getSortIcon('overallScore')}
                  </th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {evaluationHistory.length > 0 ? evaluationHistory.map(emp => {
                  const hasScore = typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore);

                  return (
                    <tr key={emp.id}>
                      <td>
                        <div className='d-flex align-items-center'>
                          <img 
                            src={emp.profilePictureUrl || placeholderAvatar} 
                            alt={emp.name} 
                            className='avatar-table me-2' 
                            style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '50%' }}
                            onError={(e) => {
                              e.target.src = placeholderAvatar;
                            }}
                          />
                          <div>
                            <div className='fw-bold'>{emp.name}</div>
                            <small className='text-muted'>{emp.position}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {hasScore ? (
                          <ScoreIndicator score={emp.combinedAverageScore} />
                        ) : (
                          <span className="text-muted">No evaluation found for this employee.</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-secondary" 
                          onClick={() => onViewEvaluation(emp)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="3" className="text-center p-4">
                      No employees found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationHistory;