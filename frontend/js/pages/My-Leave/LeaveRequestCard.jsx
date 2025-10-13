import React from 'react';
import './MyLeavePage.css';
import { formatDateRange, getMonthAbbr, getDay } from '../../utils/dateUtils';

const LeaveRequestCard = ({ request }) => {
  const statusClass = (request.status || 'pending').toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`leave-card status-${statusClass}`}>
      <div className="date-box">
        <span className="month">{getMonthAbbr(request.dateFrom)}</span>
        <span className="day">{getDay(request.dateFrom)}</span>
      </div>
      <div className="info-section">
        <div className="info-header">
          <h6 className="leave-type">{request.leaveType}</h6>
          <span className={`status-badge status-${statusClass}`}>{request.status}</span>
        </div>
        <div className="info-body">
          <div className="info-item">
            <i className="bi bi-calendar-range"></i>
            <span>{formatDateRange(request.dateFrom, request.dateTo)}</span>
          </div>
          <div className="info-item">
            <i className="bi bi-clock-history"></i>
            <span>{request.days} Day(s)</span>
          </div>
        </div>
        {request.reason && (
            <p className="info-reason text-muted fst-italic">
                "{request.reason}"
            </p>
        )}
      </div>
    </div>
  );
};

export default LeaveRequestCard;