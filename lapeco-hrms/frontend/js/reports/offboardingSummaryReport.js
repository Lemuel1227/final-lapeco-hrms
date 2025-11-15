import { formatDate } from '../utils/dateUtils';

export const generateOffboardingSummaryReport = async (layoutManager, dataSources, params) => {
  const { voluntary_resignations = [], involuntary_terminations = [] } = dataSources;
  const { startDate, endDate } = params;
  const { doc, margin } = layoutManager;

  if (voluntary_resignations.length === 0 && involuntary_terminations.length === 0) {
    doc.text("No offboarding activity found for the selected period.", margin, layoutManager.y);
    return;
  }
  
  layoutManager.addSectionTitle(`Offboarding Types (${formatDate(new Date(startDate), 'short')} to ${formatDate(new Date(endDate), 'short')})`, { spaceBefore: 0, fontSize: 14 });
  
  const chartConfig = {
    type: 'pie',
    data: {
      labels: ['Voluntary Resignations', 'Involuntary Terminations'],
      datasets: [{
        data: [voluntary_resignations.length, involuntary_terminations.length],
        backgroundColor: ['#6c757d', '#dc3545'],
      }]
    },
    options: { 
      plugins: { 
        legend: { 
          position: 'right',
          labels: {
            font: {
              size: 12
            }
          }
        } 
      } 
    }
  };
  await layoutManager.addChart(chartConfig, { height: 180 });

  if (voluntary_resignations.length > 0) {
    layoutManager.addSectionTitle("Voluntary Resignations");
    const resTableHead = ["Employee Name", "Last Position", "Effective Date", "Reason"];
    const resTableBody = voluntary_resignations.map(r => [
      r.employee_name || 'Unknown Employee',
      r.position || 'Unassigned',
      formatDate(new Date(r.effective_date), 'short'),
      r.reason || 'N/A'
    ]);
    layoutManager.addTable([resTableHead], resTableBody);
  }

  if (involuntary_terminations.length > 0) {
    layoutManager.addSectionTitle("Involuntary Terminations");
    const termTableHead = ["Employee Name", "Termination Date", "Reason", "Comments"];
    const termTableBody = involuntary_terminations.map(t => [
      t.employee_name || 'Unknown Employee',
      formatDate(new Date(t.termination_date), 'short'),
      t.reason || 'N/A',
      t.notes || 'N/A'
    ]);
    layoutManager.addTable([termTableHead], termTableBody);
  }
};