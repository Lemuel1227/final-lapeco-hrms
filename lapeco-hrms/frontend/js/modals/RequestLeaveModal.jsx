import React, { useState, useEffect, useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { leaveAPI } from '../services/api';

const MATERNITY_NORMAL_DAYS = 105;
const MATERNITY_SOLO_PARENT_BONUS = 15;
const MATERNITY_MISCARRIAGE_DAYS = 60;
const MIN_POSTNATAL_DAYS = 60;
const PATERNITY_DAYS = 7;

const RequestLeaveModal = ({ show, onClose, onSave, currentUser, editingRequest }) => {
  // Today helpers for preventing past dates
  const startOfToday = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
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
    attachment: null,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!editingRequest;
  const REASON_MAX = 500;
  const [noticePolicy, setNoticePolicy] = useState({});

  // Leave credits state
  const [leaveCredits, setLeaveCredits] = useState(null);
  const [creditsError, setCreditsError] = useState(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

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
      (async () => {
        try {
          const res = await leaveAPI.getNoticeDays();
          const p = res.data?.policy || {};
          setNoticePolicy(p);
        } catch (_) {
          setNoticePolicy({});
        }
      })();
    }
  }, [show, editingRequest]);

  const isMaternity = formData.leaveType === 'Maternity Leave';
  const isPaternity = formData.leaveType === 'Paternity Leave';
  const userGender = currentUser?.gender;
  const canClaimSoloParent = !!formData.soloParentDocument || !!editingRequest?.maternityDetails?.soloParentDocumentName;

  // Immediate past-date flags
  const isPastFrom = useMemo(() => {
    if (!formData.dateFrom) return false;
    const d = new Date(formData.dateFrom);
    return d < startOfToday;
  }, [formData.dateFrom, startOfToday]);
  const isPastTo = useMemo(() => {
    if (!formData.dateTo) return false;
    const d = new Date(formData.dateTo);
    return d < startOfToday;
  }, [formData.dateTo, startOfToday]);

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

  // Fetch leave credits when modal opens
  useEffect(() => {
    const fetchCredits = async () => {
      if (!show || !currentUser?.id) return;
      setCreditsLoading(true);
      setCreditsError(null);
      try {
        const currentYear = new Date().getFullYear();
        const res = await leaveAPI.getLeaveCredits(currentUser.id, { year: currentYear });
        setLeaveCredits(res.data?.data || null);
      } catch (err) {
        console.warn('Failed to fetch leave credits:', err);
        setCreditsError('Unable to load leave credits right now.');
        setLeaveCredits(null);
      } finally {
        setCreditsLoading(false);
      }
    };
    fetchCredits();
  }, [show, currentUser?.id]);

  // Compute remaining credits for selected type (Vacation/Sick/Emergency)
  const requiresCredits = !(isMaternity || isPaternity || formData.leaveType === 'Unpaid Leave');
  const remainingSelected = useMemo(() => {
    if (!leaveCredits) return null;
    const creditType = formData.leaveType === 'Emergency Leave' ? 'Vacation Leave' : formData.leaveType;
    const c = leaveCredits[creditType];
    if (!c) return null;
    const total = Number(c.total_credits || 0);
    const used = Number(c.used_credits || 0);
    return Math.max(0, total - used);
  }, [leaveCredits, formData.leaveType]);
  const hasInsufficientCredits = useMemo(() => {
    if (!requiresCredits) return false;
    if (remainingSelected === null) return false; // don't block if we couldn't load
    return remainingSelected <= 0 || (formData.days || 0) > remainingSelected;
  }, [requiresCredits, remainingSelected, formData.days]);

  // Immediate inline message when selected days exceed remaining credits
  const insufficientMessage = useMemo(() => {
    if (!requiresCredits || remainingSelected === null) return '';
    const requested = Number(formData.days || 0);
    if (requested <= 0) return '';
    const creditType = formData.leaveType === 'Emergency Leave' ? 'Vacation Leave' : formData.leaveType;
    if (remainingSelected <= 0) {
      return `You have 0 remaining ${creditType} credits.`;
    }
    if (requested > remainingSelected) {
      return `Insufficient ${creditType} credits. Remaining: ${remainingSelected}, requested: ${requested}.`;
    }
    return '';
  }, [requiresCredits, remainingSelected, formData.leaveType, formData.days]);
  
  const validate = () => {
    const newErrors = {};
    if (!formData.leaveType) newErrors.leaveType = 'Please select a leave type.';
    if (!formData.dateFrom) newErrors.dateFrom = 'Start date is required.';
    if (!formData.dateTo) newErrors.dateTo = 'End date is required.';
    // Block past dates for all leave types
    if (formData.dateFrom) {
      const from = new Date(formData.dateFrom);
      if (from < startOfToday) newErrors.dateFrom = 'Start date cannot be in the past.';
    }
    if (formData.dateTo && !isMaternity && !isPaternity) {
      const to = new Date(formData.dateTo);
      if (to < startOfToday) newErrors.dateTo = 'End date cannot be in the past.';
    }
    if (!isMaternity && !isPaternity && formData.dateTo < formData.dateFrom) newErrors.dateTo = 'End date cannot be before start date.';
    if (formData.dateFrom) {
      try {
        const from = new Date(formData.dateFrom + 'T00:00:00');
        const today = new Date();
        today.setHours(0,0,0,0);
        const diff = Math.ceil((from - today) / (1000 * 60 * 60 * 24));
        const required = Number(noticePolicy[formData.leaveType] || 0);
        if (required > 0 && diff < required) {
          newErrors.dateFrom = `Minimum notice for ${formData.leaveType}: ${required} day(s) before start date.`;
        }
      } catch (_) {}
    }
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
      // Require medical certificate for maternity leave
      if (!formData.medicalDocument && !editingRequest?.maternityDetails?.medicalDocumentName) {
        newErrors.medicalDocument = 'Medical certificate is required.';
      }
      // Require Solo Parent ID only when claiming solo parent benefit
      if (formData.isSoloParent && !(formData.soloParentDocument || editingRequest?.maternityDetails?.soloParentDocumentName)) {
        newErrors.soloParentDocument = 'Solo Parent ID is required to claim the 15-day benefit.';
      }
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
      // Require paternity attachments
      if (!formData.marriageCert && !editingRequest?.paternityDetails?.marriageCertName) {
        newErrors.marriageCert = 'Marriage certificate is required.';
      }
      if (!formData.birthCert && !editingRequest?.paternityDetails?.birthCertName) {
        newErrors.birthCert = "Child's birth or medical certificate is required.";
      }
    }
    // Client-side insufficient credits check (non-maternity/paternity and not unpaid)
    if (requiresCredits && remainingSelected !== null) {
      const creditType = formData.leaveType === 'Emergency Leave' ? 'Vacation Leave' : formData.leaveType;
      if (remainingSelected <= 0) {
        newErrors.days = `You have 0 remaining ${creditType} credits.`;
      } else if ((formData.days || 0) > remainingSelected) {
        newErrors.days = `Insufficient ${creditType} credits. Remaining: ${remainingSelected}, requested: ${formData.days}.`;
      }
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
            allocationDays: formData.willAllocate ? Number(formData.allocationDays || 0) : 0, 
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
        if (formData.attachment) {
          payload.attachment = formData.attachment;
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

  // UI helpers
  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(val >= 100 ? 0 : 1)} ${sizes[i]}`;
  };
  const leaveTypeIcon = useMemo(() => {
    switch (formData.leaveType) {
      case 'Vacation Leave': return 'bi-sun-fill';
      case 'Sick Leave': return 'bi-heart-pulse-fill';
      case 'Emergency Leave': return 'bi-exclamation-triangle-fill';
      case 'Unpaid Leave': return 'bi-cash-stack';
      case 'Maternity Leave': return 'bi-gender-female';
      case 'Paternity Leave': return 'bi-gender-male';
      default: return 'bi-calendar-event';
    }
  }, [formData.leaveType]);
  const leaveTypeTip = useMemo(() => {
    switch (formData.leaveType) {
      case 'Vacation Leave':
        return 'Plan ahead to ensure coverage; submit early for approval.';
      case 'Sick Leave':
        return 'Provide a brief summary of symptoms; attach a certificate if available.';
      case 'Emergency Leave':
        return 'Briefly describe the emergency and expected return date.';
      case 'Unpaid Leave':
        return 'Unpaid leave does not consume credits; clarify the reason.';
      case 'Maternity Leave':
        return 'Fill required maternity details below; postnatal minimum is 60 days.';
      case 'Paternity Leave':
        return 'Must be availed within 60 days of childbirth/miscarriage.';
      default:
        return '';
    }
  }, [formData.leaveType]);
  const leaveAccent = useMemo(() => {
    switch (formData.leaveType) {
      case 'Vacation Leave': return 'var(--primary-color)';
      case 'Sick Leave': return 'var(--app-success-color)';
      case 'Emergency Leave': return 'var(--danger-color)';
      case 'Unpaid Leave': return 'var(--secondary-color)';
      case 'Maternity Leave': return 'var(--pink-color)';
      case 'Paternity Leave': return 'var(--info-color)';
      default: return 'var(--app-success-color)';
    }
  }, [formData.leaveType]);
  const accentTextColor = useMemo(() => {
    switch (formData.leaveType) {
      case 'Sick Leave':
        return 'var(--text-on-success)';
      default:
        return 'var(--white-color)';
    }
  }, [formData.leaveType]);

const deliveryDateLabel = formData.maternityType === 'prenatal' ? 'Expected Date of Delivery*' : 'Actual Date of Delivery/Event*';
const attachmentHint = useMemo(() => {
  switch (formData.leaveType) {
    case 'Vacation Leave':
      return 'Optional: itinerary, booking confirmation, or travel documents.';
    case 'Sick Leave':
      return 'Recommended: medical certificate showing diagnosis and leave dates.';
    case 'Emergency Leave':
      return 'Optional: proof of emergency (incident report, notice, etc.).';
    case 'Unpaid Leave':
      return 'Optional: any supporting document for your request.';
    case 'Maternity Leave':
      return 'Use the dedicated fields below for medical certificate and Solo Parent ID; this is optional.';
    case 'Paternity Leave':
      return 'Use the dedicated fields below for marriage and birth/medical certificates; this is optional.';
    default:
      return 'Optional supporting document to help HR review your request.';
  }
}, [formData.leaveType]);

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content">
  <form onSubmit={handleSubmit} noValidate>
    <div className="modal-header rlm-header bg-light" style={{ borderLeft: `4px solid ${leaveAccent}` }}><h5 className="modal-title rlm-title">{isEditing ? 'Edit Leave Request' : 'New Leave Request'}</h5><button type="button" className="btn-close" onClick={handleClose}></button></div>
    <div className="modal-body request-leave-modal" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Summary card */}
              <div className="card bg-light border rlm-summary-card mb-2">
                <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className={`bi ${leaveTypeIcon} fs-5`} style={{ color: leaveAccent }}></i>
                    <div>
                      <div className="fw-semibold leave-type-name">{formData.leaveType || 'Select a leave type'}</div>
                      {leaveTypeTip && <div className="text-muted small">{leaveTypeTip}</div>}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-4">
                    <div>
                      <div className="text-muted small">Total Days</div>
                      <span className="badge rounded-pill" style={{ backgroundColor: leaveAccent, color: accentTextColor }}>{formData.days || 0}</span>
                    </div>
                    {requiresCredits && remainingSelected !== null && (
                      <div>
                        <div className="text-muted small">Remaining Credits</div>
                        <span className="badge rounded-pill" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{remainingSelected}</span>
                      </div>
                    )}
                  </div>
                </div>
                {(insufficientMessage || errors.days) && (
                  <div className="card-footer py-2">
                    <div className="text-danger small">{insufficientMessage || errors.days}</div>
                  </div>
                )}
              </div>
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
                {!errors.leaveType && leaveTypeTip && (<div className="form-text">{leaveTypeTip}</div>)}
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
                      <label htmlFor="marriageCert" className="form-label">Marriage Certificate*</label>
                      <input type="file" className={`form-control ${errors.marriageCert ? 'is-invalid' : ''}`} name="marriageCert" id="marriageCert" onChange={handleFileChange} />
                      <div className="form-text">Prefer PSA or local civil registry certificate. PDF/JPG/PNG up to 5MB.</div>
                      {errors.marriageCert && <div className="invalid-feedback d-block">{errors.marriageCert}</div>}
                      {formData.marriageCert && (
                        <div className="alert alert-secondary d-flex align-items-center justify-content-between mt-2 py-2">
                          <div>
                            <i className="bi bi-file-earmark-text me-2"></i>
                            <strong>{formData.marriageCert.name}</strong>
                            <span className="text-muted ms-2">{formatBytes(formData.marriageCert.size)}</span>
                          </div>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setFormData(prev => ({ ...prev, marriageCert: null }))}>
                            <i className="bi bi-trash me-1"></i>Remove
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <label htmlFor="birthCert" className="form-label">Child's Birth / Medical Certificate*</label>
                      <input type="file" className={`form-control ${errors.birthCert ? 'is-invalid' : ''}`} name="birthCert" id="birthCert" onChange={handleFileChange} />
                      <div className="form-text">Birth certificate or medical certificate confirming childbirth/miscarriage. Submit within 60 days. PDF/JPG/PNG up to 5MB.</div>
                      {errors.birthCert && <div className="invalid-feedback d-block">{errors.birthCert}</div>}
                      {formData.birthCert && (
                        <div className="alert alert-secondary d-flex align-items-center justify-content-between mt-2 py-2">
                          <div>
                            <i className="bi bi-file-earmark-medical me-2"></i>
                            <strong>{formData.birthCert.name}</strong>
                            <span className="text-muted ms-2">{formatBytes(formData.birthCert.size)}</span>
                          </div>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setFormData(prev => ({ ...prev, birthCert: null }))}>
                            <i className="bi bi-trash me-1"></i>Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </fieldset>
                </>
              )}

              <div className="row g-2">
                <div className="col-md-6 mb-3">
                  <label htmlFor="dateFrom" className="form-label"><i className="bi bi-calendar-event me-1"></i>From*</label>
                  <input type="date" id="dateFrom" name="dateFrom" className={`form-control ${errors.dateFrom ? 'is-invalid' : ''}`} value={formData.dateFrom} onChange={(e) => setFormData({...formData, dateFrom: e.target.value})} min={todayStr} />
                  {isMaternity && <div className="form-text">Per law, at least 60 days of your leave must be after your delivery date.</div>}
                  {isPaternity && <div className="form-text">Must be availed within 60 days from the date of delivery/miscarriage.</div>}
                  {Number(noticePolicy[formData.leaveType] || 0) > 0 && <div className="form-text">Minimum notice for {formData.leaveType}: {noticePolicy[formData.leaveType]} day(s).</div>}
                  {errors.dateFrom && <div className="invalid-feedback">{errors.dateFrom}</div>}
                  {!errors.dateFrom && isPastFrom && <div className="text-danger small">Selected start date is in the past.</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="dateTo" className="form-label"><i className="bi bi-calendar2-check me-1"></i>To*</label>
                  <input type="date" id="dateTo" name="dateTo" className={`form-control ${errors.dateTo ? 'is-invalid' : ''}`} value={formData.dateTo} onChange={(e) => setFormData({...formData, dateTo: e.target.value})} readOnly={isMaternity || isPaternity} min={todayStr} />
                  {errors.dateTo && <div className="invalid-feedback">{errors.dateTo}</div>}
                  {!errors.dateTo && isPastTo && !isMaternity && !isPaternity && <div className="text-danger small">Selected end date is in the past.</div>}
                </div>
              </div>
              <div className="mb-3">
                {requiresCredits && creditsError && (
                  <p className="text-warning small" style={{marginTop: '-8px'}}>{creditsError}</p>
                )}
                {isMaternity && formData.willAllocate && formData.allocationDays > 0 && (
                  <p className="text-info small" style={{marginTop: '-10px'}}>(Original: {originalMaternityDays} days - {formData.allocationDays} allocated = {formData.days} remaining days for you)</p>
                )}
              </div>
              {(!isMaternity && !isPaternity) && (
                <fieldset className="mb-3">
                  <legend className="form-label">Attachment (optional)</legend>
                  <input type="file" className="form-control" name="attachment" id="attachment" onChange={handleFileChange} />
                  <div className="form-text">{attachmentHint}</div>
                  <div className="form-text">Accepted formats: PDF, JPG, PNG, DOC, DOCX. Max 5MB.</div>
                </fieldset>
              )}
              
              {isMaternity && (
                 <fieldset className="maternity-fieldset">
                    <legend className="maternity-legend">Attachments & Allocation</legend>
                    <div className="mb-3">
                      <label htmlFor="medicalDocument" className="form-label">Medical Certificate*</label>
                      <input type="file" className={`form-control ${errors.medicalDocument ? 'is-invalid' : ''}`} name="medicalDocument" id="medicalDocument" onChange={handleFileChange} />
                      <div className="form-text">Issued by a licensed physician/OB; include expected/actual delivery date and relevant notes. PDF/JPG/PNG up to 5MB.</div>
                      {errors.medicalDocument && <div className="invalid-feedback d-block">{errors.medicalDocument}</div>}
                      {formData.medicalDocument && (
                        <div className="alert alert-secondary d-flex align-items-center justify-content-between mt-2 py-2">
                          <div>
                            <i className="bi bi-file-earmark-medical me-2"></i>
                            <strong>{formData.medicalDocument.name}</strong>
                            <span className="text-muted ms-2">{formatBytes(formData.medicalDocument.size)}</span>
                          </div>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setFormData(prev => ({ ...prev, medicalDocument: null }))}>
                            <i className="bi bi-trash me-1"></i>Remove
                          </button>
                        </div>
                      )}
                    </div>
                     {(formData.maternityType === 'prenatal' || formData.maternityType === 'normal') && (
                        <>
                          <div className="mb-3">
                            <label htmlFor="soloParentDocument" className="form-label">Solo Parent ID{formData.isSoloParent ? '*' : ''}</label>
                            <input type="file" className={`form-control ${errors.soloParentDocument ? 'is-invalid' : ''}`} name="soloParentDocument" id="soloParentDocument" onChange={handleFileChange} />
                            <div className="form-text">Upload your valid Solo Parent ID (scan or clear photo) to claim the additional 15-day benefit. PDF/JPG/PNG up to 5MB.</div>
                            {errors.soloParentDocument && <div className="invalid-feedback d-block">{errors.soloParentDocument}</div>}
                            {formData.soloParentDocument && (
                              <div className="alert alert-secondary d-flex align-items-center justify-content-between mt-2 py-2">
                                <div>
                                  <i className="bi bi-card-checklist me-2"></i>
                                  <strong>{formData.soloParentDocument.name}</strong>
                                  <span className="text-muted ms-2">{formatBytes(formData.soloParentDocument.size)}</span>
                                </div>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setFormData(prev => ({ ...prev, soloParentDocument: null, isSoloParent: false }))}>
                                  <i className="bi bi-trash me-1"></i>Remove
                                </button>
                              </div>
                            )}
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
                              <input type="number" className={`form-control ${errors.allocationDays ? 'is-invalid' : ''}`} id="allocationDays" min="0" max="7" value={formData.allocationDays} onChange={(e) => setFormData({...formData, allocationDays: e.target.value === '' ? '' : Math.max(0, Math.min(7, parseInt(e.target.value, 10) || 0))})} />
                              {errors.allocationDays && <div className="invalid-feedback">{errors.allocationDays}</div>}
                            </div>
                          )}
                        </>
                      )}
                 </fieldset>
              )}

              <div className="mb-3">
                <label htmlFor="reason" className="form-label mt-3"><i className="bi bi-chat-left-text me-1"></i>Reason*</label>
                <textarea
                  id="reason"
                  name="reason"
                  rows="3"
                  className={`form-control ${errors.reason ? 'is-invalid' : ''}`}
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  maxLength={REASON_MAX}
                  placeholder="Provide a brief reason to help HR review your request"
                ></textarea>
                <div className="d-flex justify-content-between">
                  {errors.reason ? (
                    <div className="invalid-feedback d-block">{errors.reason}</div>
                  ) : (
                    <div className="form-text">Be concise and specific. Example: “Family emergency requiring travel.”</div>
                  )}
                  <div className={`small ${formData.reason.length > REASON_MAX - 30 ? 'text-danger' : 'text-muted'}`}>{formData.reason.length}/{REASON_MAX}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</button>
              <button type="submit" className="btn btn-success shadow-sm" disabled={isSubmitting || hasInsufficientCredits}>
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
