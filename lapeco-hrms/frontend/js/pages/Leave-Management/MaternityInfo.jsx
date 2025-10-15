import React, { useRef, useEffect } from 'react';
import { Tooltip } from 'bootstrap';

const MaternityInfo = ({ details }) => {
  const iconRef = useRef(null);

  const tooltipContent = `
    <div class="maternity-info-tooltip">
      <div class="tooltip-item">
        <span class="label">Application Type:</span>
        <span class="value">${details.type === 'normal' ? 'Normal / CS' : details.type === 'prenatal' ? 'Prenatal' : 'Miscarriage'}</span>
      </div>
      <div class="tooltip-item">
        <span class="label">Expected Delivery:</span>
        <span class="value">${details.deliveryDate || details.expectedDeliveryDate}</span>
      </div>
      ${details.actualDeliveryDate ? `
      <div class="tooltip-item">
        <span class="label">Actual Delivery:</span>
        <span class="value">${details.actualDeliveryDate}</span>
      </div>` : ''}
      ${details.isSoloParent ? `
      <div class="tooltip-item">
        <span class="label">Solo Parent:</span>
        <span class="value">Yes</span>
      </div>` : ''}
      ${details.allocationDays > 0 ? `
      <div class="tooltip-item">
        <span class="label">Allocated Leave:</span>
        <span class="value">${details.allocationDays} days</span>
      </div>` : ''}
      <hr class="my-1"/>
      ${details.medicalDocumentName ? `
      <div class="tooltip-item">
        <span class="label">Medical Cert:</span>
        <span class="value">${details.medicalDocumentName}</span>
      </div>` : ''}
       ${details.soloParentDocumentName ? `
      <div class="tooltip-item">
        <span class="label">Solo Parent ID:</span>
        <span class="value">${details.soloParentDocumentName}</span>
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
        customClass: 'maternity-tooltip',
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
      className="bi bi-gender-female maternity-info-icon ms-2"
      data-bs-toggle="tooltip"
    ></i>
  );
};

export default MaternityInfo;