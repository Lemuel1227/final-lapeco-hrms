import React, { useState, useEffect, useMemo } from 'react';
import { generatePagibigData, generatePhilhealthData, generateSssData } from '../../hooks/contributionUtils';
import ContributionTypeToggle from './ContributionTypeToggle';
import ReportHeader from './ReportHeader';
import EditableContributionTable from './EditableContributionTable';
import AddColumnModal from './AddColumnModal';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ContributionsHistoryTab from './ContributionsHistoryTab';
import FinalizedReportPlaceholder from './FinalizedReportPlaceholder';
import ToastNotification from '../../common/ToastNotification';
import './ContributionsManagement.css';

const ContributionsManagementPage = ({ employees, positions, payrolls }) => {
  const [mainTab, setMainTab] = useState('current');
  const [activeReport, setActiveReport] = useState('sss');
  const [selectedPayrollRunId, setSelectedPayrollRunId] = useState('');
  
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [reportTitle, setReportTitle] = useState('');
  const [headerData, setHeaderData] = useState({});
  const [archivedReports, setArchivedReports] = useState([]);
  
  const [editingHeaderKey, setEditingHeaderKey] = useState(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [confirmationModalState, setConfirmationModalState] = useState({
    isOpen: false, title: '', body: '', onConfirm: () => {},
  });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const pendingPayrolls = useMemo(() => {
    const finalizedPeriods = archivedReports.reduce((acc, report) => {
        const normalizedType = report.type.toLowerCase().replace(/[-_]/g, '');
        acc[report.payPeriod] = (acc[report.payPeriod] || new Set()).add(normalizedType);
        return acc;
    }, {});
  
    const sortedPayrolls = [...(payrolls || [])].sort((a,b) => new Date(b.cutOff.split(' to ')[0]) - new Date(a.cutOff.split(' to ')[0]));

    return sortedPayrolls.filter(run => {
        const finalizedTypes = finalizedPeriods[run.cutOff];
        if (!finalizedTypes) return true;
        return !(finalizedTypes.has('sss') && finalizedTypes.has('philhealth') && finalizedTypes.has('pagibig'));
    });
  }, [payrolls, archivedReports]);

  const activePayrollRun = useMemo(() => {
    const userSelectionIsValid = pendingPayrolls.some(p => p.runId === selectedPayrollRunId);
    if (userSelectionIsValid) {
      return payrolls.find(p => p.runId === selectedPayrollRunId);
    }
    if (pendingPayrolls.length > 0) {
      return pendingPayrolls[0];
    }
    return null;
  }, [pendingPayrolls, selectedPayrollRunId, payrolls]);

  useEffect(() => {
    const activeId = activePayrollRun?.runId || '';
    if (activeId !== selectedPayrollRunId) {
      setSelectedPayrollRunId(activeId);
    }
  }, [activePayrollRun, selectedPayrollRunId]);

  useEffect(() => {
    if (!activePayrollRun) {
        setColumns([]); setRows([]); setReportTitle('No Data'); setHeaderData({});
        return;
    };

    let data;
    if (activeReport === 'pagibig') data = generatePagibigData(employees, positions, activePayrollRun);
    else if (activeReport === 'philhealth') data = generatePhilhealthData(employees, positions, activePayrollRun);
    else data = generateSssData(employees, positions, activePayrollRun);
    
    setColumns(data.columns);
    setRows(data.rows);
    setReportTitle(data.title);
    setHeaderData(data.headerData);
  }, [activeReport, activePayrollRun, employees, positions]);
  
  const isCurrentPeriodArchived = useMemo(() => {
    if (!activePayrollRun) return true;
    return !pendingPayrolls.some(p => p.runId === activePayrollRun.runId);
  }, [activePayrollRun, pendingPayrolls]);

  const stats = useMemo(() => {
    if (!activePayrollRun || isCurrentPeriodArchived) {
      return { sss: 0, philhealth: 0, pagibig: 0 };
    }
    
    const calculateTotal = (data) => data.rows.reduce((acc, row) => acc + (row.totalContribution || 0), 0);
    
    const sssTotal = calculateTotal(generateSssData(employees, positions, activePayrollRun));
    const philhealthTotal = calculateTotal(generatePhilhealthData(employees, positions, activePayrollRun));
    const pagibigTotal = calculateTotal(generatePagibigData(employees, positions, activePayrollRun));

    return { sss: sssTotal, philhealth: philhealthTotal, pagibig: pagibigTotal };
  }, [activePayrollRun, employees, positions, isCurrentPeriodArchived]);

  const handleArchivePeriod = () => {
    if (!activePayrollRun) return;
    const sssData = generateSssData(employees, positions, activePayrollRun);
    const philhealthData = generatePhilhealthData(employees, positions, activePayrollRun);
    const pagibigData = generatePagibigData(employees, positions, activePayrollRun);
    const reportsToArchive = [
        { ...sssData, type: 'SSS' },
        { ...philhealthData, type: 'PhilHealth' },
        { ...pagibigData, type: 'Pag-IBIG' }
    ];
    const newArchives = reportsToArchive.map(report => ({
      id: `ARCHIVE-${report.type.toUpperCase().replace('-', '')}-${Date.now()}`,
      type: report.type,
      payPeriod: activePayrollRun.cutOff,
      generationDate: new Date().toISOString(),
      generatedBy: 'Grace Field',
      columns: report.columns,
      rows: report.rows,
      headerData: report.headerData,
    }));

    setArchivedReports(prev => [
        ...prev.filter(r => r.payPeriod !== activePayrollRun.cutOff),
        ...newArchives
    ]);

    setToast({ 
        show: true, 
        message: `All contribution reports for pay period ${activePayrollRun.cutOff} have been finalized.`, 
        type: 'success' 
    });
    setMainTab('history');
  };

  const handleDeleteFinalizedPeriod = (periodToDelete) => {
    if (!periodToDelete) return;
    setArchivedReports(prev => prev.filter(r => r.payPeriod !== periodToDelete.payPeriod));
    setToast({
      show: true,
      message: `Finalized reports for period ${periodToDelete.payPeriod} have been deleted.`,
      type: 'info'
    });
  };

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

  return (
    <div className="container-fluid p-0 page-module-container">
       {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}
      <header className="page-header mb-4">
        <h1 className="page-main-title">Contributions Management</h1>
        <p className="text-muted">Generate, edit, and archive monthly contribution reports.</p>
      </header>

      <ul className="nav nav-tabs contributions-main-tabs">
        <li className="nav-item"><button className={`nav-link ${mainTab === 'current' ? 'active' : ''}`} onClick={() => setMainTab('current')}>Current Report</button></li>
        <li className="nav-item"><button className={`nav-link ${mainTab === 'history' ? 'active' : ''}`} onClick={() => setMainTab('history')}>Finalized Reports</button></li>
      </ul>

      {mainTab === 'current' ? (
        <div className="tab-pane-content">
          <div className="contribution-stats-grid">
            <div className="stat-card-contribution sss-card"><div className="stat-icon"><i className="bi bi-building-fill-check"></i></div><div className="stat-info"><div className="stat-value">₱{formatCurrency(stats.sss)}</div><div className="stat-label">Total SSS Contribution</div></div></div>
            <div className="stat-card-contribution philhealth-card"><div className="stat-icon"><i className="bi bi-heart-pulse-fill"></i></div><div className="stat-info"><div className="stat-value">₱{formatCurrency(stats.philhealth)}</div><div className="stat-label">Total PhilHealth Contribution</div></div></div>
            <div className="stat-card-contribution pagibig-card"><div className="stat-icon"><i className="bi bi-house-heart-fill"></i></div><div className="stat-info"><div className="stat-value">₱{formatCurrency(stats.pagibig)}</div><div className="stat-label">Total Pag-IBIG Contribution</div></div></div>
          </div>
          <div className="card shadow-sm">
            <ReportHeader title={reportTitle} payrolls={pendingPayrolls} selectedRunId={selectedPayrollRunId} onRunChange={setSelectedPayrollRunId} columns={columns} rows={rows} headerData={headerData} onArchive={handleArchivePeriod} isArchived={isCurrentPeriodArchived} />
            <div className="card-body">
              <ContributionTypeToggle activeReport={activeReport} onSelectReport={setActiveReport} />
              {isCurrentPeriodArchived ? (
                <FinalizedReportPlaceholder
                    onNavigate={() => setMainTab('history')}
                    reportInfo={{
                        payPeriod: activePayrollRun?.cutOff || ''
                    }}
                />
              ) : !activePayrollRun ? (
                <div className="text-center p-5 bg-light rounded mt-3"><i className="bi bi-check2-all fs-1 text-success mb-3 d-block"></i><h4 className="text-muted">All Reports Finalized</h4><p className="text-muted">There are no pending contribution reports to generate.</p></div>
              ) : (
                <EditableContributionTable columns={columns} rows={rows} editingHeaderKey={editingHeaderKey} onCellChange={handleCellChange} onAddRow={handleAddRow} onDeleteRow={handleDeleteRow} onHeaderChange={handleColumnHeaderChange} onHeaderClick={handleHeaderClick} onAddColumn={() => setShowAddColumnModal(true)} onDeleteColumn={handleDeleteColumn} />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="tab-pane-content">
          <ContributionsHistoryTab 
            archivedReports={archivedReports} 
            onDeletePeriod={handleDeleteFinalizedPeriod}
            employees={employees}
            positions={positions}
            payrolls={payrolls}
          />
        </div>
      )}
      
      <AddColumnModal show={showAddColumnModal} onClose={() => setShowAddColumnModal(false)} onAdd={handleAddColumn} />
      <ConfirmationModal show={confirmationModalState.isOpen} onClose={closeConfirmationModal} onConfirm={confirmationModalState.onConfirm} title={confirmationModalState.title} confirmText="Yes, Delete" confirmVariant="danger"><p>{confirmationModalState.body}</p></ConfirmationModal>
    </div>
  );
};

export default ContributionsManagementPage;