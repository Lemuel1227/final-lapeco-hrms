import { formatCurrency } from '../utils/formatters';

export const generateContributionsMonthlyReport = async (layoutManager, dataSources, params) => {
  const { headerData = {}, columns = [], rows = [], reports = [] } = dataSources;
  const { type = 'SSS', payPeriod = '', reportTitle = 'Monthly Contribution Report' } = params;
  const { doc, margin } = layoutManager;

  // Consolidated mode: render multiple report sections if provided
  if (type === 'ALL' && Array.isArray(reports) && reports.length > 0) {
    const title = `${reportTitle} - ${payPeriod}`;
    layoutManager.addSectionTitle(title, { fontSize: 16, spaceBefore: 10, spaceAfter: 6 });

    reports.forEach((rep, idx) => {
      const repHeader = rep.header_data || rep.headerData || {};
      const repColumns = rep.columns || [];
      const repRows = rep.rows || [];
      const repType = rep.type || 'Report';

      layoutManager.addSectionTitle(String(repType), { fontSize: 14, spaceBefore: idx === 0 ? 6 : 14, spaceAfter: 6 });
      const headerLines = Object.entries(repHeader).map(([k, v]) => `${k}: ${v}`);
      if (headerLines.length) {
        layoutManager.addSummaryText(headerLines.join('\n'));
      }

      const tableHead = repColumns.map(c => c.label);
      const currencyKeys = new Set(['employeeContribution', 'employerContribution', 'totalContribution', 'grossCompensation', 'taxableCompensation', 'taxWithheld']);
      const tableBody = repRows.map(row => repColumns.map(col => {
        const value = row[col.key];
        if (currencyKeys.has(col.key)) return formatCurrency(Number(value) || 0);
        return value;
      }));

      layoutManager.addTable([tableHead], tableBody);
    });
    return;
  }

  // Single-type mode
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    doc.text(`No ${type} contribution data found for ${payPeriod}.`, margin, layoutManager.y);
    return;
  }

  const title = `${reportTitle} - ${payPeriod}`;
  layoutManager.addSectionTitle(title, { fontSize: 16, spaceBefore: 10, spaceAfter: 6 });

  const headerLines = Object.entries(headerData).map(([k, v]) => `${k}: ${v}`);
  if (headerLines.length) {
    layoutManager.addSummaryText(headerLines.join('\n'));
  }

  const tableHead = columns.map(c => c.label);
  const currencyKeys = new Set(['employeeContribution', 'employerContribution', 'totalContribution', 'grossCompensation', 'taxableCompensation', 'taxWithheld']);
  const tableBody = rows.map(row => columns.map(col => {
    const value = row[col.key];
    if (currencyKeys.has(col.key)) return formatCurrency(Number(value) || 0);
    return value;
  }));

  layoutManager.addTable([tableHead], tableBody);
};