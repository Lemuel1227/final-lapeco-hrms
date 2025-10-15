export const generatePerformanceSummaryReport = async (layoutManager, dataSources, params) => {
  const { evaluations, employees, positions } = dataSources;
  const { startDate, endDate } = params;
  const { doc, margin } = layoutManager;

  // --- 1. DATA PREPARATION ---
  const filteredEvals = (evaluations || []).filter(ev => {
    const evalDate = new Date(ev.periodEnd);
    return evalDate >= new Date(startDate) && evalDate <= new Date(endDate);
  });

  if (filteredEvals.length === 0) {
    doc.text("No performance evaluations were found for the selected period.", margin, layoutManager.y);
    return;
  }

  const brackets = { 'Needs Improvement (<70%)': 0, 'Meets Expectations (70-90%)': 0, 'Outstanding (>90%)': 0 };
  let totalScore = 0;
  filteredEvals.forEach(ev => {
    totalScore += ev.overallScore;
    if (ev.overallScore < 70) brackets['Needs Improvement (<70%)']++;
    else if (ev.overallScore < 90) brackets['Meets Expectations (70-90%)']++;
    else brackets['Outstanding (>90%)']++;
  });
  
  const avgScore = totalScore / filteredEvals.length;

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'bar',
    data: {
      labels: Object.keys(brackets),
      datasets: [{
        label: 'Number of Employees',
        data: Object.values(brackets),
        backgroundColor: ['#dc3545', '#ffc107', '#198754']
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  };

  // --- 3. SUMMARY TEXT ---
  const summaryText = `During the period from ${startDate} to ${endDate}, a total of ${filteredEvals.length} performance evaluations were completed. The average score across all evaluations was ${avgScore.toFixed(2)}%. Of these, ${brackets['Outstanding (>90%)']} employee(s) were rated as 'Outstanding', while ${brackets['Needs Improvement (<70%)']} were identified as needing improvement.`;

  // --- 4. TABLE DATA ---
  const employeeMap = new Map(employees.map(e => [e.id, e]));
  const positionMap = new Map(positions.map(p => [p.id, p.title]));
  const tableHead = ['Employee', 'Position', 'Evaluator', 'Evaluation Date', 'Score'];
  const tableBody = filteredEvals.map(ev => {
    const emp = employeeMap.get(ev.employeeId);
    const evaluator = employeeMap.get(ev.evaluatorId);
    return [
      emp?.name || ev.employeeId,
      positionMap.get(emp?.positionId) || 'N/A',
      evaluator?.name || ev.evaluatorId,
      ev.periodEnd,
      `${ev.overallScore.toFixed(2)}%`
    ];
  });

  // --- 5. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle(`Performance Distribution (${startDate} to ${endDate})`, chartConfig);
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Detailed Evaluation Results");
  layoutManager.addTable([tableHead], tableBody, {
    columnStyles: { 4: { halign: 'left' } }
  });
};