export const generateRecruitmentActivityReport = async (layoutManager, dataSources, params) => {
  const { applicants, jobOpenings } = dataSources;
  const { startDate, endDate } = params;
  const { doc, margin } = layoutManager;

  // --- 1. DATA PREPARATION ---
  const dateRangeText = startDate && endDate ? `from ${startDate} to ${endDate}` : 'for all time';

  // Normalize records for consistency (legacy field names and statuses)
  const normalizeStatus = (s = '') => {
    if (!s) return 'New Applicant';
    const t = String(s).trim();
    return t === 'Offer' ? 'Interview' : t;
  };

  const normalizeDate = (app) => app.applicationDate || app.application_date || app.applied_at || null;
  const normalizeName = (app) => app.name || app.full_name || [app.first_name, app.middle_name, app.last_name].filter(Boolean).join(' ');
  const normalizeJobOpeningId = (app) => app.jobOpeningId || app.job_opening_id || app.job_openingId || null;

  let filteredApps = [...(applicants || [])].map(app => ({
    ...app,
    status: normalizeStatus(app.status),
    applicationDate: normalizeDate(app),
    name: normalizeName(app),
    jobOpeningId: normalizeJobOpeningId(app)
  }));
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

  const PIPELINE_ORDER = ['New Applicant', 'Interview', 'Hired', 'Rejected'];
  const statusCounts = filteredApps.reduce((acc, app) => {
    const s = PIPELINE_ORDER.includes(app.status) ? app.status : 'New Applicant';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const hiredCount = statusCounts['Hired'] || 0;
  const rejectedCount = statusCounts['Rejected'] || 0;

  // --- 2. CHART CONFIGURATION ---
  const COLORS = {
    'New Applicant': '#0d6efd',
    'Interview': '#0dcaf0',
    'Hired': '#198754',
    'Rejected': '#dc3545'
  };

  const orderedLabels = PIPELINE_ORDER.filter(l => statusCounts[l] > 0);
  const chartConfig = {
    type: 'bar',
    data: {
      labels: orderedLabels,
      datasets: [{
        label: 'Number of Applicants',
        data: orderedLabels.map(l => statusCounts[l]),
        backgroundColor: orderedLabels.map(l => COLORS[l] || '#6c757d')
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
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) {
        // Fallback: if not a valid date, try to trim ISO
        return String(dateStr).split('T')[0];
      }
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return String(dateStr);
    }
  };
  const tableHead = ["Applicant Name", "Applied For", "Application Date", "Status"];
  const tableBody = filteredApps.map(app => [
    app.name,
    jobOpeningsMap.get(app.jobOpeningId) || 'N/A',
    formatDisplayDate(app.applicationDate),
    app.status
  ]);
  
  // --- 5. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle(`Applicant Status Distribution`, chartConfig);
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Detailed Applicant List");
  layoutManager.addTable([tableHead], tableBody);
};