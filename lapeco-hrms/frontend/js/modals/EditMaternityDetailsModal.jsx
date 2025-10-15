import React from 'react';
import { useState, useEffect } from 'react';

const MATERNITY_NORMAL_DAYS = 105;
const MATERNITY_SOLO_PARENT_BONUS = 15;
const MATERNITY_MISCARRIAGE_DAYS = 60;

const EditMaternityDetailsModal = ({ show, onClose, onSave, request }) => {
  const initialDetails = request?.maternityDetails || {};
  
  const [formData, setFormData] = useState({
    maternityType: initialDetails.type || 'normal',
    isSoloParent: initialDetails.isSoloParent || false,
    expectedDeliveryDate: initialDetails.deliveryDate || initialDetails.expectedDeliveryDate || '',
    actualDeliveryDate: initialDetails.actualDeliveryDate || '',
    allocationDays: initialDetails.allocationDays || 0,
    medicalDocumentName: initialDetails.medicalDocumentName || null,
    soloParentDocumentName: initialDetails.soloParentDocumentName || null,
  });
  
  const [calculatedDays, setCalculatedDays] = useState(request?.days || 0);
  const [calculatedEndDate, setCalculatedEndDate] = useState(request?.dateTo || '');

  useEffect(() => {
    if (request?.dateFrom) {
        const startDate = new Date(request.dateFrom + 'T00:00:00');
        if (isNaN(startDate)) return;

        let daysToAdd = 0;
        if (formData.maternityType === 'normal' || formData.maternityType === 'prenatal') {
            daysToAdd = MATERNITY_NORMAL_DAYS;
            if (formData.isSoloParent) {
                daysToAdd += MATERNITY_SOLO_PARENT_BONUS;
            }
            if (formData.allocationDays > 0) {
                daysToAdd -= formData.allocationDays;
            }
        } else if (formData.maternityType === 'miscarriage') {
            daysToAdd = MATERNITY_MISCARRIAGE_DAYS;
        }

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + daysToAdd - 1);
        
        setCalculatedDays(daysToAdd);
        setCalculatedEndDate(endDate.toISOString().split('T')[0]);
    }
  }, [formData.maternityType, formData.isSoloParent, formData.allocationDays, request?.dateFrom]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedDetails = {
        ...request.maternityDetails,
        type: formData.maternityType,
        isSoloParent: formData.isSoloParent,
        actualDeliveryDate: formData.actualDeliveryDate,
        allocationDays: formData.maternityType === 'miscarriage' ? 0 : formData.allocationDays,
    };
    onSave(request.leaveId, updatedDetails, calculatedDays, calculatedEndDate);
    onClose();
  };
  
  const handleAllocationChange = (e) => {
      let value = parseInt(e.target.value, 10) || 0;
      if (value < 0) value = 0;
      if (value > 7) value = 7;
      setFormData({...formData, allocationDays: value});
  };

  if (!show || !request) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Maternity Details for {request.name}</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Confirm the final details of this maternity leave. This will update the leave duration and dates if changes are made.</p>
              
              <div className="mb-3">
                <label className="form-label fw-bold">Final Application Type*</label>
                <div>
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="maternityType" id="finalMaternityNormal" value="normal" checked={formData.maternityType === 'normal' || formData.maternityType === 'prenatal'} onChange={(e) => setFormData({...formData, maternityType: e.target.value})} />
                    <label className="form-check-label" htmlFor="finalMaternityNormal">Normal Delivery / C-Section</label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" name="maternityType" id="finalMaternityMiscarriage" value="miscarriage" checked={formData.maternityType === 'miscarriage'} onChange={(e) => setFormData({...formData, maternityType: e.target.value})} />
                    <label className="form-check-label" htmlFor="finalMaternityMiscarriage">Miscarriage / Emergency</label>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="actualDeliveryDate" className="form-label fw-bold">Actual Date of Delivery</label>
                <input type="date" className="form-control" id="actualDeliveryDate" value={formData.actualDeliveryDate} onChange={(e) => setFormData({...formData, actualDeliveryDate: e.target.value})} />
              </div>
              
              <div className="form-check mb-3">
                <input className="form-check-input" type="checkbox" id="finalIsSoloParent" checked={formData.isSoloParent} onChange={(e) => setFormData({...formData, isSoloParent: e.target.checked})} />
                <label className="form-check-label" htmlFor="finalIsSoloParent">Confirm as qualified Solo Parent</label>
              </div>

              {(formData.maternityType === 'normal' || formData.maternityType === 'prenatal') && (
                 <div className="mb-3">
                    <label htmlFor="allocationDays" className="form-label fw-bold">Days Allocated to Partner (Max 7)</label>
                    <input type="number" className="form-control" id="allocationDays" value={formData.allocationDays} onChange={handleAllocationChange} min="0" max="7" />
                 </div>
              )}

              <div className="alert alert-warning">
                <h6>Recalculated Leave</h6>
                <p className="mb-0">Based on your selections, the leave will be updated to:</p>
                <ul>
                    <li><strong>Total Duration:</strong> {calculatedDays} days</li>
                    <li><strong>New End Date:</strong> {calculatedEndDate}</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save and Update Leave</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditMaternityDetailsModal;