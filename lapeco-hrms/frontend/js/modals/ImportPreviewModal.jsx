import React, { useState, useMemo } from 'react';

const ImportPreviewModal = ({ 
  show, 
  onClose, 
  importData, 
  onConfirm, 
  isLoading,
  employeesList = [],
  onEmployeeSearch,
  onEmployeeAdd
}) => {
  const [editedData, setEditedData] = useState(importData);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchingEmployee, setSearchingEmployee] = useState(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm) return employeesList;
    const term = employeeSearchTerm.toLowerCase();
    return employeesList.filter(emp => 
      emp.name.toLowerCase().includes(term) || 
      emp.id.toString().includes(term)
    );
  }, [employeesList, employeeSearchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = editedData.length;
    const matched = editedData.filter(row => row.matchStatus === 'matched').length;
    const unmatched = editedData.filter(row => row.matchStatus === 'unmatched').length;
    const excluded = editedData.filter(row => row.excluded).length;
    
    return { total, matched, unmatched, excluded, toImport: total - excluded };
  }, [editedData]);

  const handleRemoveRow = (index) => {
    const updated = [...editedData];
    updated[index].excluded = !updated[index].excluded;
    setEditedData(updated);
  };

  const handleEditField = (index, field, value) => {
    const updated = [...editedData];
    updated[index][field] = value;
    setEditedData(updated);
  };

  const handleEmployeeMatch = (rowIndex, employee) => {
    const updated = [...editedData];
    updated[rowIndex].employeeId = employee.id;
    updated[rowIndex].employeeName = employee.name;
    updated[rowIndex].matchStatus = 'matched';
    setEditedData(updated);
    setSearchingEmployee(null);
    setEmployeeSearchTerm('');
  };

  const handleExcludeUnmatched = (rowIndex) => {
    const updated = [...editedData];
    updated[rowIndex].excluded = true;
    setEditedData(updated);
    setSearchingEmployee(null);
  };

  const handleConfirm = () => {
    const dataToImport = editedData.filter(row => !row.excluded);
    onConfirm(dataToImport);
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="bi bi-file-earmark-spreadsheet me-2"></i>
              Import Attendance Records Preview
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              disabled={isLoading}
            ></button>
          </div>

          <div className="modal-body p-0">
            {/* Statistics Bar */}
            <div className="p-3 bg-light border-bottom">
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-list-ul fs-4 text-primary me-2"></i>
                    <div>
                      <small className="text-muted d-block">Total Records</small>
                      <strong className="fs-5">{stats.total}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle fs-4 text-success me-2"></i>
                    <div>
                      <small className="text-muted d-block">Matched</small>
                      <strong className="fs-5 text-success">{stats.matched}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-exclamation-circle fs-4 text-warning me-2"></i>
                    <div>
                      <small className="text-muted d-block">Unmatched</small>
                      <strong className="fs-5 text-warning">{stats.unmatched}</strong>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-x-circle fs-4 text-danger me-2"></i>
                    <div>
                      <small className="text-muted d-block">Excluded</small>
                      <strong className="fs-5 text-danger">{stats.excluded}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Search Modal */}
            {searchingEmployee !== null && (
              <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                   style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
                <div className="bg-white rounded shadow-lg p-4" style={{ width: '500px', maxHeight: '600px' }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="m-0">Search Employee</h6>
                    <button 
                      className="btn-close" 
                      onClick={() => {
                        setSearchingEmployee(null);
                        setEmployeeSearchTerm('');
                      }}
                    ></button>
                  </div>
                  
                  <div className="alert alert-info small mb-3">
                    <strong>Unmatched Employee:</strong> {editedData[searchingEmployee]?.name} (ID: {editedData[searchingEmployee]?.idNumber})
                  </div>

                  <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="Search by name or ID..."
                    value={employeeSearchTerm}
                    onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                    autoFocus
                  />

                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {filteredEmployees.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-search fs-1 d-block mb-2"></i>
                        <p>No employees found</p>
                      </div>
                    ) : (
                      filteredEmployees.map(emp => (
                        <div 
                          key={emp.id}
                          className="border rounded p-2 mb-2 cursor-pointer hover-bg-light"
                          onClick={() => handleEmployeeMatch(searchingEmployee, emp)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{emp.name}</strong>
                              <small className="text-muted d-block">ID: {emp.id}</small>
                            </div>
                            <button className="btn btn-sm btn-outline-primary">
                              Select
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-top">
                    <button 
                      className="btn btn-outline-danger btn-sm w-100"
                      onClick={() => handleExcludeUnmatched(searchingEmployee)}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Exclude This Record
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="table-responsive" style={{ maxHeight: '400px' }}>
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light sticky-top">
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '150px' }}>Name</th>
                    <th style={{ width: '80px' }}>ID</th>
                    <th style={{ width: '150px' }}>Date/Time</th>
                    <th style={{ width: '100px' }}>Log Type</th>
                    <th style={{ width: '100px' }}>Department</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedData.map((row, index) => (
                    <tr 
                      key={index} 
                      className={row.excluded ? 'table-secondary text-muted' : ''}
                      style={{ opacity: row.excluded ? 0.6 : 1 }}
                    >
                      <td>{index + 1}</td>
                      <td>
                        {row.matchStatus === 'matched' && !row.excluded && (
                          <span className="badge bg-success">
                            <i className="bi bi-check-circle me-1"></i>Matched
                          </span>
                        )}
                        {row.matchStatus === 'unmatched' && !row.excluded && (
                          <span className="badge bg-warning">
                            <i className="bi bi-exclamation-circle me-1"></i>Unmatched
                          </span>
                        )}
                        {row.excluded && (
                          <span className="badge bg-danger">
                            <i className="bi bi-x-circle me-1"></i>Excluded
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {row.name}
                          {row.matchStatus === 'unmatched' && !row.excluded && (
                            <button
                              className="btn btn-sm btn-outline-primary py-0 px-1"
                              onClick={() => setSearchingEmployee(index)}
                              title="Search for employee"
                            >
                              <i className="bi bi-search"></i>
                            </button>
                          )}
                        </div>
                      </td>
                      <td>{row.idNumber}</td>
                      <td>
                        <small>{new Date(row.dateTime).toLocaleString()}</small>
                      </td>
                      <td>
                        <span className={`badge ${
                          row.logType === 'Sign In' ? 'bg-primary' :
                          row.logType === 'Sign Out' ? 'bg-info' :
                          row.logType === 'Break Out' ? 'bg-warning text-dark' :
                          row.logType === 'Break In' ? 'bg-secondary' : 'bg-light text-dark'
                        }`}>
                          {row.logType}
                        </span>
                      </td>
                      <td><small>{row.department}</small></td>
                      <td>
                        <button
                          className={`btn btn-sm ${row.excluded ? 'btn-success' : 'btn-outline-danger'}`}
                          onClick={() => handleRemoveRow(index)}
                          disabled={isLoading}
                          title={row.excluded ? 'Include' : 'Exclude'}
                        >
                          <i className={`bi ${row.excluded ? 'bi-arrow-counterclockwise' : 'bi-trash'}`}></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editedData.length === 0 && (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                <p>No records to preview</p>
              </div>
            )}
          </div>

          <div className="modal-footer bg-light">
            <div className="me-auto">
              <small className="text-muted">
                {stats.toImport} record(s) will be imported
                {stats.unmatched > 0 && (
                  <span className="text-warning ms-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {stats.unmatched} unmatched
                  </span>
                )}
              </small>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleConfirm}
              disabled={isLoading || stats.toImport === 0 || stats.unmatched > 0}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Importing...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Confirm Import ({stats.toImport})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPreviewModal;