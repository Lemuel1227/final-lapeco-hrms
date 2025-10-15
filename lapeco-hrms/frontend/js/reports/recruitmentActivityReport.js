export const generateRecruitmentActivityReport = async (layoutManager, dataSources, params) => {
  const { applicants, jobOpenings } = dataSources;
  const { startDate, endDate } = params;
  const { doc, margin } = layoutManager;

  // --- 1. DATA PREPARATION ---
  const dateRangeText = startDate && endDate ? `from ${startDate} to ${endDate}` : 'for all time';

  let filteredApps = [...(applicants || [])];
  if (startDate && endDate) {
    filteredApps = filteredApps.filter(app => {
      const appDate = new Date(app.applicationDate);
      return appDate >= new Date(startDate) && appDate <= new Date(endDate);
    });
  }

  if (filteredApps.length === 0) {
    doc.text(`No recruitment activity was found ${dateRangeText}.`, margin, layoutManager.y);
    return;
  }

  const statusCounts = filteredApps.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const hiredCount = statusCounts['Hired'] || 0;
  const rejectedCount = statusCounts['Rejected'] || 0;

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'bar',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        label: 'Number of Applicants',
        data: Object.values(statusCounts),
        backgroundColor: ['#0d6efd', '#6c757d', '#0dcaf0', '#ffc107', '#198754', '#dc3545']
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  };
  
  // --- 3. SUMMARY TEXT ---
  const summaryText = `This report summarizes ${filteredApps.length} applicant activities recorded ${dateRangeText}. During this period, ${hiredCount} applicant(s) were successfully hired, and ${rejectedCount} were rejected. The chart above provides a visual breakdown of all applicants by their current status in the hiring pipeline.`;

  // --- 4. TABLE DATA ---
  const jobOpeningsMap = new Map((jobOpenings || []).map(j => [j.id, j.title]));
  const tableHead = ["Applicant Name", "Applied For", "Application Date", "Status"];
  const tableBody = filteredApps.map(app => [
    app.name,
    jobOpeningsMap.get(app.jobOpeningId) || 'N/A',
    app.applicationDate,
    app.status
  ]);
  
  // --- 5. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle(`Applicant Status Distribution`, chartConfig);
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Detailed Applicant List");
  layoutManager.addTable([tableHead], tableBody);
};