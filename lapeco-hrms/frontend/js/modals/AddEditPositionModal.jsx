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
    allowed_modules: [],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details');

  const isEditMode = Boolean(positionData && positionData.id);

  const moduleAliases = {
    employee: 'employee_data',
    leave: 'leave_management',
    schedule: 'schedules',
    attendance: 'attendance_management',
    positions: 'department_management',
    departments: 'department_management',
    payroll: 'payroll_management',
    training: 'training_and_development',
    disciplinary: 'case_management',
    resignation: 'resignation_management',
    performance: 'performance_management',
  };

  const normalizeModules = (mods = []) => {
    if (!Array.isArray(mods)) return [];
    const set = new Set(
      mods.map((m) => moduleAliases[m] || m)
    );
    return Array.from(set);
  };

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
          allowed_modules: normalizeModules(positionData.allowed_modules ?? []),
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

  const moduleOptions = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'leaderboards', label: 'Leaderboards' },
    { key: 'employee_data', label: 'Employee Data' },
    { key: 'department_management', label: 'Department Management' },
    { key: 'attendance_management', label: 'Attendance Management' },
    { key: 'schedules', label: 'Schedules' },
    { key: 'leave_management', label: 'Leave Management' },
    { key: 'payroll_management', label: 'Payroll Management' },
    { key: 'holidays', label: 'Holidays' },
    { key: 'contributions', label: 'Contributions' },
    { key: 'performance_management', label: 'Performance Management' },
    { key: 'training_and_development', label: 'Training and Development' },
    { key: 'case_management', label: 'Case Management' },
    { key: 'predictive_analytics', label: 'Predictive Analytics' },
    { key: 'resignation_management', label: 'Resignation Management' },
    { key: 'recruitment', label: 'Recruitment' },
    { key: 'accounts_management', label: 'Accounts Management' },
    { key: 'reports', label: 'Reports' },
    { key: 'my_team', label: 'My Team' },
    { key: 'submit_evaluation', label: 'Submit Evaluation' },
    { key: 'my_leave', label: 'My Leave' },
    { key: 'my_cases', label: 'My Cases' },
    { key: 'submit_incident_report', label: 'Submit Incident Report' },
    { key: 'my_attendance', label: 'My Attendance' },
    { key: 'my_resignation', label: 'My Resignation' },
    { key: 'my_payroll', label: 'My Payroll' },
    { key: 'account_settings', label: 'Account Settings' },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('module_')) {
      const key = name.replace('module_', '');
      setFormData(prev => {
        const set = new Set(prev.allowed_modules || []);
        if (checked) set.add(key); else set.delete(key);
        return { ...prev, allowed_modules: Array.from(set) };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Department name is required.';
    if (!formData.description.trim()) newErrors.description = 'Description is required.';
    if (!formData.base_rate_per_hour || isNaN(formData.base_rate_per_hour) || Number(formData.base_rate_per_hour) <= 0) {
      newErrors.base_rate_per_hour = 'Base rate must be a valid positive number.';
    }
    if (!Array.isArray(formData.allowed_modules)) newErrors.allowed_modules = 'Please select modules.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        allowed_modules: normalizeModules(formData.allowed_modules || []),
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
                <li className="nav-item">
                  <button type="button" className={`nav-link ${activeTab === 'access' ? 'active' : ''}`} onClick={() => setActiveTab('access')}>Access</button>
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
                  <div className="pay-structure-container">
                    {/* Base Compensation Card */}
                    <div className="pay-section-card mb-4">
                      <div className="pay-section-header">
                        <div className="d-flex align-items-center">
                          <div className="icon-wrapper icon-wrapper-primary me-3">
                            <i className="bi bi-cash-coin"></i>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold">Base Compensation</h6>
                            <small className="text-muted">Hourly rate for this position</small>
                          </div>
                        </div>
                      </div>
                      <div className="pay-section-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="base_rate_per_hour" className="form-label fw-semibold">
                              Base Rate (per hour)*
                            </label>
                            <div className="input-group">
                              <span className="input-group-text">
                                <i className="bi bi-currency-peso"></i>
                              </span>
                              <input 
                                type="number" 
                                step="0.01" 
                                className={`form-control ${errors.base_rate_per_hour ? 'is-invalid' : ''}`} 
                                id="base_rate_per_hour" 
                                name="base_rate_per_hour" 
                                value={formData.base_rate_per_hour} 
                                onChange={handleChange} 
                                required 
                                placeholder="Enter hourly rate" 
                              />
                            </div>
                            {errors.base_rate_per_hour && <div className="invalid-feedback d-block">{errors.base_rate_per_hour}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold">Monthly Salary</label>
                            <div className="salary-display-card">
                              <div className="salary-amount">₱ {monthlySalary.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                              <div className="salary-formula">
                                <i className="bi bi-calculator me-1"></i>
                                Rate × 8 hrs × 22 days
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overtime Rates Card */}
                    <div className="pay-section-card mb-4">
                      <div className="pay-section-header">
                        <div className="d-flex align-items-center">
                          <div className="icon-wrapper icon-wrapper-success me-3">
                            <i className="bi bi-clock-history"></i>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold">Overtime Rates</h6>
                            <small className="text-muted">Auto-calculated per Labor Law</small>
                          </div>
                        </div>
                      </div>
                      <div className="pay-section-body">
                        <div className="row g-3">
                          <div className="col-md-4">
                            <div className="rate-card rate-card-regular">
                              <div className="rate-card-header">
                                <i className="bi bi-calendar-check me-2"></i>
                                <span className="rate-card-title">Regular Day OT</span>
                              </div>
                              <div className="rate-card-value">₱ {calculatedRates.regularDayOT.toFixed(2)}</div>
                              <div className="rate-card-formula">Base × 1.25</div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="rate-card rate-card-special">
                              <div className="rate-card-header">
                                <i className="bi bi-star me-2"></i>
                                <span className="rate-card-title">Special OT</span>
                              </div>
                              <div className="rate-card-value">₱ {calculatedRates.specialOT.toFixed(2)}</div>
                              <div className="rate-card-formula">Base × 1.30</div>
                              <div className="rate-card-note">Rest days & special</div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="rate-card rate-card-holiday">
                              <div className="rate-card-header">
                                <i className="bi bi-calendar-event me-2"></i>
                                <span className="rate-card-title">Regular Holiday OT</span>
                              </div>
                              <div className="rate-card-value">₱ {calculatedRates.regularHolidayOT.toFixed(2)}</div>
                              <div className="rate-card-formula">Base × 2.00</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Rates Card */}
                    <div className="pay-section-card">
                      <div className="pay-section-header">
                        <div className="d-flex align-items-center">
                          <div className="icon-wrapper icon-wrapper-info me-3">
                            <i className="bi bi-plus-circle"></i>
                          </div>
                          <div>
                            <h6 className="mb-0 fw-bold">Additional Rates</h6>
                            <small className="text-muted">Night differential & deductions</small>
                          </div>
                        </div>
                      </div>
                      <div className="pay-section-body">
                        <div className="row g-3">
                          <div className="col-md-6">
                            <div className="rate-card rate-card-night">
                              <div className="rate-card-header">
                                <i className="bi bi-moon-stars me-2"></i>
                                <span className="rate-card-title">Night Differential</span>
                              </div>
                              <div className="rate-card-subtitle">10:00 PM - 6:00 AM</div>
                              <div className="rate-card-value">₱ {calculatedRates.nightDiff.toFixed(2)}</div>
                              <div className="rate-card-formula">Base × 0.10 (10%)</div>
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="editable-rate-card">
                              <label htmlFor="late_deduction_per_minute" className="form-label fw-semibold mb-2">
                                <i className="bi bi-exclamation-triangle me-2 text-warning"></i>
                                Late Deduction/min
                              </label>
                              <div className="input-group">
                                <span className="input-group-text">
                                  <i className="bi bi-currency-peso"></i>
                                </span>
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
                              <small className="text-muted d-block mt-2">
                                <i className="bi bi-info-circle me-1"></i>
                                Deducted per minute late
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'access' && (
                  <div className="mb-3">
                    <label className="form-label">Granted System Modules</label>
                    <div className="row">
                      {moduleOptions.map(opt => (
                        <div key={opt.key} className="col-md-6 mb-2">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`module_${opt.key}`}
                              name={`module_${opt.key}`}
                              checked={formData.allowed_modules.includes(opt.key)}
                              onChange={handleChange}
                            />
                            <label className="form-check-label" htmlFor={`module_${opt.key}`}>{opt.label}</label>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.allowed_modules && <div className="invalid-feedback d-block">{errors.allowed_modules}</div>}
                  </div>
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