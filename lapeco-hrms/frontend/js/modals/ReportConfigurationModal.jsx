import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';

const ReportConfigurationModal = ({ show, onClose, onRunReport, reportConfig, trainingPrograms, payrolls }) => {
  const [params, setParams] = useState({});
  const [dateRangeMode, setDateRangeMode] = useState('dateRange');
  const [error, setError] = useState('');

  const optionalDateRangeParam = useMemo(() => 
    reportConfig?.parameters?.find(p => p.type === 'date-range' && p.optional)
  , [reportConfig]);
  
  const availableYears = useMemo(() => {
    if (!payrolls) return [new Date().getFullYear()];
    const years = new Set(payrolls.map(run => new Date(run.cutOff.split(' to ')[0]).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [payrolls]);

  useEffect(() => {
    if (show && reportConfig) {
      const today = new Date().toISOString().split('T')[0];
      const initialParams = (reportConfig.parameters || []).reduce((acc, param) => {
        if (param.type === 'date-range') {
          acc.startDate = today;
          if (param.labels.end) {
            acc.endDate = today;
          }
        }
        if (param.type === 'as-of-date') {
          acc.asOfDate = today;
        }
        if (param.type === 'program-selector') {
          acc.programId = null;
        }
        if (param.type === 'payroll-run-selector') {
          acc.runId = null;
        }
        if (param.type === 'year-selector') {
          acc.year = new Date().getFullYear();
        }
        return acc;
      }, {});
      setParams(initialParams);
      setDateRangeMode(optionalDateRangeParam ? 'allTime' : 'dateRange');
      setError('');
    }
  }, [show, reportConfig, optionalDateRangeParam]);
  
  const payrollRunOptions = useMemo(() => 
    (payrolls || []).map(run => ({
      value: run.runId,
      label: `Pay Period: ${run.cutOff} (${run.records.length} employees)`
    })).sort((a,b) => {
      const dateA = new Date(a.label.split(' to ')[1].split(' (')[0]);
      const dateB = new Date(b.label.split(' to ')[1].split(' (')[0]);
      return dateB - dateA;
    }),
  [payrolls]);

  const programOptions = useMemo(() => 
    (trainingPrograms || []).map(p => ({ value: p.id, label: p.title }))
  , [trainingPrograms]);

  if (!show || !reportConfig) {
    return null;
  }

  const handleParamChange = (name, value) => {
    setParams(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    const dateParam = reportConfig.parameters.find(p => p.type === 'date-range');
    if (dateParam && dateRangeMode === 'dateRange') {
      if (!params.startDate || (dateParam.labels.end && !params.endDate)) {
        setError('Both start and end dates are required for a custom range.');
        return;
      }
      if (params.startDate && params.endDate && new Date(params.endDate) < new Date(params.startDate)) {
        setError('End date cannot be before the start date.');
        return;
      }
    }
    
    const yearParam = reportConfig.parameters.find(p => p.type === 'year-selector');
    if (yearParam && !params.year) {
        setError('A year must be selected.');
        return;
    }

    const asOfDateParam = reportConfig.parameters.find(p => p.type === 'as-of-date');
    if(asOfDateParam && !params.asOfDate) {
        setError('An "As-Of" date is required.');
        return;
    }
    
    const finalParams = { ...params };
    if (optionalDateRangeParam && dateRangeMode === 'allTime') {
        finalParams.startDate = null;
        finalParams.endDate = null;
    }

    onRunReport(reportConfig.id, finalParams);
  };

  const renderParameterInputs = () => (
    (reportConfig.parameters || []).map(param => {
      switch (param.type) {
        case 'date-range':
          return (
            <div key={param.id} className="mb-3">
              {param.optional ? (
                <>
                  <div className="form-check mb-2">
                    <input className="form-check-input" type="radio" name="dateRangeMode" id="allTimeRadio" value="allTime" checked={dateRangeMode === 'allTime'} onChange={(e) => setDateRangeMode(e.target.value)} />
                    <label className="form-check-label" htmlFor="allTimeRadio">
                      <strong>All Time</strong>
                      <small className="d-block text-muted">Include all records in the system.</small>
                    </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="radio" name="dateRangeMode" id="dateRangeRadio" value="dateRange" checked={dateRangeMode === 'dateRange'} onChange={(e) => setDateRangeMode(e.target.value)} />
                    <label className="form-check-label" htmlFor="dateRangeRadio">
                      <strong>Custom Date Range</strong>
                      <small className="d-block text-muted">Only include records within a specific period.</small>
                    </label>
                  </div>
                  {dateRangeMode === 'dateRange' && (
                    <div className="row g-2 mt-2 ps-4">
                      <div className="col-md-6"><label htmlFor="startDate" className="form-label small">{param.labels.start}</label><input type="date" id="startDate" className="form-control" value={params.startDate || ''} onChange={(e) => handleParamChange('startDate', e.target.value)} required /></div>
                      {param.labels.end && (<div className="col-md-6"><label htmlFor="endDate" className="form-label small">{param.labels.end}</label><input type="date" id="endDate" className="form-control" value={params.endDate || ''} onChange={(e) => handleParamChange('endDate', e.target.value)} required /></div>)}
                    </div>
                  )}
                </>
              ) : (
                <div className="row g-3">
                  <div className={param.labels.end ? "col-md-6" : "col-12"}><label htmlFor="startDate" className="form-label">{param.labels.start}</label><input type="date" id="startDate" className="form-control" value={params.startDate || ''} onChange={(e) => handleParamChange('startDate', e.target.value)} required /></div>
                  {param.labels.end && (<div className="col-md-6"><label htmlFor="endDate" className="form-label">{param.labels.end}</label><input type="date" id="endDate" className="form-control" value={params.endDate || ''} onChange={(e) => handleParamChange('endDate', e.target.value)} required /></div>)}
                </div>
              )}
            </div>
          );
        
        case 'as-of-date':
          return (
            <div key={param.id} className="mb-3">
              <label htmlFor="asOfDate" className="form-label">{param.label}</label>
              <input 
                type="date" 
                id="asOfDate" 
                className="form-control" 
                value={params.asOfDate || ''} 
                onChange={(e) => handleParamChange('asOfDate', e.target.value)} 
                required 
              />
            </div>
          );

        case 'program-selector':
          return (
            <div key={param.id} className="mb-3">
              <label htmlFor="programId" className="form-label">{param.label}</label>
              <Select id="programId" options={programOptions} onChange={(option) => handleParamChange('programId', option ? option.value : null)} isClearable className="react-select-container" classNamePrefix="react-select" required />
            </div>
          );
        
        case 'payroll-run-selector':
          return (
            <div key={param.id} className="mb-3">
              <label htmlFor="runId" className="form-label">{param.label}</label>
              <Select id="runId" options={payrollRunOptions} onChange={(option) => handleParamChange('runId', option ? option.value : null)} isClearable placeholder="Select a generated payroll run..." className="react-select-container" classNamePrefix="react-select" required />
            </div>
          );
        
        case 'year-selector':
          return (
            <div key={param.id} className="mb-3">
              <label htmlFor="year" className="form-label">{param.label}</label>
              <select
                id="year"
                className="form-select"
                value={params.year || ''}
                onChange={(e) => handleParamChange('year', e.target.value)}
                required
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          );

        default:
          return null;
      }
    })
  );

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">Configure: {reportConfig.title}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p className="text-muted small">{reportConfig.description}</p>
              <hr />
              {error && <div className="alert alert-danger py-2">{error}</div>}
              {renderParameterInputs()}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">Run Report</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportConfigurationModal;