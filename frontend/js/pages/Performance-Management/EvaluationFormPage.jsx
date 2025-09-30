import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import KraEvaluationSection from './KraEvaluationSection';
import CompetencySection from './CompetencySection';
import TextareaSection from './TextareaSection';
import EvaluationStepper from './EvaluationStepper';
import RatingScaleGuide from './RatingScaleGuide';

const EvaluationFormPage = ({ currentUser, employees, positions, kras, kpis, evaluationFactors, handlers }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { employeeId, periodStart, periodEnd } = location.state || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [factorScores, setFactorScores] = useState({});
  
  const steps = ['Competencies', 'KPIs', 'Summary & Goals'];
  const employee = useMemo(() => employees.find(e => e.id === employeeId), [employees, employeeId]);
  const position = useMemo(() => positions.find(p => p.id === employee?.positionId), [positions, employee]);

  const relevantKpis = useMemo(() => {
    if (!position) return [];
    return kpis.filter(kpi => kpi.appliesToPositionIds?.includes(position.id));
  }, [kpis, position]);

  const relevantKras = useMemo(() => {
    if (!relevantKpis.length) return [];
    const relevantKraIds = new Set(relevantKpis.map(kpi => kpi.kraId));
    return kras.filter(kra => relevantKraIds.has(kra.id));
  }, [kras, relevantKpis]);

  const ratingScaleFactors = useMemo(() => evaluationFactors.filter(f => f.type === 'rating_scale'), [evaluationFactors]);
  const textareaFactors = useMemo(() => evaluationFactors.filter(f => f.type === 'textarea'), [evaluationFactors]);

  const finalScore = useMemo(() => {
    let kpiTotalScore = 0; let kpiTotalWeight = 0;
    relevantKpis.forEach(kpi => {
      kpiTotalScore += ((factorScores[kpi.id]?.score || 0) / 5) * kpi.weight;
      kpiTotalWeight += kpi.weight;
    });
    const kpiOverall = kpiTotalWeight > 0 ? (kpiTotalScore / kpiTotalWeight) * 100 : 0;
    const allRatingItems = ratingScaleFactors.flatMap(f => f.items);
    let ratingTotalScore = 0;
    allRatingItems.forEach(item => { ratingTotalScore += factorScores[item.id]?.score || 0; });
    const ratingOverall = allRatingItems.length > 0 ? (ratingTotalScore / (allRatingItems.length * 5)) * 100 : 0;
    const score = (kpiOverall * 0.6) + (ratingOverall * 0.4);
    return score.toFixed(2);
  }, [relevantKpis, ratingScaleFactors, factorScores]);

  const handleFactorChange = (itemId, field, value) => setFactorScores(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));
  const handleCancel = () => { if (window.confirm("Are you sure you want to cancel? All progress will be lost.")) navigate(-1); };
  
  const handleSubmit = () => {
    if (Object.keys(factorScores).length === 0) {
      alert("Please fill out at least one section of the evaluation before submitting.");
      return;
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
    <div className="container-fluid p-4 page-module-container evaluation-form-page">
      <div className="evaluation-header">
        <div className="header-info">
            <h1>{employee.name}</h1>
            <p className="text-muted mb-0">{position.title} | {periodStart} to {periodEnd}</p>
        </div>
        <button className="btn btn-outline-secondary" onClick={handleCancel}>
            <i className="bi bi-x-lg me-2"></i>Cancel Evaluation
        </button>
      </div>
      
      <EvaluationStepper steps={steps} currentStep={currentStep} />
      <div className="evaluation-body">
        {currentStep === 0 && (<>
            <RatingScaleGuide />
            {ratingScaleFactors.map(factor => (
              <CompetencySection key={factor.id} category={factor.title} competencies={factor.items} scores={factorScores} onScoreChange={handleFactorChange} />
            ))}
        </>)}
        {currentStep === 1 && (
          relevantKras.length > 0 ? relevantKras.map(kra => (
            <KraEvaluationSection key={kra.id} kra={kra} kpis={relevantKpis.filter(kpi => kpi.kraId === kra.id)} scores={factorScores} onScoreChange={handleFactorChange} />
          )) : <div className="text-center p-5 bg-light rounded"><p>No KPIs are assigned to this position.</p></div>
        )}
        {currentStep === 2 && (
          textareaFactors.map(factor => (
            <TextareaSection key={factor.id} factor={factor} value={factorScores[factor.id]?.value} onValueChange={handleFactorChange} />
          ))
        )}
      </div>
      <div className="evaluation-footer">
        <div className="overall-score">Overall Score: <span>{finalScore}%</span></div>
        <div className="footer-actions">
            {currentStep > 0 && <button className="btn btn-outline-secondary" onClick={handleBack}>Previous</button>}
            {currentStep < steps.length - 1 ? 
                (<button className="btn btn-success" onClick={handleNext}>Next</button>) : 
                (<button className="btn btn-success" onClick={handleSubmit}>Submit Evaluation</button>)
            }
        </div>
      </div>
    </div>
  );
};

export default EvaluationFormPage;