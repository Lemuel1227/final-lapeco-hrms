import React from 'react';
import { differenceInDays, parseISO, startOfToday, format } from 'date-fns';
import ActionsDropdown from '../../common/ActionsDropdown';

const ResignationRequestRow = ({ request, employee, onApprove, onDecline, onEditDate, onViewReason, onViewProfile, onDelete }) => {
    if (!request || !request.id) {
        return null;
    }

    const statusClass = (request.status || 'pending').toLowerCase();

    const hasDates = request.effectiveDate && request.submissionDate;

    // Handle both ISO string dates and Date objects
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'string') {
            // Handle both ISO format and simple date format
            return parseISO(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00.000Z');
        }
        return dateStr instanceof Date ? dateStr : null;
    };

    const submissionDate = parseDate(request.submissionDate);
    const effectiveDate = parseDate(request.effectiveDate);
    
    const noticeInDays = (submissionDate && effectiveDate) ? 
        differenceInDays(effectiveDate, submissionDate) : null;
    let noticeBadgeClass = 'notice-standard';
    if (noticeInDays !== null) {
        if (noticeInDays < 30) noticeBadgeClass = 'notice-short';
        if (noticeInDays > 30) noticeBadgeClass = 'notice-long';
    }

    const today = startOfToday();
    const daysRemaining = effectiveDate ? differenceInDays(effectiveDate, today) : null;
    let daysRemainingBadgeClass = 'neutral';
    let daysRemainingText = 'N/A';

    if (daysRemaining !== null && request.status === 'Approved') {
        daysRemainingText = `${daysRemaining} days`;
        if (daysRemaining > 0) {
            daysRemainingBadgeClass = 'positive';
        } else if (daysRemaining === 0) {
            daysRemainingText = 'Today';
        } else {
            daysRemainingBadgeClass = 'negative';
            daysRemainingText = `Overdue`;
        }
    }

    return (
        <tr>
            <td>{request.employeeId}</td>
            <td>
                <div className="fw-bold">{request.employeeName}</div>
            </td>
            <td>{request.position}</td>
            <td>{request.submissionDate ? format(submissionDate, 'MMM dd, yyyy') : 'N/A'}</td>
            <td><strong>{request.effectiveDate ? format(effectiveDate, 'MMM dd, yyyy') : 'N/A'}</strong></td>
            <td className="text-center">
                {noticeInDays !== null ? (
                    <span className={`notice-badge ${noticeBadgeClass}`}>{noticeInDays} days</span>
                ) : (
                    <span className="notice-badge notice-standard">N/A</span>
                )}
            </td>
            <td className="text-center">
                <span className={`days-remaining-badge ${daysRemainingBadgeClass}`}>{daysRemainingText}</span>
            </td>
            <td className="text-center">
                <span className={`status-badge status-${statusClass}`}>{request.status}</span>
            </td>
            <td className="text-center">
                <ActionsDropdown>
                    <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewProfile(); }}>
                        <i className="bi bi-person-lines-fill me-2"></i>View Profile
                    </a>
                    <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onViewReason(); }}>
                        <i className="bi bi-info-circle me-2"></i>View Reason
                    </a>
                    <div className="dropdown-divider"></div>
                    <a className="dropdown-item text-success" href="#" onClick={(e) => { e.preventDefault(); onApprove(); }}>
                        <i className="bi bi-check-circle-fill me-2"></i>Approve
                    </a>
                    <div className="dropdown-divider"></div>
                    <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onEditDate(); }}>
                        <i className="bi bi-calendar-event me-2"></i>Edit Effective Date
                    </a>
                </ActionsDropdown>
            </td>
        </tr>
    );
};

export default ResignationRequestRow;