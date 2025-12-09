import React, { useMemo, useState, useEffect } from 'react';
import Select from 'react-select';

const ProgramSelectionModal = ({ show, onClose, onSelect, programs, employee, enrollments, recommendationType = 'high_potential' }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const employeeEnrollmentIds = useMemo(() => {
    if (!employee || !enrollments) return new Set();
    return new Set(
      enrollments
        .filter(e => e.employeeId === employee.id)
        .map(e => e.programId)
    );
  }, [employee, enrollments]);

  const isPositionEligible = (program, employeePosition) => {
    if (!program.positions_allowed || program.positions_allowed.length === 0) {
      return true; // No restrictions, all positions are eligible
    }
    
    const allowedPositions = Array.isArray(program.positions_allowed) 
      ? program.positions_allowed 
      : (typeof program.positions_allowed === 'string' ? JSON.parse(program.positions_allowed || '[]') : []);
    
    return allowedPositions.includes(employeePosition);
  };

  const programOptions = useMemo(() => {
    return (programs || []).map(prog => {
      const isEligible = isPositionEligible(prog, employee?.position_id);
      const progCategory = prog.training_category || 'general';
      const matchesRecommendationType = recommendationType === 'general' || progCategory === recommendationType || progCategory === 'general';
      return {
        value: prog.id,
        label: prog.title,
        program: prog,
        isEnrolled: employeeEnrollmentIds.has(prog.id),
        isRecommended: prog.is_recommended || prog.isRecommended || false,
        isEligible: isEligible,
        matchesCategory: matchesRecommendationType
      };
    });
  }, [programs, employeeEnrollmentIds, employee?.position_id, recommendationType]);

  const recommendedOptions = useMemo(() => {
    return programOptions.filter(opt => opt.isRecommended && !opt.isEnrolled && opt.isEligible && opt.matchesCategory);
  }, [programOptions]);

  const defaultRecommendedOption = useMemo(() => {
    return recommendedOptions.length > 0 ? recommendedOptions[0] : null;
  }, [recommendedOptions]);

  useEffect(() => {
    if (show && defaultRecommendedOption) {
      setSelectedOption(defaultRecommendedOption);
    } else if (show) {
      setSelectedOption(null);
    }
  }, [show, defaultRecommendedOption]);

  const handleSelectChange = (selectedOpt) => {
    setSelectedOption(selectedOpt);
  };

  const handleConfirm = () => {
    if (selectedOption) {
      onSelect(selectedOption.program);
      setSelectedOption(null);
    }
  };
  
  const formatOptionLabel = ({ label, program, isEnrolled, isRecommended, isEligible }) => (
    <div className="d-flex justify-content-between align-items-center w-100">
      <div className="flex-grow-1">
        <div style={{ fontWeight: 500, opacity: isEligible ? 1 : 0.6 }}>
          {label}
          {isRecommended && (
            <span className="badge bg-warning text-dark ms-2">Recommended</span>
          )}
          {!isEligible && <span className="badge bg-danger ms-2">Not Eligible</span>}
        </div>
        <small className="text-muted">{program.provider}</small>
      </div>
      {isEnrolled && <span className="badge bg-success">Enrolled</span>}
    </div>
  );

  const formatSingleValue = (option) => {
    if (!option) return null;
    return (
      <div className="d-flex justify-content-between align-items-center w-100">
        <div className="flex-grow-1">
          <div style={{ fontWeight: 500, opacity: option.isEligible ? 1 : 0.6 }}>
            {option.label}
            {option.isRecommended && (
              <span className="badge bg-warning text-dark ms-2">Recommended</span>
            )}
            {!option.isEligible && <span className="badge bg-danger ms-2">Not Eligible</span>}
          </div>
          <small className="text-muted">{option.program?.provider}</small>
        </div>
      </div>
    );
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h5 className="modal-title">Select Program for {employee?.name}</h5>
              <small className="text-muted">
                {recommendationType === 'turnover_risk' && 'Retention & Skill Development Training'}
                {recommendationType === 'high_potential' && 'Development Training'}
                {recommendationType === 'general' && 'Training Program'}
              </small>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted">Choose a training program to nominate this employee for.</p>
            
            {recommendedOptions.length > 0 && (
              <div className="alert alert-info mb-3">
                <i className="bi bi-lightbulb-fill me-2"></i>
                <strong>Recommended:</strong> {recommendedOptions.length} recommended training(s) available for this employee.
              </div>
            )}

            <Select
              options={programOptions}
              value={selectedOption}
              onChange={handleSelectChange}
              formatOptionLabel={formatOptionLabel}
              formatOptionLabelMeta={(meta) => meta.context === 'value'}
              isOptionDisabled={(option) => option.isEnrolled || !option.isEligible}
              placeholder="Search for a training program..."
              className="react-select-container"
              classNamePrefix="react-select"
              menuPortalTarget={document.body}
              styles={{ 
                menuPortal: base => ({ ...base, zIndex: 1056 }),
                singleValue: (base) => ({
                  ...base,
                  display: 'flex',
                  alignItems: 'center'
                })
              }}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleConfirm}
              disabled={!selectedOption}
            >
              Select Program
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramSelectionModal;