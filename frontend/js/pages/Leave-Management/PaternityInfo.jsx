// src/components/pages/Leave-Management/PaternityInfo.jsx (NEW FILE)

import React, { useRef, useEffect } from 'react';
import { Tooltip } from 'bootstrap';

const PaternityInfo = ({ details }) => {
  const iconRef = useRef(null);

  const tooltipContent = `
    <div class="paternity-info-tooltip">
      <div class="tooltip-item">
        <span class="label">Child's DOB/Event Date:</span>
        <span class="value">${details.childsDob || 'N/A'}</span>
      </div>
      <div class="tooltip-item">
        <span class="label">Eligibility Confirmed:</span>
        <span class="value">${details.isEligiblePaternity ? 'Yes' : 'No'}</span>
      </div>
      ${(details.marriageCertName || details.birthCertName) ? '<hr class="my-1"/>' : ''}
      ${details.marriageCertName ? `
      <div class="tooltip-item">
        <span class="label">Marriage Cert:</span>
        <span class="value">${details.marriageCertName}</span>
      </div>` : ''}
      ${details.birthCertName ? `
      <div class="tooltip-item">
        <span class="label">Birth/Med Cert:</span>
        <span class="value">${details.birthCertName}</span>
      </div>` : ''}
    </div>
  `;

  useEffect(() => {
    let tooltipInstance;
    if (iconRef.current) {
      tooltipInstance = new Tooltip(iconRef.current, {
        title: tooltipContent,
        html: true,
        placement: 'right',
        trigger: 'hover',
        customClass: 'paternity-tooltip',
      });
    }
    return () => {
      if (tooltipInstance) {
        tooltipInstance.dispose();
      }
    };
  }, [tooltipContent]);

  return (
    <i 
      ref={iconRef} 
      className="bi bi-gender-male paternity-info-icon ms-2"
      data-bs-toggle="tooltip"
    ></i>
  );
};

export default PaternityInfo;