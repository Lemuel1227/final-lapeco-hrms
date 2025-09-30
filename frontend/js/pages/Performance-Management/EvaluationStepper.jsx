import React from 'react';

const EvaluationStepper = ({ steps, currentStep }) => {
  return (
    <div className="evaluation-stepper">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className={`step-item ${currentStep === index ? 'active' : ''} ${currentStep > index ? 'completed' : ''}`}>
            <div className="step-circle">
              {currentStep > index ? <i className="bi bi-check-lg"></i> : index + 1}
            </div>
            <span className="step-label">{step}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`step-connector ${currentStep > index ? 'completed' : ''}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default EvaluationStepper;