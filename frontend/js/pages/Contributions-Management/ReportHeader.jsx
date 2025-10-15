import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import Select from 'react-select';

const ReportHeader = ({ title, payrolls, selectedRunId, onRunChange, onArchive, isArchived, columns, rows, headerData, onExportPdf }) => {

  const payrollRunOptions = useMemo(() => {
    return [...payrolls]
      .sort((a,b) => new Date(b.cutOff.split(' to ')[0]) - new Date(a.cutOff.split(' to ')[0]))
      .map(run => ({
        value: run.runId,
        label: `${run.cutOff} (${run.records.length} employees)`
      }));
  }, [payrolls]);

  const selectedOption = useMemo(() => {
    return payrollRunOptions.find(option => option.value === selectedRunId) || null;
  }, [payrollRunOptions, selectedRunId]);

  const handleExportExcel = () => {
    const dataForExport = rows.map(row => {
      const newRow = {};
      columns.forEach(col => { newRow[col.label] = row[col.key]; });
      return newRow;
    });
    
    const ws = XLSX.utils.json_to_sheet([]);
    const headerRows = Object.entries(headerData).map(([key, value]) => [key, value]);
    if (headerRows.length > 0) XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });
    const tableOrigin = headerRows.length > 0 ? headerRows.length + 2 : 0;
    XLSX.utils.sheet_add_json(ws, dataForExport, { origin: `A${tableOrigin}` });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const selectedPayrollRun = payrolls.find(p => p.runId === selectedRunId);
    const contributionMonth = selectedPayrollRun ? format(new Date(selectedPayrollRun.cutOff.split(' to ')[1]), 'yyyy-MM') : 'report';
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `${title.replace(/\s+/g, '_')}_${contributionMonth}.xlsx`);
  };

  return (
    <div className="card-header report-card-header">
      <div className="header-left">
        <h5 className="mb-0">{title}</h5>
        <div className="d-flex align-items-center gap-2 pay-period-selector-wrapper">
          <label htmlFor="payrollRunSelect" className="form-label mb-0 small">Pay Period:</label>
          <Select id="payrollRunSelect" options={payrollRunOptions} value={selectedOption} onChange={(option) => onRunChange(option ? option.value : '')} isDisabled={payrolls.length === 0} className="react-select-container" classNamePrefix="react-select" isSearchable placeholder="Select a pay period..." />
        </div>
      </div>
      <div className="header-right">
        <button className="btn btn-sm btn-outline-primary" onClick={onArchive} disabled={rows.length === 0 || isArchived}>
          <i className="bi bi-archive-fill me-1"></i> Finalize & Archive Period
        </button>
        <div className="dropdown">
          <button className="btn btn-sm btn-success dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" disabled={rows.length === 0}>
              <i className="bi bi-download me-1"></i> Export
          </button>
          <ul className="dropdown-menu dropdown-menu-end">
              <li><a className="dropdown-item" href="#" onClick={onExportPdf}><i className="bi bi-file-earmark-pdf-fill me-2"></i>Export as PDF</a></li>
              <li><a className="dropdown-item" href="#" onClick={handleExportExcel}><i className="bi bi-file-earmark-spreadsheet-fill me-2"></i>Export as Excel (CSV)</a></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportHeader;