import React, { useState, useEffect, useMemo } from 'react';
import ReportHeader from './ReportHeader';
import EditableContributionTable from './EditableContributionTable';
import AddColumnModal from './AddColumnModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ContributionsHistoryTab from './ContributionsHistoryTab';
import FinalizedReportPlaceholder from './FinalizedReportPlaceholder';
import ToastNotification from '../../common/ToastNotification';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { contributionAPI } from '../../services/api';
import ContributionTypeToggle from './ContributionTypeToggle';
import SssTab from './SssTab';
import PhilhealthTab from './PhilhealthTab';
import PagibigTab from './PagibigTab';
import TinTab from './TinTab';
import './ContributionsManagement.css';

const MONTHS = [
    { value: 0, label: 'January' }, { value: 1, label: 'February' }, { value: 2, label: 'March' },
    { value: 3, label: 'April' }, { value: 4, label: 'May' }, { value: 5, label: 'June' },
    { value: 6, label: 'July' }, { value: 7, label: 'August' }, { value: 8, label: 'September' },
    { value: 9, label: 'October' }, { value: 10, label: 'November' }, { value: 11, label: 'December' },
];

const ContributionsManagementPage = ({ employees, positions, payrolls, theme }) => {
  const [mainTab, setMainTab] = useState('current');
  const [activeReport, setActiveReport] = useState('sss');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [reportTitle, setReportTitle] = useState('');
  const [headerData, setHeaderData] = useState({});
  const [archivedReports, setArchivedReports] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');
  const [isProvisional, setIsProvisional] = useState(false);
  const [missingPeriod, setMissingPeriod] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator(theme);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const [editingHeaderKey, setEditingHeaderKey] = useState(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [confirmationModalState, setConfirmationModalState] = useState({
    isOpen: false, title: '', body: '', onConfirm: () => {},
  });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [totalsByType, setTotalsByType] = useState({ sss: 0, philhealth: 0, pagibig: 0, tin: 0 });

  const uniqueYears = useMemo(() => {
    const years = new Set((payrolls || []).map(run => new Date(run.cutOff.split(' to ')[0]).getFullYear()));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [payrolls]);

  // Fetch contribution data from backend
  useEffect(() => {
    const fetchContributionData = async () => {
      setIsLoadingData(true);
      setDataError('');
      
      try {
        const { data } = await contributionAPI.getMonthlyContributions({
          year: selectedYear,
          month: selectedMonth,
          type: activeReport,
        });
        
        // Set provisional status from backend
        setIsProvisional(data.isProvisional || false);
        setMissingPeriod(data.missingPeriod || null);
        
        if (data.data && data.data.length > 0) {
          setRows(data.data);
          
          // Set columns and header based on report type
          const monthName = MONTHS[selectedMonth].label;
          if (activeReport === 'sss') {
            setReportTitle('SSS Contribution Report');
            setHeaderData({
              'Employer ID Number': '03-9-1234567-8',
              'Employer Name': 'Lapeco Group of Companies',
              'Contribution Month': `${monthName} ${selectedYear}`,
            });
            setColumns([
              { key: 'no', label: 'No.', editable: false, isPermanent: true },
              { key: 'govtId', label: 'SSS Number', editable: false, isPermanent: true },
              { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
              { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
              { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
              { key: 'employeeContribution', label: 'EE Share', editable: false, isPermanent: true },
              { key: 'employerContribution', label: 'ER Share', editable: false, isPermanent: true },
              { key: 'totalContribution', label: 'Total', editable: false, isPermanent: true },
            ]);
          } else if (activeReport === 'philhealth') {
            setReportTitle('PhilHealth Contribution Report');
            setHeaderData({
              'Employer Name': 'Lapeco Group of Companies',
              'Contribution Month': `${monthName} ${selectedYear}`,
            });
            setColumns([
              { key: 'no', label: 'No.', editable: false, isPermanent: true },
              { key: 'govtId', label: 'PhilHealth Number', editable: false, isPermanent: true },
              { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
              { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
              { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
              { key: 'employeeContribution', label: 'EE Share', editable: false, isPermanent: true },
              { key: 'employerContribution', label: 'ER Share', editable: false, isPermanent: true },
              { key: 'totalContribution', label: 'Total', editable: false, isPermanent: true },
            ]);
          } else if (activeReport === 'pagibig') {
            setReportTitle('Pag-IBIG Contribution Report');
            setHeaderData({
              'Employer Name': 'Lapeco Group of Companies',
              'Contribution Month': `${monthName} ${selectedYear}`,
            });
            setColumns([
              { key: 'no', label: 'No.', editable: false, isPermanent: true },
              { key: 'govtId', label: 'Pag-IBIG MID No.', editable: false, isPermanent: true },
              { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
              { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
              { key: 'middleName', label: 'Middle Name', editable: false, isPermanent: true },
              { key: 'employeeContribution', label: 'EE Share', editable: false, isPermanent: true },
              { key: 'employerContribution', label: 'ER Share', editable: false, isPermanent: true },
              { key: 'totalContribution', label: 'Total', editable: false, isPermanent: true },
            ]);
          } else if (activeReport === 'tin') {
            setReportTitle('Withholding Tax (TIN) Report');
            setHeaderData({
              'Employer Name': 'Lapeco Group of Companies',
              'For the Month of': `${monthName} ${selectedYear}`,
            });
            setColumns([
              { key: 'no', label: 'No.', editable: false, isPermanent: true },
              { key: 'govtId', label: 'TIN', editable: false, isPermanent: true },
              { key: 'lastName', label: 'Last Name', editable: false, isPermanent: true },
              { key: 'firstName', label: 'First Name', editable: false, isPermanent: true },
              { key: 'middleName', label: 'MI', editable: false, isPermanent: true },
              { key: 'grossCompensation', label: 'Gross Compensation', editable: false, isPermanent: true },
              { key: 'taxWithheld', label: 'Tax Withheld', editable: false, isPermanent: true },
            ]);
          }
        } else {
          setRows([]);
          setDataError('No payroll data found for this month');
        }
      } catch (error) {
        console.error('Failed to fetch contribution data:', error);
        setDataError(error.response?.data?.message || 'Failed to load contribution data');
        setRows([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchContributionData();
  }, [selectedYear, selectedMonth, activeReport]);

  const isCurrentMonthArchived = useMemo(() => {
    // Check if current report type is finalized for the selected month
    const finalized = archivedReports.find(r => 
      r.type === activeReport.toUpperCase() && 
      r.year === selectedYear && 
      r.month === (selectedMonth + 1)
    );
    
    return !!finalized;
  }, [selectedMonth, selectedYear, activeReport, archivedReports]);
  
  // Fetch totals for all contribution types for the selected month/year
  useEffect(() => {
    let cancelled = false;
    const fetchAllTotals = async () => {
      try {
        const types = ['sss', 'philhealth', 'pagibig', 'tin'];
        const responses = await Promise.all(
          types.map(type => contributionAPI.getMonthlyContributions({ year: selectedYear, month: selectedMonth, type }))
        );
        const getRows = (i) => responses[i]?.data?.data || [];
        const sum = (arr, key = 'totalContribution') => arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
        const newTotals = {
          sss: sum(getRows(0)),
          philhealth: sum(getRows(1)),
          pagibig: sum(getRows(2)),
          tin: sum(getRows(3), 'taxWithheld'),
        };
        if (!cancelled) setTotalsByType(newTotals);
      } catch (err) {
        // Fallback: compute from archived reports if API fails or returns nothing
        const monthIndex = selectedMonth + 1;
        const findReportRows = (typeUpper) => {
          const report = archivedReports.find(r => r.type === typeUpper && r.year === selectedYear && r.month === monthIndex);
          return report ? (report.rows || []) : [];
        };
        const sumRows = (arr, key = 'totalContribution') => arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
        const newTotals = {
          sss: sumRows(findReportRows('SSS')),
          philhealth: sumRows(findReportRows('PHILHEALTH')),
          pagibig: sumRows(findReportRows('PAGIBIG')),
          tin: sumRows(findReportRows('TIN'), 'taxWithheld'),
        };
        setTotalsByType(newTotals);
      }
    };
    fetchAllTotals();
    return () => { cancelled = true; };
  }, [selectedYear, selectedMonth, archivedReports]);

  // Live-update the total for the currently active report when rows change
  useEffect(() => {
    const calc = (key = 'totalContribution') => rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    setTotalsByType(prev => {
      const next = { ...prev };
      if (activeReport === 'tin') {
        next.tin = calc('taxWithheld');
      } else if (activeReport === 'sss') {
        next.sss = calc();
      } else if (activeReport === 'philhealth') {
        next.philhealth = calc();
      } else if (activeReport === 'pagibig') {
        next.pagibig = calc();
      }
      return next;
    });
  }, [rows, activeReport]);

  // Stats used by the cards are the totals across types
  const stats = totalsByType;
  
  const handleExportPdf = () => {
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label;
    const payPeriod = `${monthLabel} ${selectedYear}`;

    if (!rows || rows.length === 0) {
      setToast({ show: true, message: 'No data to export for the selected month.', type: 'warning' });
      return;
    }

    const typeUpper = activeReport.toUpperCase();
    const params = { type: typeUpper, payPeriod, reportTitle };
    const dataSources = { headerData, columns, rows };
    generateReport('contributions_monthly', params, dataSources);
    setShowReportPreview(true);
  };
  
  const handleArchivePeriod = async () => {
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label;
    const payPeriod = `${monthLabel} ${selectedYear}`;
    
    setIsFinalizing(true);
    try {
      await contributionAPI.finalizeContribution({
        type: activeReport,
        year: selectedYear,
        month: selectedMonth + 1, // Convert to 1-12
        payPeriod,
        headerData,
        columns,
        rows,
      });
      
      // Reload finalized reports
      await loadFinalizedReports();
      
      setToast({ show: true, message: `${reportTitle} for ${payPeriod} has been finalized.`, type: 'success' });
      setMainTab('history');
    } catch (error) {
      console.error('Failed to finalize contribution:', error);
      setToast({ show: true, message: error.response?.data?.message || 'Failed to finalize contribution', type: 'error' });
    } finally {
      setIsFinalizing(false);
    }
  };

  // Load finalized reports
  const loadFinalizedReports = async () => {
    try {
      const { data } = await contributionAPI.getFinalizedContributions();
      setArchivedReports(data.data || []);
    } catch (error) {
      console.error('Failed to load finalized reports:', error);
    }
  };

  // Load finalized reports on mount
  useEffect(() => {
    loadFinalizedReports();
  }, []);

  const handleCellChange = (rowIndex, columnKey, value) => setRows(prev => prev.map((row, i) => i === rowIndex ? { ...row, [columnKey]: value } : row));
  const handleAddColumn = (columnName) => {
    const newColumnKey = columnName.trim().toLowerCase().replace(/\s+/g, '_') + `_${Date.now()}`;
    setColumns([...columns, { key: newColumnKey, label: columnName, editable: true, isPermanent: false }]);
    setRows(rows.map(row => ({ ...row, [newColumnKey]: '' })));
  };
  const handleDeleteColumn = (keyToDelete) => setConfirmationModalState({
    isOpen: true, title: 'Delete Column', body: `Are you sure you want to permanently delete the "${columns.find(c => c.key === keyToDelete)?.label}" column?`,
    onConfirm: () => {
      setColumns(prev => prev.filter(col => col.key !== keyToDelete));
      setRows(prevRows => prevRows.map(row => {
        const newRow = { ...row }; delete newRow[keyToDelete]; return newRow;
      }));
      closeConfirmationModal();
    }
  });
  const handleAddRow = () => setRows(prev => [...prev, columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {})]);
  const handleDeleteRow = (rowIndex) => setConfirmationModalState({
    isOpen: true, title: 'Delete Row', body: `Are you sure you want to permanently delete this row?`,
    onConfirm: () => {
      setRows(prev => prev.filter((_, index) => index !== rowIndex));
      closeConfirmationModal();
    }
  });
  const closeConfirmationModal = () => setConfirmationModalState({ isOpen: false });
  const handleHeaderClick = (key) => setEditingHeaderKey(key);
  const handleColumnHeaderChange = (columnKey, newLabel) => setColumns(prev => prev.map(col => col.key === columnKey ? { ...col, label: newLabel } : col));
  const formatCurrency = (value) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const handleClosePreview = () => { setShowReportPreview(false); if(pdfDataUri) { URL.revokeObjectURL(pdfDataUri); } setPdfDataUri(''); };
  
  const handleDeleteFinalizedPeriod = async (period) => {
    try {
      // Delete all reports in the period
      for (const report of period.reports) {
        await contributionAPI.deleteFinalizedContribution(report.id);
      }
      
      // Reload finalized reports
      await loadFinalizedReports();
      
      setToast({ show: true, message: `Finalized reports for ${period.payPeriod} have been deleted.`, type: 'success' });
    } catch (error) {
      console.error('Failed to delete finalized period:', error);
      setToast({ show: true, message: error.response?.data?.message || 'Failed to delete finalized reports', type: 'error' });
    }
  };
  
  const handleViewHistoryPdf = (period) => {
    const periodLabel = period?.payPeriod || '';
    const reports = Array.isArray(period?.reports) ? period.reports : [];
    if (!reports.length) {
      setToast({ show: true, message: 'No finalized reports found for this period.', type: 'warning' });
      return;
    }
    const params = { type: 'ALL', payPeriod: periodLabel, reportTitle: 'Finalized Contributions' };
    const dataSources = { reports };
    generateReport('contributions_monthly', params, dataSources);
    setShowReportPreview(true);
  };

  const commonTableProps = {
    columns, rows, reportTitle, onCellChange: handleCellChange,
    onAddRow: handleAddRow, onDeleteRow: handleDeleteRow,
    onAddColumn: () => setShowAddColumnModal(true), onDeleteColumn: handleDeleteColumn,
    onHeaderClick: handleHeaderClick, onHeaderChange: handleColumnHeaderChange,
    editingHeaderKey,
  };

  return (
    <div className="container-fluid p-0 page-module-container">
       {toast.show && ( <ToastNotification toast={toast} onClose={() => setToast({ ...toast, show: false })} /> )}
      <header className="page-header mb-4"><h1 className="page-main-title">Contributions Management</h1><p className="text-muted">Generate, edit, and archive monthly contribution reports.</p></header>
      <ul className="nav nav-tabs contributions-main-tabs">
        <li className="nav-item"><button className={`nav-link ${mainTab === 'current' ? 'active' : ''}`} onClick={() => setMainTab('current')}>Current Report</button></li>
        <li className="nav-item"><button className={`nav-link ${mainTab === 'history' ? 'active' : ''}`} onClick={() => setMainTab('history')}>Finalized Reports</button></li>
      </ul>
      {mainTab === 'current' ? (
        <div className="tab-pane-content">
          <div className="contribution-stats-grid">
            <div className="stat-card-contribution sss-card"><div className="stat-icon"><i className="bi bi-building-fill-check"></i></div><div className="stat-info"><div className="stat-value">₱{formatCurrency(stats.sss)}</div><div className="stat-label">Total SSS</div></div></div>
            <div className="stat-card-contribution philhealth-card"><div className="stat-icon"><i className="bi bi-heart-pulse-fill"></i></div><div className="stat-info"><div className="stat-value">₱{formatCurrency(stats.philhealth)}</div><div className="stat-label">Total PhilHealth</div></div></div>
            <div className="stat-card-contribution pagibig-card"><div className="stat-icon"><i className="bi bi-house-heart-fill"></i></div><div className="stat-info"><div className="stat-value">₱{formatCurrency(stats.pagibig)}</div><div className="stat-label">Total Pag-IBIG</div></div></div>
            <div className="stat-card-contribution"><div className="stat-icon" style={{backgroundColor: '#6f42c1'}}><i className="bi bi-file-earmark-person-fill"></i></div><div className="stat-info"><div className="stat-value">₱{formatCurrency(stats.tin)}</div><div className="stat-label">Total Tax Withheld</div></div></div>
          </div>
          <div className="card shadow-sm">
            <ReportHeader
              title={`Contributions for`}
              availableYears={uniqueYears} selectedYear={selectedYear} selectedMonth={selectedMonth}
              onYearChange={setSelectedYear} onMonthChange={setSelectedMonth}
              onArchive={handleArchivePeriod} isArchived={isCurrentMonthArchived || isProvisional}
              onExportPdf={handleExportPdf} columns={columns} rows={rows} headerData={headerData}
            />
            <div className="card-body">
              {isLoadingData && (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading contribution data...</p>
                </div>
              )}
              {dataError && !isLoadingData && (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {dataError}
                </div>
              )}
              {!isLoadingData && !dataError && (
                <>
                  {isProvisional && rows.length > 0 && (
                    <div className="alert alert-warning">
                      <strong>Provisional Data:</strong> The figures shown are based on an incomplete monthly payroll. Contributions will adjust once the <strong>{missingPeriod}</strong> pay period is generated.
                    </div>
                  )}
                  <ContributionTypeToggle activeReport={activeReport} onSelectReport={setActiveReport} />
                  {isCurrentMonthArchived ? (
                    <FinalizedReportPlaceholder onNavigate={() => setMainTab('history')} reportInfo={{ payPeriod: `${MONTHS[selectedMonth].label} ${selectedYear}` }} />
                  ) : rows.length === 0 ? (
                    <div className="text-center p-5 bg-light rounded mt-3">
                      <i className="bi bi-exclamation-triangle-fill fs-1 text-warning mb-3 d-block"></i>
                      <h4 className="text-muted">No Payroll Data</h4>
                      <p className="text-muted">No payroll data found for the selected month.</p>
                    </div>
                  ) : (
                    <>
                      {activeReport === 'sss' && <SssTab {...commonTableProps} />}
                      {activeReport === 'philhealth' && <PhilhealthTab {...commonTableProps} />}
                      {activeReport === 'pagibig' && <PagibigTab {...commonTableProps} />}
                      {activeReport === 'tin' && <TinTab {...commonTableProps} />}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="tab-pane-content">
          <ContributionsHistoryTab archivedReports={archivedReports} onDeletePeriod={handleDeleteFinalizedPeriod} onView={handleViewHistoryPdf} />
        </div>
      )}
      
      {(isLoading || pdfDataUri) && (
        <ReportPreviewModal
          show={showReportPreview}
          onClose={handleClosePreview}
          pdfDataUri={pdfDataUri}
          reportTitle="Consolidated Contributions Report"
        />
      )}

      <AddColumnModal show={showAddColumnModal} onClose={() => setShowAddColumnModal(false)} onAdd={handleAddColumn} />
      <ConfirmationModal show={confirmationModalState.isOpen} onClose={closeConfirmationModal} onConfirm={confirmationModalState.onConfirm} title={confirmationModalState.title} confirmText="Yes, Delete" confirmVariant="danger"><p>{confirmationModalState.body}</p></ConfirmationModal>
    </div>
  );
};

export default ContributionsManagementPage;