import React, { useState, useEffect, useMemo } from 'react';
import { differenceInDays } from 'date-fns';

const MATERNITY_NORMAL_DAYS = 105;
const MATERNITY_SOLO_PARENT_BONUS = 15;
const MATERNITY_MISCARRIAGE_DAYS = 60;
const MIN_POSTNATAL_DAYS = 60;
const PATERNITY_DAYS = 7;

const RequestLeaveModal = ({ show, onClose, onSave, currentUser, editingRequest }) => {
  const initialFormState = {
    leaveType: 'Vacation',
    dateFrom: '',
    dateTo: '',
    reason: '',
    days: 0,
    maternityType: 'prenatal',
    isSoloParent: false,
    deliveryDate: '',
    willAllocate: false,
    allocationDays: 0,
    medicalDocument: null,
    soloParentDocument: null,
    childsDob: '',
    isEligiblePaternity: false,
    marriageCert: null,
    birthCert: null,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editingRequest;

  useEffect(() => {
    if (show) {
      if (isEditing && editingRequest) {
        setFormData({
          ...initialFormState,
          leaveType: editingRequest.leaveType || 'Vacation',
          dateFrom: editingRequest.dateFrom || '',
          dateTo: editingRequest.dateTo || '',
          reason: editingRequest.reason || '',
          days: editingRequest.days || 0,
          // Maternity Details
          maternityType: editingRequest.maternityDetails?.type || 'prenatal',
          isSoloParent: editingRequest.maternityDetails?.isSoloParent || false,
          deliveryDate: editingRequest.maternityDetails?.deliveryDate || editingRequest.maternityDetails?.expectedDeliveryDate || '',
          willAllocate: (editingRequest.maternityDetails?.allocationDays || 0) > 0,
          allocationDays: editingRequest.maternityDetails?.allocationDays || 0,
          // Paternity Details
          childsDob: editingRequest.paternityDetails?.childsDob || '',
          isEligiblePaternity: editingRequest.paternityDetails?.isEligiblePaternity || false,
        });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [show, editingRequest]);

  const isMaternity = formData.leaveType === 'Maternity Leave';
  const isPaternity = formData.leaveType === 'Paternity Leave';
  const userGender = currentUser?.gender;
  const canClaimSoloParent = !!formData.soloParentDocument || !!editingRequest?.maternityDetails?.soloParentDocumentName;

  const originalMaternityDays = useMemo(() => {
    if (!isMaternity) return 0;
    if (formData.maternityType === 'miscarriage') return MATERNITY_MISCARRIAGE_DAYS;
    let days = MATERNITY_NORMAL_DAYS;
    if (formData.isSoloParent && canClaimSoloParent) {
      days += MATERNITY_SOLO_PARENT_BONUS;
    }
    return days;
  }, [isMaternity, formData.maternityType, formData.isSoloParent, canClaimSoloParent]);

  useEffect(() => {
    if (isMaternity && formData.dateFrom) {
        const startDate = new Date(formData.dateFrom + 'T00:00:00');
        if (isNaN(startDate)) return;
        let daysToAdd = 0;
        if (formData.maternityType === 'prenatal' || formData.maternityType === 'normal') {
            daysToAdd = MATERNITY_NORMAL_DAYS;
            if (formData.isSoloParent && canClaimSoloParent) daysToAdd += MATERNITY_SOLO_PARENT_BONUS;
            if (formData.willAllocate && formData.allocationDays > 0) daysToAdd -= formData.allocationDays;
        } else if (formData.maternityType === 'miscarriage') {
            daysToAdd = MATERNITY_MISCARRIAGE_DAYS;
        }
        let newDateTo = '';
        if (daysToAdd > 0) {
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + daysToAdd - 1);
            newDateTo = endDate.toISOString().split('T')[0];
        }
        setFormData(prev => ({ ...prev, dateTo: newDateTo, days: daysToAdd }));
    } else if (isPaternity && formData.dateFrom) {
        const startDate = new Date(formData.dateFrom + 'T00:00:00');
        if (isNaN(startDate)) return;
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + PATERNITY_DAYS - 1);
        setFormData(prev => ({ ...prev, days: PATERNITY_DAYS, dateTo: endDate.toISOString().split('T')[0] }));
    } else if (!isMaternity && !isPaternity && formData.dateFrom && formData.dateTo) {
        const start = new Date(formData.dateFrom);
        const end = new Date(formData.dateTo);
        if (end >= start) {
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setFormData(prev => ({ ...prev, days: diffDays }));
        } else {
            setFormData(prev => ({ ...prev, days: 0 }));
        }
    }
  }, [formData.dateFrom, formData.dateTo, formData.leaveType, formData.maternityType, formData.isSoloParent, isMaternity, isPaternity, canClaimSoloParent, formData.willAllocate, formData.allocationDays]);
  
  const validate = () => {
    const newErrors = {};
    if (!formData.leaveType) newErrors.leaveType = 'Please select a leave type.';
    if (!formData.dateFrom) newErrors.dateFrom = 'Start date is required.';
    if (!formData.dateTo) newErrors.dateTo = 'End date is required.';
    if (!isMaternity && !isPaternity && formData.dateTo < formData.dateFrom) newErrors.dateTo = 'End date cannot be before start date.';
    if (!formData.reason.trim()) newErrors.reason = 'A reason for the leave is required.';
    if (isMaternity) {
      if (!formData.deliveryDate) newErrors.deliveryDate = `An ${formData.maternityType === 'prenatal' ? 'expected' : 'actual'} date is required.`;
      else if (formData.dateFrom && formData.maternityType === 'prenatal') {
        const startDate = new Date(formData.dateFrom);
        const deliveryDate = new Date(formData.deliveryDate);
        const totalLeaveDays = formData.days;
        const maxPrenatalDays = totalLeaveDays - MIN_POSTNATAL_DAYS;
        if (startDate < deliveryDate) {
            const prenatalDaysTaken = differenceInDays(deliveryDate, startDate);
            if (prenatalDaysTaken > maxPrenatalDays) newErrors.dateFrom = `Leave must start no more than ${maxPrenatalDays} days before the expected delivery to ensure at least ${MIN_POSTNATAL_DAYS} postnatal days.`;
        }
      }
      if (formData.willAllocate && (formData.allocationDays <= 0 || formData.allocationDays > 7)) newErrors.allocationDays = 'Must be between 1 and 7 days.';
    }

    if (isPaternity) {
      if (!formData.childsDob) newErrors.childsDob = "Child's date of birth or miscarriage is required.";
      else if (formData.dateFrom) {
        const startDate = new Date(formData.dateFrom);
        const dob = new Date(formData.childsDob);
        const sixtyDaysAfterDob = new Date(dob);
        sixtyDaysAfterDob.setDate(dob.getDate() + 60);
        if (startDate > sixtyDaysAfterDob) newErrors.dateFrom = "Paternity leave must be availed within 60 days of childbirth/miscarriage.";
      }
      if (!formData.isEligiblePaternity) newErrors.isEligiblePaternity = "You must confirm eligibility to proceed.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission
    
    if (validate()) {
      setIsSubmitting(true);
      try {
        let payload = { leaveType: formData.leaveType, dateFrom: formData.dateFrom, dateTo: formData.dateTo, reason: formData.reason, days: formData.days };
        if (isMaternity) { 
          payload.maternityDetails = { 
            type: formData.maternityType, 
            isSoloParent: formData.isSoloParent && canClaimSoloParent, 
            deliveryDate: formData.deliveryDate, 
            allocationDays: formData.willAllocate ? formData.allocationDays : 0, 
            medicalDocumentName: formData.medicalDocument?.name || editingRequest?.maternityDetails?.medicalDocumentName || null, 
            soloParentDocumentName: formData.soloParentDocument?.name || editingRequest?.maternityDetails?.soloParentDocumentName || null 
          };
        }
        if (isPaternity) {
          payload.paternityDetails = {
              childsDob: formData.childsDob,
              isEligiblePaternity: formData.isEligiblePaternity,
              marriageCertName: formData.marriageCert?.name || editingRequest?.paternityDetails?.marriageCertName || null,
              birthCertName: formData.birthCert?.name || editingRequest?.paternityDetails?.birthCertName || null,
          };
        }
        if (isEditing) payload.leaveId = editingRequest.leaveId;
        await onSave(payload, isEditing);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => { setFormData(initialFormState); setErrors({}); onClose(); };
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    const file = files[0];
    setFormData(prev => ({ ...prev, [name]: file || null, isSoloParent: name === 'soloParentDocument' && !file ? false : prev.isSoloParent }));
  };
  const handleLeaveTypeChange = (e) => {
    const newLeaveType = e.target.value;
    setFormData(prev => ({ ...initialFormState, leaveType: newLeaveType, reason: prev.reason, dateFrom: prev.dateFrom }));
    setErrors({});
  };

  const deliveryDateLabel = formData.maternityType === 'prenatal' ? 'Expected Date of Delivery*' : 'Actual Date of Delivery/Event*';

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header"><h5 className="modal-title">{isEditing ? 'Edit Leave Request' : 'New Leave Request'}</h5><button type="button" className="btn-close" onClick={handleClose}></button></div>
            <div className="modal-body">
              <div className="mb-3">
                <label htmlFor="leaveType" className="form-label">Leave Type*</label>
                <select id="leaveType" name="leaveType" className={`form-select ${errors.leaveType ? 'is-invalid' : ''}`} value={formData.leaveType} onChange={handleLeaveTypeChange}>
                  <option value="">Select Leave Type</option>
                  <option value="Vacation Leave">Vacation Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                  {userGender?.toLowerCase() === 'female' && (<option value="Maternity Leave">Maternity Leave</option>)}
                  {userGender?.toLowerCase() === 'male' && (<option value="Paternity Leave">Paternity Leave</option>)}
                </select>
                {errors.leaveType && <div className="invalid-feedback">{errors.leaveType}</div>}
              </div>
              
              {isMaternity && (
                <fieldset className="maternity-fieldset">
                  <legend className="maternity-legend">Maternity Leave Details</legend>
                  <div className="alert alert-info py-2 maternity-eligibility-notice"><i className="bi bi-info-circle-fill me-2"></i><strong>Eligibility Reminder:</strong> You must have at least 3 monthly SSS contributions within the last 12 months to qualify.</div>
                  <div className="mb-3">
                    <label className="form-label">Type of Application</label>
                    <div>
                      <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="maternityType" id="maternityPrenatal" value="prenatal" checked={formData.maternityType === 'prenatal'} onChange={(e) => setFormData({...formData, maternityType: e.target.value})} /><label className="form-check-label" htmlFor="maternityPrenatal">Prenatal / Before Delivery</label></div>
                      <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="maternityType" id="maternityNormal" value="normal" checked={formData.maternityType === 'normal'} onChange={(e) => setFormData({...formData, maternityType: e.target.value})} /><label className="form-check-label" htmlFor="maternityNormal">Normal Delivery / C-Section</label></div>
                      <div className="form-check form-check-inline"><input className="form-check-input" type="radio" name="maternityType" id="maternityMiscarriage" value="miscarriage" checked={formData.maternityType === 'miscarriage'} onChange={(e) => setFormData({...formData, maternityType: e.target.value})} /><label className="form-check-label" htmlFor="maternityMiscarriage">Miscarriage / Emergency</label></div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="deliveryDate" className="form-label">{deliveryDateLabel}</label>
                    <input type="date" className={`form-control ${errors.deliveryDate ? 'is-invalid' : ''}`} id="deliveryDate" value={formData.deliveryDate} onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})} />
                    {errors.deliveryDate && <div className="invalid-feedback">{errors.deliveryDate}</div>}
                  </div>
                </fieldset>
              )}

              {isPaternity && (
                <>
                  <fieldset className="paternity-fieldset">
                    <legend className="paternity-legend">Paternity Leave Details</legend>
                    <div className="alert alert-info py-2 maternity-eligibility-notice"><i className="bi bi-info-circle-fill me-2"></i><strong>Note:</strong> Paternity leave is only applicable for the first four (4) childbirths/miscarriages of your legitimate spouse.</div>
                    <div className="mb-3">
                      <label htmlFor="childsDob" className="form-label">Child's Date of Birth / Miscarriage*</label>
                      <input type="date" id="childsDob" name="childsDob" className={`form-control ${errors.childsDob ? 'is-invalid' : ''}`} value={formData.childsDob} onChange={(e) => setFormData({...formData, childsDob: e.target.value})} />
                      {errors.childsDob && <div className="invalid-feedback">{errors.childsDob}</div>}
                    </div>
                    <div className={`form-check ${errors.isEligiblePaternity ? 'is-invalid' : ''}`}>
                      <input className="form-check-input" type="checkbox" id="isEligiblePaternity" name="isEligiblePaternity" checked={formData.isEligiblePaternity} onChange={(e) => setFormData({...formData, isEligiblePaternity: e.target.checked})}/>
                      <label className="form-check-label" htmlFor="isEligiblePaternity">I hereby confirm that I am legitimately married to and cohabiting with my spouse at the time of childbirth/miscarriage.</label>
                    </div>
                    {errors.isEligiblePaternity && <div className="invalid-feedback d-block">{errors.isEligiblePaternity}</div>}
                  </fieldset>
                  <fieldset className="paternity-fieldset">
                    <legend className="paternity-legend">Attachments</legend>
                    <div className="mb-3">
                      <label htmlFor="marriageCert" className="form-label">Marriage Certificate</label>
                      <input type="file" className="form-control" name="marriageCert" id="marriageCert" onChange={handleFileChange} />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="birthCert" className="form-label">Child's Birth / Medical Certificate</label>
                      <input type="file" className="form-control" name="birthCert" id="birthCert" onChange={handleFileChange} />
                    </div>
                  </fieldset>
                </>
              )}

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="dateFrom" className="form-label">From*</label>
                  <input type="date" id="dateFrom" name="dateFrom" className={`form-control ${errors.dateFrom ? 'is-invalid' : ''}`} value={formData.dateFrom} onChange={(e) => setFormData({...formData, dateFrom: e.target.value})} />
                  {isMaternity && <div className="form-text">Per law, at least 60 days of your leave must be after your delivery date.</div>}
                  {isPaternity && <div className="form-text">Must be availed within 60 days from the date of delivery/miscarriage.</div>}
                  {errors.dateFrom && <div className="invalid-feedback">{errors.dateFrom}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="dateTo" className="form-label">To*</label>
                  <input type="date" id="dateTo" name="dateTo" className={`form-control ${errors.dateTo ? 'is-invalid' : ''}`} value={formData.dateTo} onChange={(e) => setFormData({...formData, dateTo: e.target.value})} readOnly={isMaternity || isPaternity} />
                  {errors.dateTo && <div className="invalid-feedback">{errors.dateTo}</div>}
                </div>
              </div>
              <div className="mb-3">
                <p className="text-muted">Total Days: <strong className="text-dark">{formData.days}</strong></p>
                {isMaternity && formData.willAllocate && formData.allocationDays > 0 && (<p className="text-info small" style={{marginTop: '-10px'}}>(Original: {originalMaternityDays} days - {formData.allocationDays} allocated = {formData.days} remaining days for you)</p>)}
              </div>
              
              {isMaternity && (
                 <fieldset className="maternity-fieldset">
                    <legend className="maternity-legend">Attachments & Allocation</legend>
                    <div className="mb-3">
                      <label htmlFor="medicalDocument" className="form-label">Medical Certificate</label>
                      <input type="file" className="form-control" name="medicalDocument" id="medicalDocument" onChange={handleFileChange} />
                    </div>
                     {(formData.maternityType === 'prenatal' || formData.maternityType === 'normal') && (
                        <>
                          <div className="mb-3">
                            <label htmlFor="soloParentDocument" className="form-label">Solo Parent ID</label>
                            <input type="file" className="form-control" name="soloParentDocument" id="soloParentDocument" onChange={handleFileChange} />
                            <div className="form-text">Upload your Solo Parent ID to claim the additional 15-day benefit.</div>
                          </div>
                          <div className="form-check mb-3">
                            <input className="form-check-input" type="checkbox" id="isSoloParent" checked={formData.isSoloParent} onChange={(e) => setFormData({...formData, isSoloParent: e.target.checked})} disabled={!canClaimSoloParent}/>
                            <label className="form-check-label" htmlFor="isSoloParent">I am a qualified Solo Parent (adds 15 days)</label>
                          </div>
                          <hr/>
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="willAllocate" checked={formData.willAllocate} onChange={(e) => setFormData({...formData, willAllocate: e.target.checked})} />
                            <label className="form-check-label" htmlFor="willAllocate">I wish to allocate leave credits to the child's father / alternate caregiver.</label>
                          </div>
                          {formData.willAllocate && (
                            <div className="mt-2 ps-4">
                              <label htmlFor="allocationDays" className="form-label">Days to Allocate (Max 7)</label>
                              <input type="number" className={`form-control ${errors.allocationDays ? 'is-invalid' : ''}`} id="allocationDays" min="0" max="7" value={formData.allocationDays} onChange={(e) => setFormData({...formData, allocationDays: parseInt(e.target.value, 10) || 0})} />
                              {errors.allocationDays && <div className="invalid-feedback">{errors.allocationDays}</div>}
                            </div>
                          )}
                        </>
                      )}
                 </fieldset>
              )}

              <div className="mb-3"><label htmlFor="reason" className="form-label mt-3">Reason*</label><textarea id="reason" name="reason" rows="3" className={`form-control ${errors.reason ? 'is-invalid' : ''}`} value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})}></textarea>{errors.reason && <div className="invalid-feedback">{errors.reason}</div>}</div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {isEditing ? 'Saving...' : 'Submitting...'}
                  </>
                ) : (
                  isEditing ? 'Save Changes' : 'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestLeaveModal;