import React, { useMemo } from 'react';
import { Doughnut, Scatter, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title } from 'chart.js';
import DashboardRecommendations from './DashboardRecommendations';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title);

const PredictiveAnalyticsDashboard = ({ data, positions = [], theme }) => {

  const chartTextColor = theme === 'dark' ? '#adb5bd' : '#6c757d';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  const classificationCounts = useMemo(() => {
    return data.reduce((acc, emp) => {
        if (emp.isHighPotential) acc['High Potential']++;
        else if (emp.isTurnoverRisk) acc['Turnover Risk']++;
        else acc['Meets Expectations']++;
        return acc;
    }, { 'High Potential': 0, 'Turnover Risk': 0, 'Meets Expectations': 0 });
  }, [data]);

  const classificationData = useMemo(() => {
    return {
      labels: Object.keys(classificationCounts),
      datasets: [{
        data: Object.values(classificationCounts),
        backgroundColor: ['#198754', '#dc3545', '#6c757d'],
        borderColor: theme === 'dark' ? '#2c3136' : '#ffffff',
        borderWidth: 4,
      }]
    };
  }, [classificationCounts, theme]);

  const scatterData = useMemo(() => {
    const getPointBackgroundColor = (emp) => {
      if (emp.isHighPotential) return 'rgba(25, 135, 84, 0.7)';
      if (emp.isTurnoverRisk) return 'rgba(220, 53, 69, 0.7)';
      return 'rgba(108, 117, 125, 0.5)';
    };
    return {
      datasets: [{
        label: 'Employees',
        data: data.map(emp => ({
          x: emp.latestScore,
          y: emp.riskScore,
          label: emp.name,
        })),
        backgroundColor: data.map(getPointBackgroundColor),
        pointRadius: 6,
        pointHoverRadius: 8,
      }]
    };
  }, [data]);
  
  const riskByPositionData = useMemo(() => {
    const positionMap = new Map();
    data.forEach(emp => {
      if (!positionMap.has(emp.positionTitle)) {
        positionMap.set(emp.positionTitle, { totalRisk: 0, count: 0 });
      }
      const current = positionMap.get(emp.positionTitle);
      current.totalRisk += emp.riskScore;
      current.count++;
    });
    
    const aggregatedData = [];
    positionMap.forEach((value, key) => {
      if (value.count > 0) {
        aggregatedData.push({ position: key, avgRisk: value.totalRisk / value.count });
      }
    });

    aggregatedData.sort((a, b) => b.avgRisk - a.avgRisk);

    return {
      labels: aggregatedData.map(d => d.position),
      datasets: [{
        label: 'Average Risk Score',
        data: aggregatedData.map(d => d.avgRisk),
        backgroundColor: 'rgba(13, 202, 240, 0.6)',
        borderColor: 'rgba(13, 202, 240, 1)',
        borderWidth: 1,
      }]
    };
  }, [data]);

  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: chartTextColor } },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#212529' : '#ffffff',
        titleColor: theme === 'dark' ? '#f8f9fa' : '#212529',
        bodyColor: theme === 'dark' ? '#f8f9fa' : '#212529',
        borderColor: theme === 'dark' ? '#495057' : '#dee2e6',
        borderWidth: 1,
      }
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center p-5 bg-light rounded">
        <h5 className="text-muted">No Data for Dashboard</h5>
        <p className="text-muted">There is no employee data matching your current filters. Please adjust your filters to see the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard-grid">
      <div className="card dashboard-chart-card">
        <div className="card-header"><h6>Classification Distribution</h6></div>
        <div className="card-body"><Doughnut data={classificationData} options={{...baseChartOptions, plugins: {...baseChartOptions.plugins, legend: { position: 'right', labels: {color: chartTextColor}}}}} /></div>
        <div className="chart-summary">
          <p>
            This chart shows the workforce's overall health. Currently, 
            <strong> {classificationCounts['Turnover Risk']}</strong> employee(s) are identified as turnover risks, requiring attention.
            Conversely, <strong>{classificationCounts['High Potential']}</strong> employee(s) are marked as high-potentials, indicating key talent to nurture.
          </p>
        </div>
      </div>
      <div className="card dashboard-chart-card">
        <div className="card-header"><h6>Performance vs. Turnover Risk</h6></div>
        <div className="card-body">
          <Scatter data={scatterData} options={{...baseChartOptions, scales: {
            y: { title: { display: true, text: 'Turnover Risk Score', color: chartTextColor }, min: 0, max: 100, ticks: { color: chartTextColor }, grid: { color: gridColor } },
            x: { title: { display: true, text: 'Performance Score (%)', color: chartTextColor }, min: 0, max: 100, ticks: { color: chartTextColor }, grid: { color: gridColor } }
          }, plugins: { ...baseChartOptions.plugins, legend: { display: false }, tooltip: {...baseChartOptions.plugins.tooltip, callbacks: { label: (c) => `${c.raw.label}: (${c.raw.x.toFixed(1)}%, ${c.raw.y.toFixed(1)})` }} }}} />
        </div>
        <div className="chart-summary">
          <p>
            This scatter plot maps employees based on their performance and risk scores.
            Focus on the <strong>top-right quadrant</strong> (High Performance, High Risk) for key talent who may be disengaged,
            and the <strong>top-left quadrant</strong> (Low Performance, High Risk) for individuals needing urgent intervention.
          </p>
        </div>
      </div>
      
      <DashboardRecommendations data={data} positions={positions} />

      <div className="card dashboard-chart-card">
        <div className="card-header"><h6>Average Risk Score by Position</h6></div>
        <div className="card-body">
            <Bar data={riskByPositionData} options={{...baseChartOptions, indexAxis: 'y', scales: {
                y: { ticks: { color: chartTextColor }, grid: { display: false } },
                x: { ticks: { color: chartTextColor, min: 0, max: 100 }, grid: { color: gridColor } }
            }, plugins: {...baseChartOptions.plugins, legend: { display: false }}}} />
        </div>
        <div className="chart-summary">
          <p>
            This chart highlights potential systemic issues within specific roles. The 
            <strong> {riskByPositionData.labels[0] || 'N/A'}</strong> position currently has the highest average turnover risk.
            Investigating factors like workload, management, or compensation for this role may reveal underlying problems.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalyticsDashboard;