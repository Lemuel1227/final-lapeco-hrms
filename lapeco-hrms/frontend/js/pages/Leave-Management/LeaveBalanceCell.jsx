import React, { useEffect, useRef } from 'react';
import { Tooltip } from 'bootstrap';

const LeaveBalanceCell = ({ balance, totalCredits }) => {
  const cellRef = useRef(null);

  const vacationRemaining = balance.vacation;
  const vacationTotal = totalCredits.vacation;
  const vacationPercentage = vacationTotal > 0 ? (vacationRemaining / vacationTotal) * 100 : 0;

  const tooltipContent = `
    <div class="leave-balance-tooltip">
      <div class="tooltip-item">
        <span class="label">Vacation:</span>
        <span class="value">${balance.vacation} / ${totalCredits.vacation} days</span>
      </div>
      <div class="tooltip-item">
        <span class="label">Sick:</span>
        <span class="value">${balance.sick} / ${totalCredits.sick} days</span>
      </div>
       <div class="tooltip-item">
        <span class="label">Personal:</span>
        <span class="value">${balance.personal} / ${totalCredits.personal} days</span>
      </div>
    </div>
  `;

  useEffect(() => {
    if (cellRef.current) {
      const tooltip = new Tooltip(cellRef.current, {
        title: tooltipContent,
        html: true,
        placement: 'top',
        trigger: 'hover',
        customClass: 'leave-tooltip',
      });
      return () => tooltip.dispose();
    }
  }, [tooltipContent]);

  const getProgressBarVariant = (percentage) => {
    if (percentage > 50) return 'bg-success';
    if (percentage > 20) return 'bg-warning';
    return 'bg-danger';
  };

  return (
    <td ref={cellRef} style={{minWidth: '200px'}}>
      <div className="d-flex align-items-center">
        <div className="balance-summary me-2">
            {vacationRemaining} of {vacationTotal} Days
        </div>
        <div className="progress flex-grow-1" style={{ height: '8px' }}>
          <div
            className={`progress-bar ${getProgressBarVariant(vacationPercentage)}`}
            role="progressbar"
            style={{ width: `${vacationPercentage}%` }}
            aria-valuenow={vacationPercentage}
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
      </div>
    </td>
  );
};

export default LeaveBalanceCell;