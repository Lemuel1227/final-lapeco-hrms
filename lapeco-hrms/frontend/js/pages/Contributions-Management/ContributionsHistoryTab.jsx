import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import FinalizedPeriodCard from './FinalizedPeriodCard';
import FinalizedPeriodRow from './FinalizedPeriodRow';
import ConfirmationModal from '../../modals/ConfirmationModal';

const ContributionsHistoryTab = ({ archivedReports, onDeletePeriod, onView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('period-desc');
  const [viewMode, setViewMode] = useState('grid');
  const [periodToDelete, setPeriodToDelete] = useState(null);

  const finalizedPeriods = useMemo(() => {
    const groupedByPeriod = (archivedReports || []).reduce((acc, report) => {
      const payPeriod = report.pay_period || report.payPeriod;
      if (!acc[payPeriod]) { acc[payPeriod] = []; }
      acc[payPeriod].push(report);
      return acc;
    }, {});

    return Object.entries(groupedByPeriod)
      .map(([payPeriod, reports]) => {
        const latestDate = reports.reduce((latest, report) => {
          const currentDate = new Date(report.created_at || report.generationDate || report.updated_at);
          return currentDate > latest ? currentDate : latest;
        }, new Date(0));
        
        return { 
          payPeriod, 
          reports, 
          finalizationDate: latestDate.toISOString(), 
          generatedBy: reports[0]?.generated_by || reports[0]?.generatedBy || 'N/A' 
        };
      })
      .filter(period => {
        // Show period if it has at least one report (don't require all 3)
        return period.reports.length > 0;
      });
  }, [archivedReports]);

  const filteredAndSortedPeriods = useMemo(() => {
    let periods = [...finalizedPeriods];
    
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      periods = periods.filter(period => 
          period.payPeriod.toLowerCase().includes(lowerSearch) ||
          period.generatedBy.toLowerCase().includes(lowerSearch)
      );
    }

    return [...periods].sort((a, b) => {
      // Parse date from "October 2025" or "2025-09-26 to 2025-10-10" format
      const parsePayPeriod = (payPeriod) => {
        if (payPeriod.includes(' to ')) {
          return new Date(payPeriod.split(' to ')[0]);
        }
        // Parse "October 2025" format
        return new Date(payPeriod);
      };
      
      const dateA = parsePayPeriod(a.payPeriod);
      const dateB = parsePayPeriod(b.payPeriod);

      if (sortOrder === 'period-desc') {
        return dateB - dateA;
      }
      if (sortOrder === 'period-asc') {
        return dateA - dateB;
      }
      return 0;
    });
  }, [finalizedPeriods, searchTerm, sortOrder]);

  const handleDownloadExcel = (report) => {
    const headerData = report.header_data || report.headerData || {};
    const dataForExport = report.rows.map(row => {
      const newRow = {};
      report.columns.forEach(col => { newRow[col.label] = row[col.key]; });
      return newRow;
    });
    
    const ws = XLSX.utils.json_to_sheet([]);
    const headerRows = Object.entries(headerData).map(([key, value]) => [key, value]);
    if (headerRows.length > 0) XLSX.utils.sheet_add_aoa(ws, headerRows, { origin: 'A1' });
    
    const tableOrigin = headerRows.length > 0 ? headerRows.length + 2 : 0;
    XLSX.utils.sheet_add_json(ws, dataForExport, { origin: `A${tableOrigin}` });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, report.type);
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const payPeriod = report.pay_period || report.payPeriod;
    const filename = `Finalized_${report.type}_${payPeriod.replace(/\s+/g, '_')}.xlsx`;
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, filename);
  };

  const handleDeletePeriod = () => {
    if (!periodToDelete) return;
    onDeletePeriod(periodToDelete);
    setPeriodToDelete(null);
  };

  return (
    <>
      <div className="contributions-history-container">
        <div className="history-controls">
          <div className="input-group">
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by pay period or generator..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="sortOrder" className="form-label mb-0 small text-muted flex-shrink-0">Sort by:</label>
              <select id="sortOrder" className="form-select form-select-sm" value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                <option value="period-desc">Pay Period (Newest first)</option>
                <option value="period-asc">Pay Period (Oldest first)</option>
              </select>
            </div>
             <div className="view-toggle-contributions btn-group" role="group">
              <button type="button" className={`btn btn-sm ${viewMode === 'grid' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setViewMode('grid')} title="Grid View">
                <i className="bi bi-grid-3x3-gap-fill"></i>
              </button>
              <button type="button" className={`btn btn-sm ${viewMode === 'list' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setViewMode('list')} title="List View">
                <i className="bi bi-list-ul"></i>
              </button>
            </div>
          </div>
        </div>

        {filteredAndSortedPeriods.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="history-grid">
              {filteredAndSortedPeriods.map(period => (
                <FinalizedPeriodCard 
                  key={period.payPeriod} 
                  period={period} 
                  onDownload={handleDownloadExcel}
                  onView={() => onView(period)}
                  onDelete={() => setPeriodToDelete(period)}
                />
              ))}
            </div>
          ) : (
             <div className="card data-table-card shadow-sm">
              <div className="table-responsive">
                <table className="table data-table mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Pay Period</th>
                      <th>Finalized On</th>
                      <th>Finalized By</th>
                      <th>Reports Included</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedPeriods.map(period => (
                      <FinalizedPeriodRow 
                        key={period.payPeriod} 
                        period={period} 
                        onDownload={handleDownloadExcel}
                        onView={() => onView(period)}
                        onDelete={() => setPeriodToDelete(period)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="text-center p-5 bg-light rounded w-100">
            <i className="bi bi-archive fs-1 text-muted mb-3 d-block"></i>
            <h5 className="text-muted">No Finalized Reports Found</h5>
            <p className="text-muted">Fully finalized contribution periods will appear here.</p>
          </div>
        )}
      </div>
      
      <ConfirmationModal
        show={!!periodToDelete}
        onClose={() => setPeriodToDelete(null)}
        onConfirm={handleDeletePeriod}
        title="Delete Finalized Period"
        confirmText="Yes, Delete"
        confirmVariant="danger"
      >
        {periodToDelete && <p>Are you sure you want to delete all 3 archived reports for the pay period <strong>{periodToDelete.payPeriod}</strong>?</p>}
        <p className="text-danger">This action cannot be undone.</p>
      </ConfirmationModal>
    </>
  );
};

export default ContributionsHistoryTab;