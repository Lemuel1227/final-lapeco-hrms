import React, { useState, useMemo, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import ScoreIndicator from './ScoreIndicator';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import { performanceAPI } from '../../services/api';

const PerformanceOverview = ({ 
  employees = [], 
  positions = [], 
  evaluations = [], 
  theme = {},
  onGenerateReport,
  onViewEvaluation,
  onShowToast
}) => {
  const [overviewData, setOverviewData] = useState([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySortConfig, setHistorySortConfig] = useState({ key: 'evaluationDate', direction: 'descending' });

  const positionMap = useMemo(() => new Map(positions.map(p => [p.id, p.title])), [positions]);

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
      const hasRawScore = typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore);
      const percentageScore = hasRawScore ? emp.combinedAverageScore * 20 : null;
      const employeeHistoryEntries = historyByEmployee[emp.id] || [];
      return {
        ...emp,
        employeeId: emp.id,
        rawAverageScore: emp.combinedAverageScore,
        combinedAverageScore: percentageScore,
        history: employeeHistoryEntries,
      };
    });

    if (historySearchTerm) {
      const lowerSearch = historySearchTerm.toLowerCase();
      filteredData = filteredData.filter(emp => 
        emp.name.toLowerCase().includes(lowerSearch)
      );
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
  }, [overviewData, historySearchTerm, historySortConfig, evaluations]);

  const overviewStats = useMemo(() => {
    if (overviewData.length === 0) return { totalEmployees: 0, avgScore: 0, employeesWithScores: 0 };
    const employeesWithScores = overviewData.filter(emp => typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore));
    const avgScore = employeesWithScores.length > 0 
      ? employeesWithScores.reduce((sum, emp) => sum + (emp.combinedAverageScore * 20), 0) / employeesWithScores.length 
      : 0;
    return { 
      totalEmployees: overviewData.length, 
      avgScore: avgScore,
      employeesWithScores: employeesWithScores.length
    };
  }, [overviewData]);

  const overviewPerformanceBrackets = useMemo(() => {
    const brackets = { 'Needs Improvement': 0, 'Meets Expectations': 0, 'Outstanding': 0 };
    overviewData.forEach(emp => {
      const score = typeof emp.combinedAverageScore === 'number' && !Number.isNaN(emp.combinedAverageScore)
        ? emp.combinedAverageScore * 20
        : null;
      if (typeof score !== 'number' || Number.isNaN(score)) return;
      if (score < 70) brackets['Needs Improvement']++;
      else if (score < 90) brackets['Meets Expectations']++;
      else brackets['Outstanding']++;
    });
    return brackets;
  }, [overviewData]);

  const chartTextColor = theme === 'dark' ? '#adb5bd' : '#6c757d';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  const overviewChartData = {
    labels: Object.keys(overviewPerformanceBrackets),
    datasets: [{
      label: 'Number of Employees',
      data: Object.values(overviewPerformanceBrackets),
      backgroundColor: ['#dc3545', '#ffc107', '#198754'],
    }],
  };

  const chartOptions = {
    responsive: true, 
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#212529' : '#ffffff',
        titleColor: theme === 'dark' ? '#f8f9fa' : '#212529',
        bodyColor: theme === 'dark' ? '#f8f9fa' : '#212529',
        borderColor: theme === 'dark' ? '#495057' : '#dee2e6',
        borderWidth: 1,
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, color: chartTextColor }, grid: { color: gridColor } },
      x: { ticks: { color: chartTextColor }, grid: { display: false } },
    },
  };

  const getSortIcon = (key) => {
    if (historySortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1 opacity-25"></i>;
    return historySortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
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
      setIsLoadingOverview(true);
      const response = await performanceAPI.getOverview();
      setOverviewData(response.data?.employees || []);
    } catch (error) {
      console.error('Failed to load performance overview', error);
      if (onShowToast) {
        onShowToast({ message: 'Failed to load performance overview.', type: 'error' });
      }
    } finally {
      setIsLoadingOverview(false);
    }
  };

  useEffect(() => {
    if (overviewData.length === 0) {
      refreshOverview();
    }
  }, []);

  return (
    <div className="performance-dashboard-layout-revised">
      {isLoadingOverview ? (
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading performance overview...</p>
        </div>
      ) : (
        <>
          <div className="stat-card-grid-revised">
            <div className="stat-card-revised">
              <div className="stat-icon"><i className="bi bi-people-fill"></i></div>
              <div className="stat-info">
                <div className="stat-value">{overviewStats.totalEmployees}</div>
                <div className="stat-label">Total Active Employees</div>
              </div>
            </div>
            <div className="stat-card-revised">
              <div className="stat-icon"><i className="bi bi-reception-4"></i></div>
              <div className="stat-info">
                <div className="stat-value">{overviewStats.avgScore.toFixed(1)}<strong>%</strong></div>
                <div className="stat-label">Average Performance Score</div>
              </div>
            </div>
            <div className="stat-card-revised">
              <div className="stat-icon"><i className="bi bi-journal-check"></i></div>
              <div className="stat-info">
                <div className="stat-value">{overviewStats.employeesWithScores}</div>
                <div className="stat-label">Employees with Scores</div>
              </div>
            </div>
          </div>

          <div className="analysis-grid-full-width">
            <div className="card">
              <div className="card-header">
                <h6><i className="bi bi-bar-chart-line-fill me-2"></i>Performance Distribution</h6>
              </div>
              <div className="card-body" style={{ height: '280px' }}>
                <Bar data={overviewChartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card dashboard-history-table">
        <div className="history-table-controls">
          <h6><i className="bi bi-clock-history me-2"></i>Evaluation History</h6>
          <div className='d-flex align-items-center gap-2'>
            <button className="btn btn-outline-secondary text-nowrap" onClick={onGenerateReport}>
              <i className="bi bi-file-earmark-pdf-fill me-1"></i>Generate Report
            </button>
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
                          size='sm' 
                          className='avatar-table me-2' 
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
    </div>
  );
};

export default PerformanceOverview;