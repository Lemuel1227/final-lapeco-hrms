import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { startOfDay, endOfDay, isPast, isFuture, parseISO } from 'date-fns';
import PeriodCard from './PeriodCard';
import AddEditPeriodModal from '../../modals/AddEditPeriodModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import PeriodResultsModal from '../../modals/PeriodResultsModal';
import { performanceAPI } from '../../services/api';

const ManagePeriods = ({ 
  employees = [], 
  evaluations = [],
  handlers = {},
  onShowToast,
  onViewResults,
  onViewSubmission
}) => {
  const [evaluationPeriods, setEvaluationPeriods] = useState([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [periodSearchTerm, setPeriodSearchTerm] = useState('');
  const [periodStatusFilter, setPeriodStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsPeriod, setResultsPeriod] = useState(null);

  const { saveEvaluationPeriod: savePeriodHandler, deleteEvaluationPeriod: deletePeriodHandler } = handlers;

  const normalizePeriod = (period = {}) => ({
    id: period.id,
    name: period.name || '',
    evaluationStart: period.evaluationStart || period.evaluation_start || '',
    evaluationEnd: period.evaluationEnd || period.evaluation_end || '',
    openDate: period.openDate || period.open_date || period.activationStart || '',
    closeDate: period.closeDate || period.close_date || period.activationEnd || '',
    status: period.status,
    overallScore: period.overallScore ?? period.overall_score ?? null,
    createdBy: period.createdBy || period.created_by || null,
    updatedBy: period.updatedBy || period.updated_by || null,
    createdAt: period.createdAt || period.created_at || null,
    updatedAt: period.updatedAt || period.updated_at || null,
    evaluations: period.evaluations || [],
  });

  const isEmployeeActive = useCallback((employee) => {
    const rawStatus = employee?.status ?? employee?.employmentStatus ?? employee?.employment_status ?? '';
    return String(rawStatus).toLowerCase() === 'active';
  }, []);

  const evaluationCountsByPeriod = useMemo(() => {
    const activeEmployees = employees.filter(isEmployeeActive);
    const leaders = activeEmployees.filter(e => e.isTeamLeader);
    const members = activeEmployees.filter(e => !e.isTeamLeader);

    const periodStats = {};

    for (const period of evaluationPeriods) {
      const leaderEvalTasks = leaders.reduce((sum, leader) => {
        const teamSize = members.filter(m => m.positionId === leader.positionId).length;
        return sum + teamSize;
      }, 0);
      const memberEvalTasks = members.length;
      const leadersOwnEvalTasks = leaders.length;
      const totalTasks = leaderEvalTasks + memberEvalTasks + leadersOwnEvalTasks;
      const start = startOfDay(parseISO(period.evaluationStart));
      const end = endOfDay(parseISO(period.evaluationEnd));
      
      const completedCount = evaluations.filter(ev => {
        const evalDate = parseISO(ev.periodEnd);
        return evalDate >= start && evalDate <= end;
      }).length;
      
      periodStats[period.id] = { completed: completedCount, total: totalTasks };
    }
    return periodStats;
  }, [evaluationPeriods, evaluations, employees, isEmployeeActive]);

  const sortedEvaluationPeriods = useMemo(() => 
    [...evaluationPeriods].sort((a,b) => new Date(b.evaluationStart) - new Date(a.evaluationStart))
  , [evaluationPeriods]);

  const getPeriodStatusValue = (period) => {
    const today = startOfDay(new Date());
    const openWindowStart = period.openDate ? startOfDay(parseISO(period.openDate)) : null;
    const openWindowEnd = period.closeDate ? endOfDay(parseISO(period.closeDate)) : null;
    const fallbackStart = period.evaluationStart ? startOfDay(parseISO(period.evaluationStart)) : null;
    const fallbackEnd = period.evaluationEnd ? endOfDay(parseISO(period.evaluationEnd)) : null;

    const windowStart = openWindowStart || fallbackStart;
    const windowEnd = openWindowEnd || fallbackEnd;

    if (windowStart && windowEnd && today >= windowStart && today <= windowEnd) return 'active';
    if (windowStart && isFuture(windowStart)) return 'upcoming';
    if (windowEnd && isPast(windowEnd)) return 'closed';
    return 'closed';
  };

  const filteredAndSortedPeriods = useMemo(() => {
    let periods = [...sortedEvaluationPeriods];
    if (periodStatusFilter !== 'all') {
      periods = periods.filter(p => getPeriodStatusValue(p) === periodStatusFilter);
    }
    if (periodSearchTerm) {
      const lowerSearch = periodSearchTerm.toLowerCase();
      periods = periods.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }
    return periods;
  }, [sortedEvaluationPeriods, periodSearchTerm, periodStatusFilter]);

  const refreshEvaluationPeriods = async () => {
    try {
      setIsLoading(true);
      const response = await performanceAPI.getEvaluationPeriods();
      const payload = response.data || {};
      const periods = Array.isArray(payload.evaluationPeriods) ? payload.evaluationPeriods : [];
      setEvaluationPeriods(periods.map(normalizePeriod));
    } catch (error) {
      console.error('Failed to load evaluation periods', error);
      if (onShowToast) {
        onShowToast({ message: 'Failed to load evaluation periods.', type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshEvaluationPeriods();
  }, []);

  const handleOpenPeriodModal = (period = null) => {
    setEditingPeriod(period);
    setShowPeriodModal(true);
  };

  const handleSavePeriod = async (payload, periodId) => {
    try {
      const body = {
        name: payload.name,
        evaluation_start: payload.evaluationStart,
        evaluation_end: payload.evaluationEnd,
        open_date: payload.openDate,
        close_date: payload.closeDate,
      };

      if (periodId) {
        await performanceAPI.updatePeriod(periodId, body);
      } else {
        await performanceAPI.createPeriod(body);
      }

      if (typeof savePeriodHandler === 'function') {
        await savePeriodHandler(payload, periodId);
      }
      
      await refreshEvaluationPeriods();
      setShowPeriodModal(false);
      
      if (onShowToast) {
        onShowToast({ 
          message: `Evaluation period ${periodId ? 'updated' : 'created'} successfully!`, 
          type: 'success' 
        });
      }
    } catch (error) {
      console.error('Failed to save evaluation period', error);
      if (onShowToast) {
        onShowToast({ message: 'Failed to save evaluation period.', type: 'error' });
      }
    }
  };

  const handleConfirmDeletePeriod = async () => {
    if (!periodToDelete) return;

    try {
      if (typeof deletePeriodHandler === 'function') {
        await deletePeriodHandler(periodToDelete.id);
      }
      await performanceAPI.deletePeriod(periodToDelete.id);
      await refreshEvaluationPeriods();
      
      if (onShowToast) {
        onShowToast({ message: 'Evaluation period deleted successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to delete evaluation period', error);
      if (onShowToast) {
        onShowToast({ message: 'Failed to delete evaluation period.', type: 'error' });
      }
    } finally {
      setPeriodToDelete(null);
    }
  };

  const handleViewResults = async (period) => {
    setShowResultsModal(true);
    setResultsPeriod(period);
    if (onViewResults) {
      onViewResults(period);
    }
  };

  const handleCloseResultsModal = () => {
    setShowResultsModal(false);
    setResultsPeriod(null);
  };

  const handleViewSubmissionFromResults = (payload) => {
    if (onViewSubmission) {
      onViewSubmission(payload);
    }
  };

  return (
    <div>
      <div className="period-controls-bar">
        <div className="input-group">
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input
            type="text"
            className="form-control"
            placeholder="Search by period name..."
            value={periodSearchTerm}
            onChange={e => setPeriodSearchTerm(e.target.value)}
          />
        </div>
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className={`btn ${periodStatusFilter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`} 
            onClick={() => setPeriodStatusFilter('all')}
          >
            All
          </button>
          <button 
            type="button" 
            className={`btn ${periodStatusFilter === 'active' ? 'btn-primary' : 'btn-outline-secondary'}`} 
            onClick={() => setPeriodStatusFilter('active')}
          >
            Active
          </button>
          <button 
            type="button" 
            className={`btn ${periodStatusFilter === 'upcoming' ? 'btn-primary' : 'btn-outline-secondary'}`} 
            onClick={() => setPeriodStatusFilter('upcoming')}
          >
            Upcoming
          </button>
          <button 
            type="button" 
            className={`btn ${periodStatusFilter === 'closed' ? 'btn-primary' : 'btn-outline-secondary'}`} 
            onClick={() => setPeriodStatusFilter('closed')}
          >
            Closed
          </button>
        </div>
        <button className="btn btn-success" onClick={() => handleOpenPeriodModal()}>
          <i className="bi bi-plus-lg me-2"></i>Add New Period
        </button>
      </div>

      {isLoading ? (
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading evaluation periods...</p>
        </div>
      ) : (
        <div className="periods-grid-container">
          {filteredAndSortedPeriods.length > 0 ? filteredAndSortedPeriods.map(period => (
            <PeriodCard 
              key={period.id}
              period={period}
              evaluationsCount={evaluationCountsByPeriod[period.id]?.completed || 0}
              totalTargetEvaluations={evaluationCountsByPeriod[period.id]?.total || 0}
              onEdit={() => handleOpenPeriodModal(period)}
              onDelete={() => setPeriodToDelete(period)}
              onViewResults={() => handleViewResults(period)}
            />
          )) : (
            <div className="text-center p-5 bg-light rounded w-100">
              <i className="bi bi-calendar-x fs-1 text-muted mb-3 d-block"></i>
              <h5 className="text-muted">No Evaluation Periods Found</h5>
              <p className="text-muted">Try adjusting your filters or add a new period.</p>
            </div>
          )}
        </div>
      )}

      <AddEditPeriodModal
        show={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onSave={handleSavePeriod}
        periodData={editingPeriod}
      />
      
      <ConfirmationModal
        show={!!periodToDelete}
        onClose={() => setPeriodToDelete(null)}
        onConfirm={handleConfirmDeletePeriod}
        title="Confirm Period Deletion"
        confirmVariant="danger"
        confirmText="Yes, Delete"
      >
        <p>Are you sure you want to delete the evaluation period "<strong>{periodToDelete?.name}</strong>"?</p>
        <p className="text-danger">This action cannot be undone and may disassociate historical evaluations from this period.</p>
      </ConfirmationModal>

      <PeriodResultsModal
        show={showResultsModal}
        period={resultsPeriod}
        onClose={handleCloseResultsModal}
        onViewSubmission={handleViewSubmissionFromResults}
        onError={onShowToast}
      />
    </div>
  );
};

export default ManagePeriods;