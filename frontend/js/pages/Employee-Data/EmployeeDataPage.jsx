import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './EmployeeDataPage.css';
import AddEditEmployeeModal from '../../modals/AddEditEmployeeModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import RequirementsChecklist from './RequirementsChecklist';
import 'bootstrap-icons/font/bootstrap-icons.css';
import placeholderImage from '../../assets/placeholder-profile.jpg';
import logo from '../../assets/logo.png';
import { employeeAPI } from '../../services/api';
import { positionAPI } from '../../services/api';

const EmployeeDataPage = () => {
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [joiningDateFilter, setJoiningDateFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showReportPreviewModal, setShowReportPreviewModal] = useState(false);
  const [pdfDataUri, setPdfDataUri] = useState('');
  const [reportTitle, setReportTitle] = useState('');

  const normalizeEmployee = (e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    employeeId: e.employee_id ?? e.employeeId ?? null,
    positionId: e.position_id ?? e.positionId ?? null,
    position: e.position ?? null,
    joiningDate: e.joining_date ?? e.joiningDate ?? null,
    birthday: e.birthday ?? null,
    gender: e.gender ?? null,
    address: e.address ?? null,
    contactNumber: e.contact_number ?? e.contactNumber ?? null,
    imageUrl: e.image_url ?? e.imageUrl ?? null,
    sssNo: e.sss_no ?? e.sssNo ?? null,
    tinNo: e.tin_no ?? e.tinNo ?? null,
    pagIbigNo: e.pag_ibig_no ?? e.pagIbigNo ?? null,
    philhealthNo: e.philhealth_no ?? e.philhealthNo ?? null,
    resumeFile: e.resume_file ?? e.resumeFile ?? null,
  });

  // Fetch employees and positions
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [empRes, posRes] = await Promise.all([
          employeeAPI.getAll(),
          positionAPI.getAll(),
        ]);
        const empData = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data || []);
        setEmployees(empData.map(normalizeEmployee));

        const posData = Array.isArray(posRes.data) ? posRes.data : (posRes.data?.data || []);
        // Normalize positions to { id, title }
        setPositions(posData.map(p => ({ id: p.id, title: p.title ?? p.name })));
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setEmployees([]);
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handlers = { 
    saveEmployee: async (employeeData, id) => {
      try {
        const isEdit = Boolean(id);
        const payload = {
          name: employeeData.name,
          email: employeeData.email,
          ...(isEdit ? {} : { role: employeeData.role || 'REGULAR_EMPLOYEE' }),
          position_id: employeeData.positionId ? Number(employeeData.positionId) : null,
          joining_date: employeeData.joiningDate || null,
          birthday: employeeData.birthday || null,
          gender: employeeData.gender || null,
          address: employeeData.address || null,
          contact_number: employeeData.contactNumber || null,
          sss_no: employeeData.sssNo || null,
          tin_no: employeeData.tinNo || null,
          pag_ibig_no: employeeData.pagIbigNo || null,
          philhealth_no: employeeData.philhealthNo || null,
        };

        if (isEdit) {
          await employeeAPI.update(id, payload);
        } else {
          await employeeAPI.create(payload);
        }
        // Refresh
        const response = await employeeAPI.getAll();
        const empData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        setEmployees(empData.map(normalizeEmployee));
        setShowAddEditModal(false);
      } catch (err) {
        console.error('Error saving employee:', err);
        const apiErrors = err?.response?.data?.errors;
        const message = apiErrors ? Object.values(apiErrors).flat().join('\n') : 'Failed to save employee. Please try again.';
        alert(message);
      }
    }, 
    deleteEmployee: async (employeeId) => {
      try {
        await employeeAPI.delete(employeeId);
        const response = await employeeAPI.getAll();
        const empData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
        setEmployees(empData.map(normalizeEmployee));
      } catch (err) {
        console.error('Error deleting employee:', err);
        alert('Failed to delete employee. Please try again.');
      }
    } 
  };

  const uniquePositions = useMemo(() => ['All Positions', ...new Set(employees.map(emp => emp.position).filter(Boolean).sort())], [employees]);
  
  const filteredAndSortedEmployees = useMemo(() => {
    let records = employees.map(emp => ({...emp}));
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      records = records.filter(emp => emp.name.toLowerCase().includes(lowerSearchTerm) || emp.email.toLowerCase().includes(lowerSearchTerm) || (emp.position || '').toLowerCase().includes(lowerSearchTerm) || String(emp.id).toLowerCase().includes(lowerSearchTerm) );
    }
    if (positionFilter) { records = records.filter(emp => emp.position === positionFilter); }
    if (joiningDateFilter) { records = records.filter(emp => emp.joiningDate === joiningDateFilter); }
    if (statusFilter) { records = records.filter(emp => (emp.status || 'Pending') === statusFilter); }
    if (sortConfig.key) {
      records.sort((a, b) => {
        const valA = String(a[sortConfig.key] || '').toLowerCase();
        const valB = String(b[sortConfig.key] || '').toLowerCase();
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return records;
  }, [searchTerm, positionFilter, joiningDateFilter, statusFilter, sortConfig, employees]);
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <i className="bi bi-arrow-down-up sort-icon ms-1"></i>;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;    return sortConfig.direction === 'ascending' ? <i className="bi bi-sort-up sort-icon active ms-1"></i> : <i className="bi bi-sort-down sort-icon active ms-1"></i>;
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEmployee(null);
  };

  const handleOpenViewModal = (employee) => {
    setSelectedEmployee(employee);
    setIsViewOnlyMode(true);
    setShowModal(true);
  };
  
  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setIsViewOnlyMode(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (e, employee) => {
    e.stopPropagation();
    setSelectedEmployee(employee);
    setIsViewOnlyMode(false);
    setShowModal(true);
  };

 const handleDeleteEmployee = (e, employeeId) => { 
    e.stopPropagation(); 
    if (window.confirm(`Are you sure you want to delete employee ${employeeId}?`)) { 
      handlers.deleteEmployee(employeeId); 
    } 
  };
  
  const handleCloseReportPreview = () => { 
    setShowReportPreviewModal(false); 
    setPdfDataUri(''); 
  };

  const handleSwitchToEditMode = () => {
    setIsViewOnlyMode(false);
  };

  const handleSwitchToViewMode = () => {
    setIsViewOnlyMode(true);
  };

  const generateEmployeeReportPdf = () => {
    if (!filteredAndSortedEmployees || filteredAndSortedEmployees.length === 0) {
        alert("No employee data to generate a report for the current filter.");
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageTitle = "Employee Data Report";
    const generationDate = new Date().toLocaleDateString();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    
    doc.addImage(logo, 'PNG', margin, 20, 80, 26);
    doc.setFontSize(18); doc.setFont(undefined, 'bold');
    doc.text(pageTitle, pageWidth - margin, 40, { align: 'right' });
    doc.setFontSize(10); doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${generationDate}`, pageWidth - margin, 55, { align: 'right' });
    doc.setLineWidth(1);
    doc.line(margin, 70, pageWidth - margin, 70);

    const totalEmployees = filteredAndSortedEmployees.length;
    const positionCounts = filteredAndSortedEmployees.reduce((acc, emp) => {
        acc[emp.position || 'Unassigned'] = (acc[emp.position || 'Unassigned'] || 0) + 1;
        return acc;
    }, {});
    
    let summaryY = 95;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Report Summary', margin, summaryY);
    summaryY += 18;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`- Total Employees in Report: ${totalEmployees}`, margin + 10, summaryY);
    summaryY += 15;
    doc.text(`- Breakdown by Position:`, margin + 10, summaryY);
    summaryY += 15;
    
    Object.entries(positionCounts).forEach(([position, count]) => {
        doc.text(`  • ${position}: ${count} employee(s)`, margin + 20, summaryY);
        summaryY += 15;
    });

    summaryY += 10;

    const tableColumns = ['ID', 'Name', 'Position', 'Email', 'Status', 'Joining Date'];
    const tableRows = filteredAndSortedEmployees.map(emp => [
          emp.id, emp.name, emp.positionTitle, emp.email, emp.status || 'Pending', emp.joiningDate,
    ]);

    autoTable(doc, {
      head: [tableColumns], body: tableRows, startY: 95, theme: 'striped',
      headStyles: { fillColor: [25, 135, 84] },
    });

    setReportTitle(pageTitle);
    const pdfBlob = doc.output('blob');
    setPdfDataUri(URL.createObjectURL(pdfBlob));
    setShowReportPreviewModal(true);
  };
  
  const renderCardView = () => (
    <div className="employee-grid-container">
      {filteredAndSortedEmployees.map(emp => (
        <div 
          key={emp.id} 
          className={`employee-card-v2 ${(emp.status || '') === 'Inactive' ? 'inactive' : ''}`} 
          onClick={() => handleOpenViewModal(emp)}
        > 
          <div className="employee-card-header-v2">
            <span className="employee-id">{emp.id}</span>
            <div className="dropdown">
              <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" onClick={e => e.stopPropagation()} aria-label="Employee Actions">
                  <i className="bi bi-three-dots-vertical"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#" onClick={(e) => handleOpenEditModal(e, emp)}>Edit</a></li>
                <li><a className="dropdown-item text-danger" href="#" onClick={(e) => handleDeleteEmployee(e, emp.id)}>Delete</a></li>
              </ul>
            </div>
          </div>
          <div className="employee-card-body-v2">
            <img src={emp.imageUrl || placeholderImage} alt={emp.name} className="employee-avatar-v2" onError={(e) => { e.target.src = placeholderImage; }} />
            <h5 className="employee-name-v2">{emp.name}</h5>
            <p className="employee-position-v2">{emp.position || 'Unassigned'}</p>
            <span className={`status-badge-employee status-badge-${(emp.status || 'pending').toLowerCase()}`}>{emp.status || 'Pending'}</span>
          </div>
          <div className="employee-details-v2">
              <div className="detail-item">
                  <i className="bi bi-envelope-fill"></i>
                  <a href={`mailto:${emp.email}`} onClick={e => e.stopPropagation()}>{emp.email}</a>
              </div>
              <div className="detail-item">
                  <i className="bi bi-calendar-event-fill"></i>
                  <span>Joined on {emp.joiningDate}</span>
              </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="card data-table-card shadow-sm">
      <div className="table-responsive">
        <table className="table data-table mb-0 align-middle">
          <thead>
            <tr>
              <th className="sortable" onClick={() => requestSort('id')}>Employee ID {getSortIcon('id')}</th>
              <th className="sortable" onClick={() => requestSort('name')}>Name {getSortIcon('name')}</th>
              <th>Position</th>
              <th className="sortable" onClick={() => requestSort('joiningDate')}>Joining Date {getSortIcon('joiningDate')}</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>{filteredAndSortedEmployees.map((emp) => (
            <tr key={emp.id}>
                <td><strong>{emp.id}</strong></td>
              <td>
                <div className="d-flex align-items-center">
                    <img src={emp.imageUrl || placeholderImage} alt={emp.name} className="employee-avatar-table me-2" onError={(e) => { e.target.src = placeholderImage; }} />
                    {emp.name}
                </div>
              </td>
              <td>{emp.positionTitle}</td>
              <td>{emp.joiningDate}</td>
              <td><span className={`status-badge-employee status-badge-${(emp.status || 'pending').toLowerCase()}`}>{emp.status || 'Pending'}</span></td>
              <td>
                <div className="dropdown">
                  <button className="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    Actions
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleOpenViewModal(emp);}}><i className="bi bi-eye-fill me-2"></i>View Details</a></li>
                    <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleOpenEditModal(e, emp);}}><i className="bi bi-pencil-fill me-2"></i>Edit</a></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><a className="dropdown-item text-danger" href="#" onClick={(e) => { e.preventDefault(); handleDeleteEmployee(e, emp.id);}}><i className="bi bi-trash-fill me-2"></i>Delete</a></li>
                  </ul>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );

  const positionMap = useMemo(() => {
    if (!positions || !Array.isArray(positions)) return new Map();
    return new Map(positions.map(p => [p.id, p.title]));
  }, [positions]);

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center"><h1 className="page-main-title me-3">Employee Data</h1><span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill">{filteredAndSortedEmployees.length === employees.length ? `${employees.length} employees` : `Showing ${filteredAndSortedEmployees.length} of ${employees.length}`}</span></div>
        <div className="header-actions d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary" onClick={generateEmployeeReportPdf} disabled={!employees || employees.length === 0}><i className="bi bi-file-earmark-text-fill"></i> Generate Report</button>
            <button className="btn btn-success" onClick={handleOpenAddModal}><i className="bi bi-person-plus-fill"></i> Add New Employee</button>
        </div>
      </header>

      <ul className="nav nav-tabs employee-data-tabs mb-4">
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Employees</button>            
        </li>
        <li className="nav-item">
            <button className={`nav-link ${activeTab === 'requirements' ? 'active' : ''}`} onClick={() => setActiveTab('requirements')}>Government Requirements</button>
        </li>
      </ul>

      {activeTab === 'all' && (
        <>
          <div className="page-controls-bar mb-4">
            <div className="filters-group">
                <div className="input-group">
                    <span className="input-group-text"><i className="bi bi-search"></i></span>
                    <input type="text" className="form-control" placeholder="Search by name, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="form-select" value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>{uniquePositions.map(pos => <option key={pos} value={pos === 'All Positions' ? '' : pos}>{pos}</option>)}</select>
                <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>                   
                    <option value="Inactive">Inactive</option>                    
                </select>
            </div>
            <div className="actions-group">
                <div className="view-toggle-buttons btn-group">
                    <button className={`btn btn-sm ${viewMode === 'card' ? 'active' : 'btn-outline-secondary'}`} onClick={() => setViewMode('card')} title="Card View"><i className="bi bi-grid-3x3-gap-fill"></i></button>              
                    <button className={`btn btn-sm ${viewMode === 'table' ? 'active' : 'btn-outline-secondary'}`} onClick={() => setViewMode('table')} title="List View"><i className="bi bi-list-task"></i></button>                    
                </div>
            </div>
          </div>
          {loading ? (
            <div className="w-100 text-center p-5 bg-light  rounded">
              <div className="spinner-border  text-success" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading employee data...</p>
            </div>
          ) : error ? (
            <div className="text-center p-5 bg-light rounded">
              <p className="text-danger">{error}</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
            </div>
          ) : filteredAndSortedEmployees.length > 0 ? (viewMode === 'card' ? renderCardView() : renderTableView()) : (<div className="text-center p-5 bg-light rounded">
            <i className="bi bi-people-fill fs-1 text-muted mb-3 d-block"></i>
            <h4 className="text-muted">{employees.length === 0 ? "No employees in the system." : "No employees match criteria."}
              </h4>{employees.length === 0 && <p>Click "Add New Employee" to get started.</p>}</div>)}
          {showModal && viewingEmployee && ( <ViewEmployeeDetailsModal employee={viewingEmployee} show={showViewModal} onClose={handleCloseViewModal} positionMap={positionMap} /> )}
          </>
            )}
              {activeTab === 'requirements' && (      
            <RequirementsChecklist employees={employees} />
          )}
      
          {showModal && ( 
            <AddEditEmployeeModal 
              show={showModal} 
              onClose={handleCloseModal} 
              onSave={handlers.saveEmployee} 
              employeeData={selectedEmployee} 
              positions={positions}
              viewOnly={isViewOnlyMode}
              onSwitchToEdit={handleSwitchToEditMode}
            /> 
          )}
     
          {showReportPreviewModal && ( <ReportPreviewModal show={showReportPreviewModal} onClose={handleCloseReportPreview} pdfDataUri={pdfDataUri} reportTitle={reportTitle} /> )}
    </div>
  );
};

export default EmployeeDataPage;