export const generatePerformanceSummaryReport = async (layoutManager, dataSources, params) => {
  const { evaluations, employees, positions, evaluationPeriods } = dataSources;
  const { periodId } = params;
  const { doc, margin } = layoutManager;

  // --- 1. DATA PREPARATION ---
  let filteredEvals = evaluations || [];
  let periodName = 'All Time';
  let periodStartDate = null;
  let periodEndDate = null;

  // Filter evaluations by selected period
  if (periodId && periodId !== 'all') {
    const selectedPeriod = evaluationPeriods?.find(p => p.id === parseInt(periodId));
    if (selectedPeriod) {
      periodName = selectedPeriod.name;
      periodStartDate = new Date(selectedPeriod.evaluationStart);
      periodEndDate = new Date(selectedPeriod.evaluationEnd);
      
      // Filter evaluations that fall within the period
      filteredEvals = evaluations.filter(ev => {
        const evalDate = new Date(ev.periodEnd || ev.evaluationDate || ev.created_at);
        return evalDate >= periodStartDate && evalDate <= periodEndDate;
      });
    }
  }

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
  const periodText = periodId === 'all' ? 'all time' : `the "${periodName}" evaluation period`;
  const summaryText = `During ${periodText}, a total of ${filteredEvals.length} performance evaluations were completed. The average score across all evaluations was ${avgScore.toFixed(2)}%. Of these, ${brackets['Outstanding (>90%)']} employee(s) were rated as 'Outstanding', while ${brackets['Needs Improvement (<70%)']} were identified as needing improvement.`;

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
  const reportTitle = periodId === 'all' ? 'Overall Performance Distribution' : `Performance Distribution - ${periodName}`;
  await layoutManager.addChartWithTitle(reportTitle, chartConfig);
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Detailed Evaluation Results");
  layoutManager.addTable([tableHead], tableBody, {
    columnStyles: { 4: { halign: 'left' } }
  });
};