import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  if (includeTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const ApplicantCard = ({ applicant, jobTitle, onAction }) => {
  const PIPELINE_STAGES = ['New Applicant', 'Interview', 'Hired', 'Rejected' , 'Offer'];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: applicant.id,
    data: { applicant },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleActionClick = (e, action, data) => {
    e.stopPropagation(); 
    onAction(action, data);
  };
  
  return (
    <div 
        ref={setNodeRef} 
        style={style} 
        className={`applicant-card ${isDragging ? 'dragging' : ''}`}
    >
        <div {...attributes} {...listeners} onClick={(e) => handleActionClick(e, 'view', applicant)}>
            <div className="applicant-card-header">
                <span className="applicant-name">{applicant.full_name || applicant.name}</span>
                <div className="dropdown">
                    <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" onClick={(e) => e.stopPropagation()} aria-expanded="false">
                        <i className="bi bi-three-dots-vertical"></i>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                        <li><h6 className="dropdown-header">Move to...</h6></li>
                        {PIPELINE_STAGES.map(nextStage => (
                            nextStage !== applicant.status &&
                            <li key={nextStage}>
                                <a className="dropdown-item" href="#" onClick={(e) => handleActionClick(e, 'move', { applicantId: applicant.id, newStatus: nextStage })}>
                                    {nextStage}
                                </a>
                            </li>
                        ))}
                        <li><hr className="dropdown-divider" /></li>
                        {/* Schedule Interview - Show only if not already in Interview, Offer, Hired, or Rejected status */}
                        {!['Interview', 'Offer', 'Hired', 'Rejected'].includes(applicant.status) && (
                            <li><a className="dropdown-item" href="#" onClick={(e) => handleActionClick(e, 'scheduleInterview', applicant)}>Schedule Interview</a></li>
                        )}
                        {/* Hire - Show only if not already Hired or Rejected */}
                        {!['Hired', 'Rejected'].includes(applicant.status) && (
                            <li><a className="dropdown-item text-success" href="#" onClick={(e) => handleActionClick(e, 'hire', applicant)}>Hire</a></li>
                        )}
                        {/* Reject - Show only if not already Hired or Rejected */}
                        {!['Hired', 'Rejected'].includes(applicant.status) && (
                            <li><a className="dropdown-item text-danger" href="#" onClick={(e) => handleActionClick(e, 'reject', applicant)}>Reject</a></li>
                        )}
                        <li><hr className="dropdown-divider" /></li>
                        <li><a className="dropdown-item text-danger" href="#" onClick={(e) => handleActionClick(e, 'delete', applicant)}>Delete Applicant</a></li>
                    </ul>
                </div>
            </div>

            <p className="applicant-job-title">{jobTitle}</p>
            
            <div className="applicant-card-details">
                {applicant.interview_schedule && (
                    <div className="applicant-detail-item">
                        <i className="bi bi-calendar2-check-fill text-success"></i>
                        <span>Interview: {formatDate(applicant.interview_schedule.date)} at {applicant.interview_schedule.time}</span>
                    </div>
                )}
                <div className="applicant-detail-item">
                    <i className="bi bi-clock-history text-muted"></i>
                    <span>Updated: {formatDate(applicant.updated_at, true)}</span>
                </div>
            </div>

            <div className="applicant-card-footer">
                <span className="application-date">
                    Applied: {formatDate(applicant.application_date)}
                </span>
                {applicant.resume_file && (
                    <a 
                        href="#" 
                        className="resume-link" 
                        onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            try {
                                const token = localStorage.getItem('auth_token');
                                const response = await fetch(`/api/applicants/${applicant.id}/resume/view`, {
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                    },
                                });
                                if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    window.open(url, '_blank');
                                } else {
                                    alert('Failed to load resume');
                                }
                            } catch (error) {
                                console.error('Error viewing resume:', error);
                                alert('Failed to load resume');
                            }
                        }}
                    >
                        <i className="bi bi-file-earmark-text-fill"></i> Resume
                    </a>
                )}
            </div>
        </div>
    </div>
  );
};

export default ApplicantCard;