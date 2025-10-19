import React, { useState, useMemo, useEffect } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import ConfirmationModal from '../../modals/ConfirmationModal';
import './MyResignationPage.css';
import { resignationAPI } from '../../services/api';

const RESIGNATION_LETTER_TEMPLATE = `Dear [Manager's Name],

Please accept this letter as formal notification that I am resigning from my position as [Your Position Title] at [Company Name]. My last day of employment will be [Your Last Day of Work].

Thank you for the opportunity to have worked in this position for the past [Duration of Employment]. I've greatly enjoyed and appreciated the opportunities I've had, and I am thankful for the skills I've learned.

I wish the company all the very best and I hope to stay in touch in the future.

Sincerely,
[Your Name]`;

// --- Stepper for STATUS VIEW ---
const OffboardingStepper = ({ status }) => {
    const steps = [
        { name: 'Submission', description: 'Your request has been sent.' },
        { name: 'HR Review', description: 'HR is reviewing your request.' },
        { name: 'Final Pay', description: 'Your final compensation is being processed.' },
    ];

    const getStepStatus = (stepIndex) => {
        // Step 0 is always complete, Pending is step 1, Approved moves to step 2.
        const statusMap = {
            'Pending': 1,
            'Approved': 2, 
        };
        const currentStepIndex = statusMap[status] || 0;
        
        if (stepIndex < currentStepIndex) return 'completed';
        if (stepIndex === currentStepIndex) return 'active';
        return 'pending';
    };

    return (
        <div className="offboarding-stepper">
            {steps.map((step, index) => (
                <div key={step.name} className={`step-item ${getStepStatus(index)}`}>
                    <div className="step-graphic">
                        <div className="step-circle">
                            {getStepStatus(index) === 'completed' ? <i className="bi bi-check-lg"></i> : <span>{index + 1}</span>}
                        </div>
                        {index < steps.length - 1 && <div className="step-connector"></div>}
                    </div>
                    <div className="step-content">
                        <div className="step-label">{step.name}</div>
                        <div className="step-description">{step.description}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};


// --- Form for SUBMISSION VIEW ---
const ResignationSubmissionForm = ({ currentUser, handlers }) => {
    const [lastDayOfWork, setLastDayOfWork] = useState('');
    const [reason, setReason] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [errors, setErrors] = useState({});

    const noticePeriod = useMemo(() => {
        if (!lastDayOfWork) return null;
        return differenceInDays(parseISO(lastDayOfWork), new Date());
    }, [lastDayOfWork]);

    const handleUseTemplate = () => {
        const name = currentUser.name || '[Your Name]';
        const position = currentUser.position || '[Your Position Title]';
        const template = RESIGNATION_LETTER_TEMPLATE
            .replace('[Manager\'s Name]', '[Manager\'s Name]')
            .replace('[Your Position Title]', position)
            .replace('[Company Name]', 'Lapeco Group of Companies')
            .replace('[Your Last Day of Work]', lastDayOfWork ? new Date(lastDayOfWork + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[Your Last Day of Work]')
            .replace('[Duration of Employment]', '[Duration of Employment]')
            .replace('[Your Name]', name);
        setReason(template);
    };

    const validate = () => {
        const newErrors = {};
        if (!lastDayOfWork) newErrors.lastDayOfWork = 'Please indicate your desired last day of work.';
        if (!reason.trim()) newErrors.reason = 'A resignation letter/reason is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            handlers.submitResignation({
                employeeId: currentUser.id,
                employeeName: currentUser.name,
                position: currentUser.position,
                lastDayOfWork,
                reason,
            });
            setLastDayOfWork('');
            setReason('');
        }
    };
    
    return (
      <>
        <header className="page-header mb-4">
            <h1 className="page-main-title">Submit Resignation</h1>
            <p className="text-muted">Please complete the form below to formally submit your resignation.</p>
        </header>
        <form onSubmit={handleSubmit} noValidate>
            <div className="submission-grid">
                <div className="submission-main">
                    <div className="card mb-4">
                        <div className="card-header"><h5 className="mb-0">Step 1: Submission Details</h5></div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label htmlFor="lastDayOfWork" className="form-label">Desired Last Day of Work*</label>
                                <input type="date" id="lastDayOfWork" className={`form-control ${errors.lastDayOfWork ? 'is-invalid' : ''}`} value={lastDayOfWork} onChange={e => setLastDayOfWork(e.target.value)} />
                                {errors.lastDayOfWork && <div className="invalid-feedback">{errors.lastDayOfWork}</div>}
                            </div>
                            {noticePeriod !== null && (
                                <div className={`notice-period-info ${noticePeriod < 30 ? 'notice-warning' : 'notice-standard'}`}>
                                    <i className={`bi ${noticePeriod < 30 ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`}></i>
                                    {noticePeriod < 0 
                                        ? "Please select a future date."
                                        : `This constitutes a ${noticePeriod}-day notice period. A 30-day notice is standard.`
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Step 2: Resignation Letter</h5>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleUseTemplate}>Use Template</button>
                        </div>
                        <div className="card-body">
                            <textarea id="reason" rows="12" className={`form-control ${errors.reason ? 'is-invalid' : ''}`} value={reason} onChange={e => setReason(e.target.value)} placeholder="Please write your formal resignation letter here..."></textarea>
                            {errors.reason && <div className="invalid-feedback d-block">{errors.reason}</div>}
                        </div>
                    </div>
                </div>
                <div className="submission-sidebar">
                    <div className="card process-overview-card">
                        <div className="card-header"><h5 className="mb-0">Process Overview</h5></div>
                        <div className="card-body">
                           <div className="process-step">
                                <div className="step-circle active">1</div>
                                <div className="step-text"><strong>Submit Request</strong><p>Complete and submit this form.</p></div>
                           </div>
                           <div className="process-step">
                                <div className="step-circle">2</div>
                                <div className="step-text"><strong>HR Review</strong><p>Your request will be reviewed and processed.</p></div>
                           </div>
                           <div className="process-step">
                                <div className="step-circle">3</div>
                                <div className="step-text"><strong>Final Pay</strong><p>Your final compensation will be calculated.</p></div>
                           </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card final-submission-section">
                <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="confirmSubmission" checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} />
                    <label className="form-check-label" htmlFor="confirmSubmission">
                        I understand that this action is final and will formally begin the offboarding process.
                    </label>
                </div>
                <button type="submit" className="btn btn-danger" disabled={!isConfirmed}>
                    <i className="bi bi-send-fill me-2"></i>Confirm & Submit Resignation
                </button>
            </div>
        </form>
      </>
    );
};

const MyResignationPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [myResignation, setMyResignation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize current user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse current user', e);
    }
  }, []);

  // Fetch latest resignation of current user
  useEffect(() => {
    const fetchMyResignation = async () => {
      if (!currentUser?.id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await resignationAPI.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        const mine = list.find(r => r.employee_id === currentUser.id);
        if (mine) {
          const normalizedStatus = mine.status === 'pending' ? 'Pending' :
            mine.status === 'approved' ? 'Approved' :
            mine.status === 'rejected' ? 'Declined' :
            mine.status === 'withdrawn' ? 'Withdrawn' : (mine.status || 'Pending');
          setMyResignation({
            id: mine.id,
            employeeId: mine.employee_id,
            employeeName: mine.employee?.name || currentUser.name,
            status: normalizedStatus,
            reason: mine.reason,
            submissionDate: mine.submission_date,
            effectiveDate: mine.effective_date,
            hrComments: mine.notes || mine.hr_comments || '',
            approvedBy: mine.approved_by,
            approver: mine.approver,
          });
        } else {
          setMyResignation(null);
        }
      } catch (err) {
        console.error('Failed to load resignation', err);
        setError('Failed to load your resignation data.');
      } finally {
        setLoading(false);
      }
    };
    fetchMyResignation();
  }, [currentUser]);

  const submitResignation = async ({ employeeId, lastDayOfWork, reason }) => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        employee_id: employeeId,
        reason,
        submission_date: new Date().toISOString().slice(0, 10),
        effective_date: lastDayOfWork,
        notes: null,
      };
      const res = await resignationAPI.create(payload);
      const mine = res.data;
      const normalizedStatus = mine.status === 'pending' ? 'Pending' :
        mine.status === 'approved' ? 'Approved' :
        mine.status === 'rejected' ? 'Declined' :
        mine.status === 'withdrawn' ? 'Withdrawn' : (mine.status || 'Pending');
      setMyResignation({
        id: mine.id,
        employeeId: mine.employee_id,
        employeeName: mine.employee?.name || currentUser?.name,
        status: normalizedStatus,
        reason: mine.reason,
        submissionDate: mine.submission_date,
        effectiveDate: mine.effective_date,
        hrComments: mine.notes || mine.hr_comments || '',
        approvedBy: mine.approved_by,
        approver: mine.approver,
      });
    } catch (err) {
      console.error('Failed to submit resignation', err);
      setError('Failed to submit resignation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !myResignation && !error) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-warning" role="alert">{error}</div>
      </div>
    );
  }

  if (myResignation) {
    const statusClass = myResignation.status.toLowerCase();
    const submissionDate = new Date(myResignation.submissionDate);
    const effectiveDate = new Date(myResignation.effectiveDate);
    
    return (
      <div className="container-fluid p-0 page-module-container resignation-status-view">
        <div className="status-main-header">
          <div className="status-header-text">
            <h1 className="page-main-title">Resignation Submitted</h1>
            <p className="text-muted">Your request is being processed. Here is the current status and timeline.</p>
          </div>
          <span className={`status-badge status-${statusClass}`}>{myResignation.status}</span>
        </div>

        <div className="key-dates-grid">
            <div className="key-date-card">
                <div className="date-value">{submissionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="date-label">Submission Date</div>
                <div className="date-year">{submissionDate.getFullYear()}</div>
            </div>
             <div className="key-date-card">
                <div className="date-value">{effectiveDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="date-label">Official Effective Date</div>
                <div className="date-year">{effectiveDate.getFullYear()}</div>
            </div>
        </div>

        <div className="row g-4 mt-2">
            <div className="col-lg-5">
                <div className="d-flex flex-column gap-4">
                    <div className="card">
                        <div className="card-header"><h5 className="mb-0">Offboarding Process</h5></div>
                        <div className="card-body">
                            <OffboardingStepper status={myResignation.status} />
                        </div>
                    </div>
                    {myResignation.hrComments && (
                        <div className="card">
                            <div className="card-header"><h6 className="mb-0"><i className="bi bi-chat-left-text-fill me-2"></i>HR Comments</h6></div>
                            <div className="card-body">
                                <p className="text-muted fst-italic mb-0">"{myResignation.hrComments}"</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="col-lg-7">
                <div className="card flex-grow-1 h-100">
                    <div className="card-header"><h6 className="mb-0"><i className="bi bi-file-earmark-text-fill me-2"></i>Submitted Letter</h6></div>
                    <div className="card-body">
                        <div className="resignation-letter-content">
                            {myResignation.reason}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 page-module-container">
      {currentUser && (
        <ResignationSubmissionForm currentUser={currentUser} handlers={{ submitResignation }} />
      )}
    </div>
  );
};

export default MyResignationPage;