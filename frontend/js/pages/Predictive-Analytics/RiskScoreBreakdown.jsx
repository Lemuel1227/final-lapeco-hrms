import React, { useMemo } from 'react';
import { RiskFactorRow } from './RiskFactorRow';

const RiskScoreBreakdown = ({ employee }) => {
  if (!employee || !employee.riskFactors) return null;

  const { riskFactors, riskScore } = employee;

  const riskSummary = useMemo(() => {
    const perfScore = riskFactors.performance.score;
    const attScore = riskFactors.attendance.score;

    if (riskScore >= 60) {
      if (perfScore > 60 && attScore > 60) {
        return "Both poor performance and attendance issues are contributing to a high turnover risk.";
      }
      if (perfScore > attScore) {
        return "Poor performance is the primary driver of this employee's high turnover risk.";
      }
      return "Attendance issues are the primary driver of this employee's high turnover risk.";
    }
    if (riskScore >= 30) {
      if (perfScore > 35) {
        return "Slight performance concerns are elevating the employee's risk score to a medium level.";
      }
      if (attScore > 35) {
        return "Some attendance issues are elevating the employee's risk score to a medium level.";
      }
      return "Several factors are contributing to a medium turnover risk. Monitor for further changes.";
    }
    return "This employee currently shows a low turnover risk with stable performance and attendance.";
  }, [riskFactors, riskScore]);

  return (
    <div className="card risk-breakdown-card">
      <div className="card-header">
        <h6 className="mb-0"><i className="bi bi-clipboard-data-fill me-2"></i>Risk Factors</h6>
      </div>
      <div className="card-body">
        <RiskFactorRow
          label="Performance"
          score={riskFactors.performance.score}
          weight={riskFactors.performance.weight * 100}
          valueText={`Latest Score: ${riskFactors.performance.value}`}
          scoreOutOf100={`${riskFactors.performance.score.toFixed(0)}/100`}
          isNegative
        />
        <RiskFactorRow
          label="Attendance"
          score={riskFactors.attendance.score}
          weight={riskFactors.attendance.weight * 100}
          valueText={riskFactors.attendance.value}
          scoreOutOf100={`${riskFactors.attendance.score.toFixed(0)}/100`}
          isNegative
        />
      </div>
      <div className="chart-summary">
        <p>{riskSummary}</p>
      </div>
    </div>
  );
};

export default RiskScoreBreakdown;