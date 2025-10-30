import React, { useState, useEffect, useMemo } from 'react';
import './AddEditPositionModal.css';

const AddEditPositionModal = ({ show, onClose, onSave, positionData }) => {
  const initialFormState = { 
    title: '', 
    description: '', 
    base_rate_per_hour: '', 
    regular_day_ot_rate: '',
    special_ot_rate: '',
    regular_holiday_ot_rate: '',
    night_diff_rate_per_hour: '',
    late_deduction_per_minute: '',
    monthly_salary: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details');

  const isEditMode = Boolean(positionData && positionData.id);

  useEffect(() => {
    if (show) {
      if (isEditMode && positionData) {
        setFormData({
          title: positionData.title || positionData.name || '',
          description: positionData.description || '',
          base_rate_per_hour: positionData.base_rate_per_hour ?? positionData.hourlyRate ?? '',
          regular_day_ot_rate: positionData.regular_day_ot_rate ?? '',
          special_ot_rate: positionData.special_ot_rate ?? '',
          regular_holiday_ot_rate: positionData.regular_holiday_ot_rate ?? '',
          night_diff_rate_per_hour: positionData.night_diff_rate_per_hour ?? positionData.nightDiffRate ?? '',
          late_deduction_per_minute: positionData.late_deduction_per_minute ?? positionData.lateDeductionPerMin ?? '',
          monthly_salary: positionData.monthly_salary ?? positionData.monthlySalary ?? '',
        });

      } else {
        setFormData(initialFormState);
      }
      setActiveTab('details');
      setErrors({});
    }
  }, [positionData, show, isEditMode]); 
  
  const monthlySalary = useMemo(() => {
    const rate = parseFloat(formData.base_rate_per_hour);
    if (isNaN(rate) || rate <= 0) return 0;
    // Standard calculation: hourly rate * 8 hours/day * 22 days/month
    return rate * 8 * 22;
  }, [formData.base_rate_per_hour]);

  // Auto-calculate overtime rates based on Philippine labor law
  const calculatedRates = useMemo(() => {
    const baseRate = parseFloat(formData.base_rate_per_hour);
    if (isNaN(baseRate) || baseRate <= 0) {
      return {
        regularDayOT: 0,
        specialOT: 0,
        regularHolidayOT: 0,
        nightDiff: 0,
      };
    }

    // Calculate hourly rate from daily rate (daily rate = hourly rate * 8)
    const hourlyRate = baseRate;
    
    return {
      regularDayOT: hourlyRate * 1.25,      // 125% for regular day OT
      specialOT: hourlyRate * 1.30,          // 130% for rest days/special holidays
      regularHolidayOT: hourlyRate * 2.00,   // 200% for regular holidays
      nightDiff: hourlyRate * 0.10,          // 10% night differential
    };
  }, [formData.base_rate_per_hour]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Position title is required.';
    if (!formData.description.trim()) newErrors.description = 'Description is required.';
    if (!formData.base_rate_per_hour || isNaN(formData.base_rate_per_hour) || Number(formData.base_rate_per_hour) <= 0) {
      newErrors.base_rate_per_hour = 'Base rate must be a valid positive number.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        base_rate_per_hour: Number(formData.base_rate_per_hour || 0),
        regular_day_ot_rate: calculatedRates.regularDayOT,
        special_ot_rate: calculatedRates.specialOT,
        regular_holiday_ot_rate: calculatedRates.regularHolidayOT,
        night_diff_rate_per_hour: calculatedRates.nightDiff,
        late_deduction_per_minute: Number(formData.late_deduction_per_minute || 0),
        monthly_salary: monthlySalary,
      }, positionData?.id);
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content position-form-modal">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">{isEditMode ? 'Edit Position' : 'Add New Position'}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                  <button type="button" className={`nav-link ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Details</button>
                </li>
                <li className="nav-item">
                  <button type="button" className={`nav-link ${activeTab === 'pay' ? 'active' : ''}`} onClick={() => setActiveTab('pay')}>Pay Structure</button>
                </li>
              </ul>

              <div className="tab-content">
                {activeTab === 'details' && (
                  <>
                    <div className="mb-3">
                      <label htmlFor="title" className="form-label">Position Title*</label>
                      <input type="text" className={`form-control ${errors.title ? 'is-invalid' : ''}`} id="title" name="title" value={formData.title} onChange={handleChange} required />
                      {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="description" className="form-label">Description*</label>
                      <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} id="description" name="description" rows="4" value={formData.description} onChange={handleChange} required></textarea>
                      {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                    </div>
                  </>
                )}

                {activeTab === 'pay' && (
                  <>
                    {/* Base Rate Section */}
                    <div className="mb-4">
                      <h6 className="text-muted mb-3">
                        <i className="bi bi-cash-coin me-2"></i>Base Compensation
                      </h6>
                      <div className="mb-3">
                        <label htmlFor="base_rate_per_hour" className="form-label fw-semibold">Base Rate (per hour)*</label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-light">₱</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            className={`form-control ${errors.base_rate_per_hour ? 'is-invalid' : ''}`} 
                            id="base_rate_per_hour" 
                            name="base_rate_per_hour" 
                            value={formData.base_rate_per_hour} 
                            onChange={handleChange} 
                            required 
                            placeholder="e.g., 102.27" 
                          />
                        </div>
                        {errors.base_rate_per_hour && <div className="invalid-feedback d-block">{errors.base_rate_per_hour}</div>}
                      </div>
                      <div className="alert alert-info mb-0">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-calculator me-2"></i>
                          <div>
                            <div className="fw-semibold">Calculated Monthly Salary: ₱ {monthlySalary.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            <small className="text-muted">Based on (Rate × 8 hours × 22 days)</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="my-4"/>

                    {/* Overtime Rates Section */}
                    <div className="mb-4">
                      <div className="d-flex align-items-center mb-3">
                        <i className="bi bi-clock-history me-2 text-success"></i>
                        <h6 className="text-muted mb-0">Overtime Rates</h6>
                      </div>
                      <div className="alert alert-success mb-3">
                        <div className="d-flex align-items-start">
                          <i className="bi bi-info-circle me-2 mt-1"></i>
                          <div>
                            <strong>Auto-Calculated (Philippine Labor Law)</strong>
                            <div className="small text-muted mt-1">Rates are automatically calculated from the base hourly rate</div>
                          </div>
                        </div>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <div className="card border-0 bg-light h-100">
                            <div className="card-body">
                              <label className="form-label small text-muted mb-2">Regular Day OT</label>
                              <div className="input-group">
                                <span className="input-group-text bg-white">₱</span>
                                <input type="text" className="form-control bg-white" value={calculatedRates.regularDayOT.toFixed(2)} readOnly />
                              </div>
                              <small className="text-success fw-semibold mt-1 d-block">Base × 1.25</small>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card border-0 bg-light h-100">
                            <div className="card-body">
                              <label className="form-label small text-muted mb-2">Special OT</label>
                              <div className="input-group">
                                <span className="input-group-text bg-white">₱</span>
                                <input type="text" className="form-control bg-white" value={calculatedRates.specialOT.toFixed(2)} readOnly />
                              </div>
                              <small className="text-success fw-semibold mt-1 d-block">Base × 1.30</small>
                              <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>Rest days & special holidays</small>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="card border-0 bg-light h-100">
                            <div className="card-body">
                              <label className="form-label small text-muted mb-2">Regular Holiday OT</label>
                              <div className="input-group">
                                <span className="input-group-text bg-white">₱</span>
                                <input type="text" className="form-control bg-white" value={calculatedRates.regularHolidayOT.toFixed(2)} readOnly />
                              </div>
                              <small className="text-success fw-semibold mt-1 d-block">Base × 2.00</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="my-4"/>

                    {/* Additional Rates Section */}
                    <div>
                      <div className="d-flex align-items-center mb-3">
                        <i className="bi bi-moon-stars me-2 text-primary"></i>
                        <h6 className="text-muted mb-0">Additional Rates & Deductions</h6>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <div className="card border-0 bg-light">
                            <div className="card-body">
                              <label className="form-label small text-muted mb-2">Night Differential (10 PM - 6 AM)</label>
                              <div className="input-group">
                                <span className="input-group-text bg-white">₱</span>
                                <input type="text" className="form-control bg-white" value={calculatedRates.nightDiff.toFixed(2)} readOnly />
                              </div>
                              <small className="text-primary fw-semibold mt-1 d-block">Base × 0.10 (10%)</small>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="late_deduction_per_minute" className="form-label small text-muted">Late Deduction (per minute)</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light">₱</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              className="form-control" 
                              id="late_deduction_per_minute" 
                              name="late_deduction_per_minute" 
                              value={formData.late_deduction_per_minute} 
                              onChange={handleChange}
                              placeholder="0.00"
                            />
                          </div>
                          <small className="text-muted d-block mt-1">Amount deducted per minute of tardiness</small>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">{isEditMode ? 'Save Changes' : 'Add Position'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditPositionModal;