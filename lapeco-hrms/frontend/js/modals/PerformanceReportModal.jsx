import React, { useState, useMemo, useEffect } from 'react';
import Select from 'react-select';

const PerformanceReportModal = ({ show, onClose, onGenerate, evaluationPeriods = [] }) => {
  const [periodId, setPeriodId] = useState('all');
  const [error, setError] = useState('');

  const performancePeriodOptions = useMemo(() => [
    { value: 'all', label: 'All Time' },
    ...evaluationPeriods.map(p => ({ value: p.id, label: p.name }))
  ], [evaluationPeriods]);

  useEffect(() => {
    if (show) {
      setPeriodId('all');
      setError('');
    }
  }, [show]);

  const handleGenerateClick = () => {
    if (!periodId) {
      setError('An evaluation period must be selected.');
      return;
    }
    setError('');
    onGenerate({ periodId });
    onClose();
  };

  const handleClose = () => {
    setPeriodId('all');
    setError('');
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Generate Performance Report</h5>
            <button type="button" className="btn-close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted">Select an evaluation period to include in the report. The report will summarize all evaluations completed within the selected period.</p>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <div className="mb-3">
              <label htmlFor="periodId" className="form-label">Select Evaluation Period*</label>
              <Select
                id="periodId"
                options={performancePeriodOptions}
                value={performancePeriodOptions.find(opt => opt.value === periodId)}
                onChange={(option) => setPeriodId(option ? option.value : 'all')}
                className="react-select-container"
                classNamePrefix="react-select"
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={handleClose}>Cancel</button>
            <button type="button" className="btn btn-success" onClick={handleGenerateClick}>Generate Report</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReportModal;