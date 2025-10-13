import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import RatingScaleRow from './RatingScaleRow';
import TextareaSection from './TextareaSection';
import RatingScaleGuide from './RatingScaleGuide';
import ConfirmationModal from '../../modals/ConfirmationModal';
import './EvaluationPages.css';

const EvaluationFormPage = ({ currentUser, employees, positions, evaluationFactors, handlers }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { employeeId, periodStart, periodEnd } = location.state || {};

  const [factorScores, setFactorScores] = useState({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const employee = useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
  const position = useMemo(() => positions.find(p => p.id === employee?.positionId), [positions, employee]);

  const evaluationCriteria = useMemo(() => evaluationFactors.filter(f => f.type === 'criterion'), [evaluationFactors]);
  const textareaFactors = useMemo(() => evaluationFactors.filter(f => f.type === 'textarea'), [evaluationFactors]);
  const allRateableItems = useMemo(() => evaluationCriteria.flatMap(c => c.items), [evaluationCriteria]);

  const finalScore = useMemo(() => {
    let totalScore = 0;
    let scoredItems = 0;
    
    allRateableItems.forEach(item => {
      const score = factorScores[item.id]?.score;
      if (score !== undefined && score > 0) {
        totalScore += score;
        scoredItems++;
      }
    });
    
    if (scoredItems === 0) return '0.00';
    
    const averageOutOf5 = totalScore / scoredItems;
    const percentage = (averageOutOf5 / 5) * 100;

    return percentage.toFixed(2);
  }, [factorScores, allRateableItems]);

  const handleFactorChange = (itemId, field, value) => {
    setFactorScores(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    navigate(-1);
    setShowCancelConfirm(false);
  };

  const handleSubmit = () => {
    const ratedItemCount = allRateableItems.filter(item => factorScores[item.id]?.score > 0).length;
    if (ratedItemCount < allRateableItems.length) {
      if (!window.confirm(`You have not rated all ${allRateableItems.length} criteria. Are you sure you want to submit?`)) {
        return;
      }
    }
    
    handlers.saveEvaluation({
      employeeId,
      evaluatorId: currentUser.id,
      periodStart, periodEnd, status: 'Completed',
      factorScores: factorScores,
      overallScore: parseFloat(finalScore),
    });
    alert(`Evaluation for ${employee.name} submitted successfully!`);
    navigate('/dashboard/performance');
  };

  if (!employee || !position) {
    return (
      <div className="container-fluid p-4 text-center">
        <h2>Invalid Evaluation Data</h2> <p>Employee or evaluation period not specified.</p>
        <Link to="/dashboard/performance" className="btn btn-primary">Go Back</Link>
      </div>
    );
  }

  return (
    <>
      <div className="container-fluid p-0 page-module-container evaluation-form-page">
        <div className="evaluation-header">
          <div className="header-info">
            <h1>{employee.name}</h1>
            <p className="text-muted mb-0">{position.title} | {periodStart} to {periodEnd}</p>
          </div>
          <button className="btn btn-outline-secondary" onClick={handleCancel}>
            <i className="bi bi-x-lg me-2"></i>Cancel Evaluation
          </button>
        </div>
        
        <div className="evaluation-body">
          <RatingScaleGuide />
          {evaluationCriteria.map(criterion => (
            <div className="card" key={criterion.id}>
              <div className="card-header">
                <h5 className="mb-0">{criterion.title}</h5>
              </div>
              <div className="card-body p-0">
                {criterion.items.map(item => (
                  <RatingScaleRow
                    key={item.id}
                    factor={item}
                    scoreData={factorScores[item.id]}
                    onScoreChange={handleFactorChange}
                  />
                ))}
              </div>
            </div>
          ))}
          {textareaFactors.map(factor => (
            <TextareaSection
              key={factor.id}
              factor={factor}
              value={factorScores[factor.id]?.value}
              onValueChange={handleFactorChange}
            />
          ))}
        </div>

        <div className="evaluation-footer">
          <div className="overall-score">Overall Score: <span>{finalScore}%</span></div>
          <div className="footer-actions">
            <button className="btn btn-success" onClick={handleSubmit}>Submit Evaluation</button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        show={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmCancel}
        title="Confirm Cancellation"
        confirmText="Yes, Discard Changes"
        confirmVariant="danger"
      >
        <p>Are you sure you want to cancel this evaluation?</p>
        <p className="fw-bold">All unsaved progress will be lost.</p>
      </ConfirmationModal>
    </>
  );
};

export default EvaluationFormPage;