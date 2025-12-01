import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import Select from 'react-select';
import ConfirmationModal from '../../modals/ConfirmationModal';
import './SubmitReportPage.css';
import { getUserProfile } from '../../services/accountService';
import { employeeAPI, disciplinaryCaseAPI } from '../../services/api';
import TeamLeaderCaseDetailView from '../Dashboard/TeamLeaderCaseDetailView';
import CaseCard from '../Case-Management/CaseCard';
import '../Case-Management/CaseManagement.css';

const INCIDENT_TYPES = [
  'Tardiness / Punctuality',
  'Safety Violation',
  'Insubordination',
  'Company Policy Violation',
  'Poor Performance',
  'Misconduct',
  'Damaged Equipment / Products',
  'Other',
];

const SubmitReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('submit');
  const [userRole, setUserRole] = useState(null);
  const [resolvedUser, setResolvedUser] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [employees, setEmployees] = useState([]);
  const employeeMap = useMemo(() => new Map(employees.map(emp => [emp.id, { id: emp.id, name: emp.name, imageUrl: emp.image_url || emp.profile_image }])), [employees]);
  const [submittedReports, setSubmittedReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [formData, setFormData] = useState({
    employeeId: null,
    issueDate: new Date().toISOString().split('T')[0],
    reason: INCIDENT_TYPES[0],
    description: '',
    attachment: null,
    chargeFee: '',
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

  useEffect(() => {
    const loadSubmittedReports = async () => {
      if (activeTab !== 'submitted' || !resolvedUser) return;
      try {
        setReportsLoading(true);
        setReportsError(null);
        const normalizedRole = String(resolvedUser?.role || '').toUpperCase() || String(userRole || '').toUpperCase();

        let casesData = [];
        if (normalizedRole === 'REGULAR_EMPLOYEE') {
          // Employee can only see their own cases; we will filter to those they submitted
          const response = await disciplinaryCaseAPI.getMyCases();
          casesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        } else {
          const response = await disciplinaryCaseAPI.getAll();
          casesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        }

        const currentUserId = resolvedUser.id || resolvedUser.employee_id;
        const submittedReports = casesData
          .filter(c => (c.reported_by || c.submittedBy) === currentUserId)
          .map(c => ({
            caseId: c.id,
            employeeId: c.employee_id,
            actionType: c.action_type,
            description: c.description,
            incidentDate: c.incident_date ? String(c.incident_date).slice(0,10) : '',
            reason: c.reason,
            status: (c.approval_status === 'approved') ? 'Ongoing' : 'Pending',
            resolutionTaken: c.resolution_taken,
            attachment: c.attachment,
            issueDate: c.incident_date ? String(c.incident_date).slice(0,10) : '',
            updatedAt: c.updated_at,
            approvalStatus: c.approval_status,
            submittedBy: c.reported_by || 'Unknown',
            actionLog: (c.action_logs || []).map(log => ({
              id: log.id,
              date: log.date_created ? new Date(log.date_created).toISOString().slice(0,10) : (log.date ? String(log.date).slice(0,10) : ''),
              action: log.description || log.action,
            })),
            attachments: c.attachment ? [c.attachment] : [],
            nextSteps: c.resolution_taken,
            employeeName: c.employee_name || `Employee #${c.employee_id}`,
          }));
        setSubmittedReports(submittedReports);
      } catch (err) {
        console.error('Failed to load submitted reports:', err);
        setReportsError('Failed to load your submitted reports.');
        setSubmittedReports([]);
      } finally {
        setReportsLoading(false);
      }
    };

    loadSubmittedReports();
  }, [activeTab, resolvedUser, userRole]);

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

      if (formData.reason === 'Damaged Equipment / Products' && formData.chargeFee) {
        payload.append('charge_fee', formData.chargeFee);
      }

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
        <header className="page-header mb-3">
          <h1 className="page-main-title">Incedent Report</h1>
          <p className="text-muted">Submit a new incedent report or view your submitted reports and interact via logs.</p>
        </header>

        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'submit' ? 'active' : ''}`} onClick={() => setActiveTab('submit')}>
              Submit
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'submitted' ? 'active' : ''}`} onClick={() => setActiveTab('submitted')}>
              Submitted Reports
            </button>
          </li>
        </ul>

        {activeTab === 'submit' && (
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
                      {formData.reason === 'Damaged Equipment / Products' && (
                        <div className="col-12">
                          <label htmlFor="chargeFee" className="form-label fw-bold">Charge Fee (Amount to be deducted)</label>
                          <div className="input-group">
                            <span className="input-group-text">₱</span>
                            <input 
                              type="number" 
                              id="chargeFee" 
                              name="chargeFee" 
                              className="form-control" 
                              value={formData.chargeFee} 
                              onChange={handleChange} 
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <div className="form-text text-muted">This amount will appear as a deduction in payroll.</div>
                        </div>
                      )}
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
        )}

        {activeTab === 'submitted' && (
          <div className="submitted-reports-tab">
            {!selectedCase ? (
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0"><i className="bi bi-file-text-fill me-2"></i>My Submitted Reports</h6>
                </div>
                <div className="card-body">
                  {reportsLoading ? (
                    <div className="text-center py-3"><div className="spinner-border" role="status"></div></div>
                  ) : reportsError ? (
                    <div className="alert alert-danger" role="alert">{reportsError}</div>
                  ) : submittedReports.length > 0 ? (
                    <div className="case-card-grid">
                      {submittedReports.map(rep => (
                        <CaseCard
                          key={rep.caseId}
                          caseInfo={rep}
                          employee={employeeMap.get(rep.employeeId)}
                          onView={async (ci) => {
                            try {
                              const empResp = await employeeAPI.getById(ci.employeeId);
                              const emp = empResp.data || {};
                              setSelectedEmployee({
                                id: emp.id,
                                name: emp.name || [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' '),
                                email: emp.email,
                                position: emp.position?.name || 'N/A',
                                imageUrl: emp.image_url || emp.profile_image,
                              });
                            } catch (e) {
                              setSelectedEmployee(employeeMap.get(ci.employeeId) || null);
                            }

                            try {
                              const { data } = await disciplinaryCaseAPI.getById(ci.caseId);
                              const actionLogsSource = Array.isArray(data.action_logs) && data.action_logs.length > 0 ? data.action_logs : (ci.actionLog || []);
                              const attachments = Array.isArray(data.attachments) ? data.attachments : (data.attachment ? [data.attachment] : []);
                              const incidentDate = data.incident_date ? String(data.incident_date).slice(0,10) : '';
                              const detailedCase = {
                                caseId: data.id,
                                employeeId: data.employee_id,
                                actionType: data.action_type,
                                description: data.description,
                                incidentDate,
                                reason: data.reason,
                                status: (String(data.approval_status).toLowerCase() === 'approved') ? 'Ongoing' : 'Pending',
                                resolutionTaken: data.resolution_taken,
                                attachment: data.attachment,
                                issueDate: incidentDate,
                                updatedAt: data.updated_at,
                                approvalStatus: data.approval_status,
                                submittedBy: data.reported_by ?? ci.submittedBy,
                                actionLog: (actionLogsSource || []).map(log => ({
                                  id: log.id,
                                  date: log.date_created ? new Date(log.date_created).toISOString().slice(0,10) : (log.date ? String(log.date).slice(0,10) : ''),
                                  action: log.description || log.action,
                                  user: log.user ? {
                                    id: log.user.id,
                                    first_name: log.user.first_name,
                                    middle_name: log.user.middle_name,
                                    last_name: log.user.last_name,
                                    imageUrl: log.user.image_url || log.user.profile_image_url,
                                    position: log.user.position,
                                  } : null,
                                })),
                                attachments,
                                nextSteps: data.resolution_taken,
                                employeeName: data.employee_name || `Employee #${data.employee_id}`,
                              };
                              setSelectedCase(detailedCase);
                            } catch (err) {
                              setSelectedCase(ci);
                            }
                          }}
                          onDelete={() => {}}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted small mb-0">No reports found.</p>
                  )}
                </div>
              </div>
            ) : (
              <TeamLeaderCaseDetailView
                caseInfo={selectedCase}
                employee={selectedEmployee}
                currentUser={resolvedUser}
                onBack={() => setSelectedCase(null)}
                backLabel="Back to Submitted Reports"
                canInteract={(() => {
                  const isApproved = String(selectedCase?.approvalStatus || '').toLowerCase() === 'approved';
                  const submitterId = String(selectedCase?.submittedBy ?? '');
                  const currentUserId = String((resolvedUser?.id ?? resolvedUser?.employee_id) || '');
                  return isApproved && submitterId === currentUserId;
                })()}
                onSaveLog={async (caseId, logEntry) => {
                  try {
                    const response = await disciplinaryCaseAPI.addActionLog(caseId, { description: logEntry.action, date_created: logEntry.date });
                    const saved = response?.data;
                    const uiLog = saved ? {
                      id: saved.id,
                      date: saved.date_created ? new Date(saved.date_created).toISOString().slice(0,10) : (logEntry.date || new Date().toISOString().slice(0,10)),
                      action: saved.description || logEntry.action,
                      user: saved.user ? {
                        id: saved.user.id,
                        first_name: saved.user.first_name,
                        middle_name: saved.user.middle_name,
                        last_name: saved.user.last_name,
                        imageUrl: saved.user.image_url || saved.user.profile_image_url,
                        position: saved.user.position,
                      } : (resolvedUser ? {
                        id: resolvedUser.id,
                        first_name: resolvedUser.first_name,
                        middle_name: resolvedUser.middle_name,
                        last_name: resolvedUser.last_name,
                        imageUrl: resolvedUser.image_url,
                        position: resolvedUser.position,
                      } : null),
                    } : logEntry;
                    setSelectedCase(prev => ({ ...prev, actionLog: [...(prev.actionLog || []), uiLog] }));
                    setSubmittedReports(prev => prev.map(c => c.caseId === caseId ? { ...c, actionLog: [...(c.actionLog || []), uiLog] } : c));
                  } catch (e) {
                    console.error('Failed to add log:', e);
                  }
                }}
                onUploadAttachment={async (caseId, file) => {
                  try {
                    await disciplinaryCaseAPI.uploadAttachment(caseId, file);
                    setSelectedCase(prev => ({ ...prev, attachments: [...(prev.attachments || []), file.name] }));
                  } catch (e) {
                    console.error('Failed to upload attachment:', e);
                  }
                }}
                onDownloadAttachment={async (caseId, fileName) => {
                  try {
                    await disciplinaryCaseAPI.downloadAttachment(caseId, fileName);
                  } catch (e) {
                    console.error('Failed to download attachment:', e);
                  }
                }}
              />
            )}
          </div>
        )}
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
