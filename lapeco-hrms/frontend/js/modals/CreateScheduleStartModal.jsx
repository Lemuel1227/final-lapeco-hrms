import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateScheduleStartModal = ({ show, onClose, schedules, templates }) => {
  const [step, setStep] = useState(1);
  const [creationMethod, setCreationMethod] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const navigate = useNavigate();

  const schedulesByDate = useMemo(() => {
    return (schedules || []).reduce((acc, sch) => {
      (acc[sch.date] = acc[sch.date] || []).push(sch);
      return acc;
    }, {});
  }, [schedules]);
  
  const sortedScheduleDates = Object.keys(schedulesByDate).sort((a, b) => new Date(b) - new Date(a));
  const existingDates = useMemo(() => new Set(Object.keys(schedulesByDate)), [schedulesByDate]);

  const handleMethodSelect = (method) => {
    if (!selectedDate) {
      alert('Please select a date for the new schedule.');
      return;
    }
    if (existingDates.has(selectedDate)) {
      alert(`A schedule already exists for ${selectedDate}. Please choose a different date, or edit the existing schedule from the 'All Schedules' view.`);
      return;
    }

    if (method === 'new') {
      navigate('/dashboard/schedule-management/create', { 
        state: { 
          date: selectedDate, 
          method: 'new' 
        } 
      });
    } else {
      setCreationMethod(method);
      setStep(2);
    }
  };

  const handleSourceSelect = (sourceData) => {
    navigate('/dashboard/schedule-management/create', {
      state: {
        date: selectedDate,     
        method: creationMethod,
        sourceData: sourceData
      }
    });
  };

  const handleClose = () => {
    setStep(1); 
    onClose();
  };

  if (!show) return null;

  const renderStepOne = () => (
    <>
      <div className="modal-header">
        <h5 className="modal-title">Create Schedule - Step 1 of 2</h5>
        <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
      </div>
      <div className="modal-body">
        <div className="mb-3">
          <label htmlFor="scheduleDate" className="form-label fw-bold">Select Date for New Schedule</label>
          <input type="date" className="form-control" id="scheduleDate" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <hr />
        <p className="mb-2 fw-bold">Choose Creation Method</p>
        <div className="d-grid gap-2">
          <button className="btn btn-outline-success text-start" onClick={() => handleMethodSelect('new')}>
            <i className="bi bi-plus-square-dotted me-2"></i>Create from Scratch
          </button>
          <button className="btn btn-outline-primary text-start" onClick={() => handleMethodSelect('template')} disabled={!templates || templates.length === 0}>
            <i className="bi bi-file-text-fill me-2"></i>Use a Template
          </button>
          <button className="btn btn-outline-secondary text-start" onClick={() => handleMethodSelect('copy')} disabled={!sortedScheduleDates || sortedScheduleDates.length === 0}>
            <i className="bi bi-files me-2"></i>Copy an Existing Schedule
          </button>
        </div>
      </div>
    </>
  );

  const renderStepTwo = () => (
    <>
      <div className="modal-header">
        <h5 className="modal-title">
          <button className="btn btn-sm btn-light me-2" onClick={() => setStep(1)}><i className="bi bi-arrow-left"></i></button>
          Select a Source {creationMethod === 'copy' ? 'Schedule' : 'Template'}
        </h5>
        <button type="button" className="btn-close" onClick={handleClose} aria-label="Close"></button>
      </div>
      <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {creationMethod === 'template' && (
          <div className="list-group">
            {templates.map(tpl => (
              <a href="#" key={tpl.id} className="list-group-item list-group-item-action" onClick={(e) => { e.preventDefault(); handleSourceSelect(tpl); }}>
                {tpl.name}
              </a>
            ))}
          </div>
        )}
        {creationMethod === 'copy' && (
          <div className="list-group">
            {sortedScheduleDates.map(date => (
              <a href="#" key={date} className="list-group-item list-group-item-action" onClick={(e) => { e.preventDefault(); handleSourceSelect(schedulesByDate[date]); }}>
                Schedule for {schedulesByDate[date][0]?.name || date} ({schedulesByDate[date].length} employees)
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          {step === 1 ? renderStepOne() : renderStepTwo()}
        </div>
      </div>
    </div>
  );
};
export default CreateScheduleStartModal;