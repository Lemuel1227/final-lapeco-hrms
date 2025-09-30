import autoTable from 'jspdf-autotable';

/**
 * Generates the Leave Requests Report.
 * @param {jsPDF} doc - The jsPDF instance.
 * @param {object} params - Report parameters (e.g., startDate, endDate).
 * @param {object} dataSources - Contains all mock data (leaveRequests).
 * @param {function} addChartAndTitle - Helper function to add a chart to the PDF.
 * @returns {jsPDF} The modified jsPDF document.
 */
export const generateLeaveRequestsReport = async (doc, params, dataSources, addChartAndTitle) => {
  const { leaveRequests } = dataSources;
  const { startDate, endDate, margin } = params;

  // 1. Filter leave requests based on the selected date range
  const filteredRequests = (leaveRequests || []).filter(req => {
    // We filter based on the start date of the leave
    const reqDate = new Date(req.dateFrom);
    return reqDate >= new Date(startDate) && reqDate <= new Date(endDate);
  });

  if (filteredRequests.length === 0) {
    doc.text("No leave requests were found for the selected period.", margin, params.startY);
    return doc;
  }

  // 2. Aggregate data for the chart
  const leaveTypeCounts = filteredRequests.reduce((acc, req) => {
    acc[req.leaveType] = (acc[req.leaveType] || 0) + 1;
    return acc;
  }, {});

  // 3. Configure and add the chart to the PDF
  const chartConfig = {
    type: 'pie',
    data: {
      labels: Object.keys(leaveTypeCounts),
      datasets: [{
        data: Object.values(leaveTypeCounts),
        backgroundColor: ['#0d6efd', '#dc3545', '#ffc107', '#0dcaf0', '#6c757d'],
        borderColor: '#fff',
        borderWidth: 2,
      }]
    },
    options: {
      plugins: { legend: { position: 'right' } }
    }
  };
  let finalY = await addChartAndTitle(`Leave Breakdown (${startDate} to ${endDate})`, chartConfig);

  // 4. Prepare data for the main table
  const tableColumns = ["ID", "Name", "Position", "Leave Type", "Date Range", "Days", "Status"];
  const tableRows = filteredRequests.map(req => [
    req.empId,
    req.name,
    req.position,
    req.leaveType,
    `${req.dateFrom} to ${req.dateTo}`,
    req.days,
    req.status
  ]);

  // 5. Add the table to the PDF
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: finalY,
    theme: 'striped',
    headStyles: { fillColor: [25, 135, 84] }
  });

  return doc;
};