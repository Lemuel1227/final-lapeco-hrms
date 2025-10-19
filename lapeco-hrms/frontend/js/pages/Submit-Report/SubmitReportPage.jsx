import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import ConfirmationModal from '../../modals/ConfirmationModal';
import './SubmitReportPage.css';
import { getUserProfile } from '../../services/accountService';
import { employeeAPI, disciplinaryCaseAPI } from '../../services/api';

const INCIDENT_TYPES = [
  'Tardiness / Punctuality',
  'Safety Violation',
  'Insubordination',
  'Company Policy Violation',
  'Poor Performance',
  'Misconduct',
  'Other',
];

const SubmitReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [userRole, setUserRole] = useState(null);
  const [resolvedUser, setResolvedUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    employeeId: null,
    issueDate: new Date().toISOString().split('T')[0],
    reason: INCIDENT_TYPES[0],
    description: '',
    attachment: null,
  });
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProfileAndEmployees = async () => {
      try {
        setLoadingProfile(true);
        const profile = await getUserProfile();
        if (!isMounted) return;

        const profileUserRaw = profile?.data?.user || profile?.user || profile;
        const normalizedUser = profileUserRaw ? {
          ...profileUserRaw,
          name: profileUserRaw.name ?? [profileUserRaw.first_name, profileUserRaw.middle_name, profileUserRaw.last_name]
            .filter(Boolean)
            .join(' '),
          positionId: profileUserRaw.position_id ?? profileUserRaw.positionId ?? null,
        } : null;
        setResolvedUser(normalizedUser);

        const resolvedRole = profile?.role || profile?.user_role || profile?.data?.role;
        setUserRole(resolvedRole || null);

        const employeesResponse = await employeeAPI.getList();
        if (!isMounted) return;
        const employeeData = Array.isArray(employeesResponse.data)
          ? employeesResponse.data
          : (employeesResponse.data?.data || []);
        const mappedEmployees = employeeData.map(emp => {
          const fullName = emp.name ?? [emp.first_name, emp.middle_name, emp.last_name]
            .filter(Boolean)
            .join(' ');

          return {
            id: emp.id,
            name: fullName,
            positionId: emp.position_id,
            isTeamLeader: Boolean(emp.is_team_leader),
          };
        });
        setEmployees(mappedEmployees);
      } catch (err) {
        console.error('Failed to load user profile or employees:', err);
        setResolvedUser(null);
        setEmployees([]);
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    fetchProfileAndEmployees();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const normalizedRole = (userRole || '').toUpperCase();

    if (!resolvedUser) {
      return;
    }

    // Pre-fill employee if navigating from MyTeamPage
    if (location.state?.employeeToReportId && normalizedRole === 'TEAM_LEADER') {
      setFormData(prev => ({ ...prev, employeeId: location.state.employeeToReportId }));
      return;
    }

    setFormData(prev => {
      const normalizedReason = INCIDENT_TYPES.includes(prev.reason) ? prev.reason : INCIDENT_TYPES[0];
      const defaultEmployeeId = normalizedRole === 'REGULAR_EMPLOYEE' ? resolvedUser?.id ?? prev.employeeId : prev.employeeId;
      return {
        ...prev,
        employeeId: defaultEmployeeId,
        reason: normalizedReason,
      };
    });
  }, [userRole, resolvedUser, location.state]);

  const employeeOptions = useMemo(() => {
    const normalizedRole = (userRole || '').toUpperCase();
    if (!resolvedUser) return [];

    if (normalizedRole === 'TEAM_LEADER') {
      const teamMembers = employees.filter(emp => emp.positionId === resolvedUser.positionId && !emp.isTeamLeader);
      // Team leader can report themselves or their members
      const reportableEmployees = [resolvedUser, ...teamMembers];
      return reportableEmployees.map(emp => ({ value: emp.id, label: `${emp.name} (${emp.id})` }));
    }
    // Regular employees can only report themselves
    if (normalizedRole === 'REGULAR_EMPLOYEE') {
      return resolvedUser ? [{ value: resolvedUser.id, label: `${resolvedUser.name} (${resolvedUser.id})` }] : [];
    }
    return [];
  }, [employees, resolvedUser, userRole]);

  const selectedEmployeeName = useMemo(() => {
    const match = employeeOptions.find(opt => opt.value === formData.employeeId);
    if (match) return match.label;
    if (formData.employeeId && formData.employeeId === resolvedUser?.id) {
      const displayName = resolvedUser?.name || resolvedUser?.full_name || 'You';
      return `${displayName} (${resolvedUser?.id ?? '—'})`;
    }
    return '';
  }, [employeeOptions, formData.employeeId, resolvedUser]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleEmployeeSelect = (selectedOption) => {
    setFormData(prev => ({ ...prev, employeeId: selectedOption ? selectedOption.value : null }));
    if (errors.employeeId) {
      setErrors(prev => ({ ...prev, employeeId: null }));
    }
  };

  const removeAttachment = () => {
    setFormData(prev => ({ ...prev, attachment: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.employeeId) newErrors.employeeId = 'You must select an employee to report.';
    if (!formData.issueDate) newErrors.issueDate = 'The date of the incident is required.';
    if (!formData.description.trim()) newErrors.description = 'A detailed description is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      const payload = new FormData();
      payload.append('employee_id', formData.employeeId);
      payload.append('action_type', 'Incident Report');
      payload.append('description', formData.description);
      payload.append('incident_date', formData.issueDate);
      payload.append('reason', formData.reason);

      if (formData.attachment) {
        payload.append('attachment', formData.attachment);
      }

      await disciplinaryCaseAPI.create(payload);

      setShowConfirmModal(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to submit incident report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProfile || !resolvedUser) {
    return (
      <div className="container-fluid p-0 page-module-container">
        <div className="text-center p-5 bg-light rounded">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading user data...</span>
          </div>
          <p className="mt-3 text-muted">Preparing your incident report form...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid p-0 page-module-container">
        <header className="page-header mb-4">
          <h1 className="page-main-title">Submit Incident Report</h1>
          <p className="text-muted">Use this form to formally report a workplace incident to HR for review.</p>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="submit-report-grid">
            <div className="report-form-main">
              <div className="card shadow-sm">
                <div className="card-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label htmlFor="employeeId" className="form-label fw-bold">Employee to Report*</label>
                      {(userRole || '').toUpperCase() === 'REGULAR_EMPLOYEE' ? (
                        <input type="text" className="form-control" value={resolvedUser.name} readOnly disabled />
                      ) : (
                        <Select
                          id="employeeId"
                          options={employeeOptions}
                          onChange={handleEmployeeSelect}
                          value={employeeOptions.find(opt => opt.value === formData.employeeId)}
                          placeholder="Search and select an employee..."
                          className={`react-select-container ${errors.employeeId ? 'is-invalid' : ''}`}
                          classNamePrefix="react-select"
                        />
                      )}
                      {errors.employeeId && <div className="invalid-feedback d-block">{errors.employeeId}</div>}
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="issueDate" className="form-label fw-bold">Date of Incident*</label>
                      <input type="date" id="issueDate" name="issueDate" className={`form-control ${errors.issueDate ? 'is-invalid' : ''}`} value={formData.issueDate} onChange={handleChange} required />
                      {errors.issueDate && <div className="invalid-feedback">{errors.issueDate}</div>}
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="reason" className="form-label fw-bold">Reason / Infraction*</label>
                      <select id="reason" name="reason" className="form-select" value={formData.reason} onChange={handleChange}>
                        {INCIDENT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label htmlFor="description" className="form-label fw-bold">Detailed Description*</label>
                      <textarea 
                        id="description" 
                        name="description" 
                        className={`form-control ${errors.description ? 'is-invalid' : ''}`} 
                        rows="8" 
                        value={formData.description} 
                        onChange={handleChange} 
                        placeholder={
`Provide a clear and factual account of the incident. Include details such as:
- What happened?
- Who was involved?
- When and where did it occur?
- Were there any witnesses?`
                        }
                      ></textarea>
                      {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                    </div>
                    <div className="col-12">
                      <label htmlFor="attachment" className="form-label fw-bold">Supporting Evidence (Optional)</label>
                      <p className="form-text text-muted mt-0">Attach any relevant documents, images, or screenshots.</p>
                      <input ref={fileInputRef} type="file" id="attachment" name="attachment" className="form-control" onChange={handleChange} />
                      {formData.attachment && (
                        <div className="attachment-display mt-2">
                          <i className="bi bi-paperclip"></i>
                          <span>{formData.attachment.name}</span>
                          <button type="button" className="btn-close btn-sm" onClick={removeAttachment} aria-label="Remove attachment"></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="card-footer text-end">
                    <button type="submit" className="btn btn-primary">
                        <i className="bi bi-send-fill me-2"></i>Submit Report to HR
                    </button>
                </div>
              </div>
            </div>
            <div className="report-form-sidebar">
              <div className="card instructions-card">
                <div className="card-header">
                  <h6 className="mb-0"><i className="bi bi-info-circle-fill me-2"></i>Submission Guidelines</h6>
                </div>
                <div className="card-body">
                  <p><strong>Be Factual and Specific:</strong> Provide clear, objective details about the incident. Avoid assumptions and emotional language.</p>
                  <p><strong>Confidentiality:</strong> Your submission will be sent directly to the HR department for review. The contents of this report are confidential.</p>
                  <p><strong>Next Steps:</strong> Once submitted, HR will investigate the matter and take appropriate action. You may be contacted for further information.</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <ConfirmationModal
        show={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirm Report Submission"
        confirmText="Yes, Submit Report"
        confirmVariant="primary"
        confirmDisabled={!formData.employeeId || isSubmitting}
        confirmLoading={isSubmitting}
      >
        <p>You are about to submit an incident report regarding:</p>
        <ul className="list-unstyled bg-light p-3 rounded">
            <li><strong>Employee:</strong> {selectedEmployeeName}</li>
            <li><strong>Reason:</strong> {formData.reason}</li>
            <li><strong>Date:</strong> {formData.issueDate}</li>
        </ul>
        <p className="fw-bold">Please confirm that the information you have provided is accurate to the best of your knowledge.</p>
      </ConfirmationModal>
    </>
  );
};

export default SubmitReportPage;