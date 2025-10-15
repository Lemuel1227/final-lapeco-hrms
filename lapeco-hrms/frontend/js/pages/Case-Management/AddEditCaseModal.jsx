import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';

const AddEditCaseModal = ({ show, onClose, onSave, caseData, employees }) => {
  const initialFormState = {
    employeeId: '',
    issueDate: new Date().toISOString().split('T')[0],
    actionType: 'Verbal Warning',
    reason: '',
    description: '',
    nextSteps: '',
    status: 'Ongoing',
  };

  const [formData, setFormData] = useState(initialFormState);
  const isEditMode = Boolean(caseData);

  const employeeOptions = useMemo(() => 
    employees.map(emp => ({ value: emp.id, label: `${emp.name} (${emp.id})` })),
  [employees]);

  useEffect(() => {
    if (show) {
      setFormData(isEditMode ? { ...initialFormState, ...caseData } : initialFormState);
    }
  }, [show, caseData, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (selectedOption) => {
    setFormData(prev => ({ ...prev, employeeId: selectedOption ? selectedOption.value : '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.reason) {
      alert('Employee and Reason are required fields.');
      return;
    }
    onSave(formData, caseData?.caseId);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block case-modal" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{isEditMode ? 'Edit Disciplinary Case' : 'Log New Disciplinary Case'}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-7">
                  <label htmlFor="employeeId" className="form-label">Employee*</label>
                  <Select
                    id="employeeId"
                    options={employeeOptions}
                    value={employeeOptions.find(opt => opt.value === formData.employeeId)}
                    onChange={handleSelectChange}
                    classNamePrefix="react-select"
                    className="react-select-container"
                    placeholder="Select an employee..."
                  />
                </div>
                <div className="col-md-5">
                  <label htmlFor="issueDate" className="form-label">Date of Incident*</label>
                  <input type="date" id="issueDate" name="issueDate" className="form-control" value={formData.issueDate} onChange={handleChange} required />
                </div>
                <div className="col-md-7">
                  <label htmlFor="actionType" className="form-label">Action Type*</label>
                  <select id="actionType" name="actionType" className="form-select" value={formData.actionType} onChange={handleChange}>
                    <option>Verbal Warning</option>
                    <option>Written Warning</option>
                    <option>Suspension</option>
                    <option>Performance Improvement Plan (PIP)</option>
                    <option>Termination</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="col-md-5">
                    <label htmlFor="status" className="form-label">Case Status*</label>
                    <select id="status" name="status" className="form-select" value={formData.status} onChange={handleChange}>
                        <option>Ongoing</option>
                        <option>Closed</option>
                    </select>
                </div>
                <div className="col-12">
                  <label htmlFor="reason" className="form-label">Reason / Infraction*</label>
                  <input type="text" id="reason" name="reason" className="form-control" value={formData.reason} onChange={handleChange} placeholder="e.g., Tardiness, Safety Violation, Insubordination" required />
                </div>
                <div className="col-12">
                  <label htmlFor="description" className="form-label">Description of Incident</label>
                  <textarea id="description" name="description" className="form-control" rows="4" value={formData.description} onChange={handleChange} placeholder="Provide specific details about the incident..."></textarea>
                </div>
                <div className="col-12">
                  <label htmlFor="nextSteps" className="form-label">Resolution / Next Steps</label>
                  <textarea id="nextSteps" name="nextSteps" className="form-control" rows="2" value={formData.nextSteps} onChange={handleChange} placeholder="e.g., Monitor attendance for 30 days, Additional training required..."></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">{isEditMode ? 'Save Changes' : 'Create Case'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditCaseModal;