import React, { useMemo } from 'react';

const RecommendationItem = ({ icon, title, children }) => (
  <div className="recommendation-item">
    <div className="recommendation-icon">
      <i className={`bi ${icon}`}></i>
    </div>
    <div className="recommendation-text">
      <h6 className="recommendation-title">{title}</h6>
      <p className="recommendation-description">{children}</p>
    </div>
  </div>
);

const DashboardRecommendations = ({ data, positions }) => {

  const recommendations = useMemo(() => {
    const recs = [];
    if (!data || data.length === 0) return recs;

    const totalCount = data.length;
    const riskCount = data.filter(e => e.isTurnoverRisk).length;
    const potentialCount = data.filter(e => e.isHighPotential).length;
    const riskPercentage = totalCount > 0 ? (riskCount / totalCount) * 100 : 0;

    // Recommendation 1: High Overall Turnover Risk
    if (riskPercentage >= 25) {
      recs.push({
        priority: 1,
        component: (
          <RecommendationItem key="high-risk" icon="bi-shield-exclamation" title="Address High Overall Turnover Risk">
            With <strong>{riskPercentage.toFixed(0)}%</strong> of the filtered employees identified as turnover risks, consider company-wide initiatives like employee engagement surveys or a review of compensation and benefits.
          </RecommendationItem>
        )
      });
    }

    // Recommendation 2: Investigate High-Risk Positions
    const positionRisk = new Map();
    data.forEach(emp => {
      if (!positionRisk.has(emp.positionTitle)) {
        positionRisk.set(emp.positionTitle, { totalRisk: 0, count: 0 });
      }
      const pos = positionRisk.get(emp.positionTitle);
      pos.totalRisk += emp.riskScore;
      pos.count++;
    });

    const avgRisks = Array.from(positionRisk.entries()).map(([position, { totalRisk, count }]) => ({
      position,
      avgRisk: totalRisk / count,
    })).sort((a, b) => b.avgRisk - a.avgRisk);
    
    if (avgRisks.length > 0 && avgRisks[0].avgRisk > 50) {
      const highestRiskPos = avgRisks[0];
       recs.push({
        priority: 2,
        component: (
          <RecommendationItem key="pos-risk" icon="bi-diagram-3-fill" title={`Investigate the ${highestRiskPos.position} Role`}>
            This position shows the highest average risk score (<strong>{highestRiskPos.avgRisk.toFixed(1)}</strong>). Conduct focus groups or interviews with these employees to identify role-specific issues.
          </RecommendationItem>
        )
      });
    }

    // Recommendation 3: Retain High-Performing, High-Risk Talent
    const highPerfHighRiskCount = data.filter(e => e.latestScore >= 85 && e.riskScore >= 60).length;
    if (highPerfHighRiskCount > 0) {
       recs.push({
        priority: 3,
        component: (
          <RecommendationItem key="retain-talent" icon="bi-gem" title="Engage At-Risk Key Talent">
            There are <strong>{highPerfHighRiskCount}</strong> high-performing employee(s) who are also flagged as turnover risks. Schedule immediate 1-on-1 meetings to address their concerns and discuss career paths.
          </RecommendationItem>
        )
      });
    }
    
    // Recommendation 4: Nurture High Potentials
    if (potentialCount > 0 && riskPercentage < 25) {
       recs.push({
        priority: 4,
        component: (
          <RecommendationItem key="nurture-talent" icon="bi-mortarboard-fill" title="Develop High-Potential Employees">
            You have <strong>{potentialCount}</strong> high-potential employee(s). Consider creating personalized development plans or assigning mentors to foster their growth and ensure long-term retention.
          </RecommendationItem>
        )
      });
    }

    return recs.sort((a,b) => a.priority - b.priority).map(r => r.component);

  }, [data]);

  return (
    <div className="card dashboard-chart-card recommendations-card">
      <div className="card-header">
        <h6><i className="bi bi-lightbulb-fill me-2"></i>Recommendations</h6>
      </div>
      <div className="card-body">
        {recommendations.length > 0 ? (
          recommendations
        ) : (
          <p className="text-muted m-0">No specific recommendations generated for the current data set. The workforce appears to be stable.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardRecommendations;