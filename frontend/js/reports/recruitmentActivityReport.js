import autoTable from 'jspdf-autotable';

export const generateRecruitmentActivityReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { applicants, jobOpenings } = dataSources;
  const { startDate, endDate, margin } = params;

  // --- MODIFIED LOGIC ---
  // Start with all applicants, then filter ONLY if dates are provided.
  let filteredApps = [...(applicants || [])];
  if (startDate && endDate) {
    filteredApps = filteredApps.filter(app => {
      const appDate = new Date(app.application_date);
      return appDate >= new Date(startDate) && appDate <= new Date(endDate);
    });
  }

  if (filteredApps.length === 0) {
    doc.text("No recruitment activity was found for the selected period.", margin, params.startY);
    return doc;
  }
  
  const dateRangeText = startDate && endDate ? `${startDate} to ${endDate}` : 'All Time';

  // Aggregate data for the chart
  const statusCounts = filteredApps.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  // Configure and add the chart to the PDF
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
  let finalY = await addChartAndTitle(`Applicant Status Distribution (${dateRangeText})`, chartConfig);

  // Prepare data for the main table
  const jobOpeningsMap = new Map((jobOpenings || []).map(j => [j.id, j.title]));
  const tableColumns = ["Applicant Name", "Applied For", "Application Date", "Status"];
  const tableRows = filteredApps.map(app => [
    app.name,
    jobOpeningsMap.get(app.jobOpeningId) || 'N/A',
    app.application_date,
    app.status
  ]);

  // Add the table to the PDF
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: finalY,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84] }
  });

  return doc;
};