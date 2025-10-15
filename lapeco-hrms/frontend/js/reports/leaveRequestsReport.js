export const generateLeaveRequestsReport = async (layoutManager, dataSources, params) => {
  const { leaveRequests } = dataSources;
  const { startDate, endDate } = params;
  const { doc, margin } = layoutManager;

  // --- 1. DATA PREPARATION ---
  const filteredRequests = (leaveRequests || []).filter(req => {
    const reqDate = new Date(req.dateFrom);
    return reqDate >= new Date(startDate) && reqDate <= new Date(endDate);
  });

  if (filteredRequests.length === 0) {
    doc.text("No leave requests were found for the selected period.", margin, layoutManager.y);
    return;
  }

  const leaveTypeCounts = filteredRequests.reduce((acc, req) => {
    acc[req.leaveType] = (acc[req.leaveType] || 0) + 1;
    return acc;
  }, {});

  const mostFrequentLeave = Object.entries(leaveTypeCounts).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

  // --- 2. CHART CONFIGURATION ---
  const chartConfig = {
    type: 'pie',
    data: {
      labels: Object.keys(leaveTypeCounts),
      datasets: [{
        data: Object.values(leaveTypeCounts),
        backgroundColor: ['#0d6efd', '#dc3545', '#ffc107', '#0dcaf0', '#6c757d', '#e83e8c', '#6f42c1'],
      }]
    },
    options: { plugins: { legend: { position: 'right' } } }
  };

  // --- 3. SUMMARY TEXT ---
  const summaryText = `This report summarizes ${filteredRequests.length} leave requests filed between ${startDate} and ${endDate}. The most frequent leave type during this period was '${mostFrequentLeave[0]}', with ${mostFrequentLeave[1]} request(s). The chart above provides a full breakdown by leave type.`;

  // --- 4. TABLE DATA ---
  const tableHead = ["ID", "Name", "Position", "Leave Type", "Date Range", "Days", "Status"];
  const tableBody = filteredRequests.map(req => [
    req.empId, req.name, req.position, req.leaveType,
    `${req.dateFrom} to ${req.dateTo}`, req.days, req.status
  ]);

  // --- 5. PDF ASSEMBLY ---
  await layoutManager.addChartWithTitle(`Leave Breakdown (${startDate} to ${endDate})`, chartConfig, { height: 180 });
  layoutManager.addSummaryText(summaryText);
  layoutManager.addSectionTitle("Leave Request Details");
  layoutManager.addTable([tableHead], tableBody);
};