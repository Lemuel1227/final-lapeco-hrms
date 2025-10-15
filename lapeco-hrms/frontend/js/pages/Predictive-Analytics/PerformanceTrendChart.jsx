import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

const PerformanceTrendChart = ({ employee, evaluations }) => {
  const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  
  const chartData = useMemo(() => {
    if (!evaluations || evaluations.length === 0) {
      return { labels: [], datasets: [] };
    }
    
    const sortedEvals = [...evaluations].sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd));

    return {
      labels: sortedEvals.map(ev => format(new Date(ev.periodEnd), 'MMM yyyy')),
      datasets: [
        {
          label: `${employee.name}'s Performance Score`,
          data: sortedEvals.map(ev => ev.overallScore),
          fill: true,
          backgroundColor: theme === 'dark' ? 'rgba(32, 201, 151, 0.2)' : 'rgba(25, 135, 84, 0.2)',
          borderColor: theme === 'dark' ? '#20c997' : '#198754',
          tension: 0.3,
          pointBackgroundColor: theme === 'dark' ? '#20c997' : '#198754',
          pointBorderColor: '#fff',
          pointHoverRadius: 7,
          pointRadius: 5,
        },
      ],
    };
  }, [employee, evaluations, theme]);

  const trendSummary = useMemo(() => {
    if (!evaluations || evaluations.length < 2) {
      return "Not enough data is available to determine a reliable performance trend for this period.";
    }
    const sortedEvals = [...evaluations].sort((a, b) => new Date(a.periodEnd) - new Date(b.periodEnd));
    const firstEval = sortedEvals[0];
    const lastEval = sortedEvals[sortedEvals.length - 1];
    
    let trendText = "remained stable";
    let trendClass = "text-secondary";

    if (lastEval.overallScore > firstEval.overallScore + 2) {
      trendText = "shown an improving trend";
      trendClass = "text-success";
    } else if (lastEval.overallScore < firstEval.overallScore - 2) {
      trendText = "shown a declining trend";
      trendClass = "text-danger";
    }

    return (
      <span>
        {employee.name.split(' ')[0]}'s performance has <strong className={trendClass}>{trendText}</strong>, moving from 
        <strong> {firstEval.overallScore.toFixed(1)}%</strong> to <strong>{lastEval.overallScore.toFixed(1)}%</strong> during the analyzed period.
      </span>
    );
  }, [evaluations, employee.name]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#212529' : '#ffffff',
        titleColor: theme === 'dark' ? '#f8f9fa' : '#212529',
        bodyColor: theme === 'dark' ? '#f8f9fa' : '#212529',
        borderColor: theme === 'dark' ? '#495057' : '#dee2e6',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => `Score: ${context.parsed.y.toFixed(2)}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: Math.max(0, Math.min(...(chartData.datasets[0]?.data || [0])) - 10),
        max: 100,
        ticks: { 
            color: theme === 'dark' ? '#adb5bd' : '#6c757d',
            callback: (value) => `${value}%` 
        },
        grid: { color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
      },
      x: {
        ticks: { color: theme === 'dark' ? '#adb5bd' : '#6c757d' },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="card performance-trend-card">
      <div className="card-header">
        <h6 className="mb-0">Performance Trend for {employee.name}</h6>
      </div>
      <div className="card-body">
        {evaluations.length > 1 ? (
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="text-center p-4 text-muted">
            Not enough data to display a trend. At least two evaluations are required.
          </div>
        )}
      </div>
       <div className="chart-summary">
          <p>{trendSummary}</p>
        </div>
    </div>
  );
};

export default PerformanceTrendChart;