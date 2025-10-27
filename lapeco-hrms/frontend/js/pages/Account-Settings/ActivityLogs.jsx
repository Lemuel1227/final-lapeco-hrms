import React, { useState, useEffect, useMemo } from 'react';
import { getActivityLogs, getActionTypes, getEntityTypes } from '../../services/accountService';
import { formatDistanceToNow, format, parseISO, isToday, isYesterday, startOfDay } from 'date-fns';
import './ActivityLogs.css';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
    total: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    action_type: '',
    entity_type: '',
    from_date: '',
    to_date: '',
    search: ''
  });
  
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'table'
  
  const [actionTypes, setActionTypes] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);

  useEffect(() => {
    loadActivityLogs();
    loadFilters();
  }, [pagination.currentPage]);

  const loadFilters = async () => {
    try {
      const [actions, entities] = await Promise.all([
        getActionTypes(),
        getEntityTypes()
      ]);
      setActionTypes(actions || []);
      setEntityTypes(entities || []);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.currentPage,
        per_page: pagination.perPage
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });
      
      const data = await getActivityLogs(params);
      setLogs(data.data || []);
      setPagination({
        currentPage: data.current_page,
        lastPage: data.last_page,
        perPage: data.per_page,
        total: data.total
      });
      setError(null);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
      setError('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilters = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    loadActivityLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      action_type: '',
      entity_type: '',
      from_date: '',
      to_date: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setTimeout(() => loadActivityLogs(), 0);
  };
  
  const filteredLogs = useMemo(() => {
    if (!filters.search) return logs;
    const searchLower = filters.search.toLowerCase();
    return logs.filter(log => 
      log.description?.toLowerCase().includes(searchLower) ||
      log.entity_type?.toLowerCase().includes(searchLower) ||
      log.action_type?.toLowerCase().includes(searchLower)
    );
  }, [logs, filters.search]);
  
  const displayLogs = filters.search ? filteredLogs : logs;

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const getActionIcon = (actionType) => {
    const iconMap = {
      'login': 'bi-box-arrow-in-right',
      'logout': 'bi-box-arrow-right',
      'create': 'bi-plus-circle',
      'update': 'bi-pencil-square',
      'delete': 'bi-trash',
      'view': 'bi-eye',
      'export': 'bi-download',
      'upload': 'bi-upload',
      'approve': 'bi-check-circle',
      'reject': 'bi-x-circle',
      'send': 'bi-send'
    };
    return iconMap[actionType] || 'bi-activity';
  };
  
  const getActionBadgeClass = (actionType) => {
    const actionMap = {
      'login': 'success',
      'logout': 'secondary',
      'create': 'primary',
      'update': 'info',
      'delete': 'danger',
      'view': 'light',
      'export': 'warning',
      'approve': 'success',
      'reject': 'danger'
    };
    return actionMap[actionType] || 'secondary';
  };
  
  const groupLogsByDate = (logs) => {
    const grouped = {};
    logs.forEach(log => {
      const date = startOfDay(parseISO(log.created_at)).toISOString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(log);
    });
    return grouped;
  };
  
  const getDateLabel = (dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM dd, yyyy');
  };
  
  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs]);

  if (loading && logs.length === 0) {
    return (
      <div className="card settings-card">
        <div className="card-header">
          <h5 className="mb-0">Activity Logs</h5>
        </div>
        <div className="card-body text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card settings-card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-0"><i className="bi bi-clock-history me-2"></i>Activity Logs</h5>
          <small className="text-muted">Track all actions performed on your account</small>
        </div>
        <div className="btn-group btn-group-sm" role="group">
          <button 
            type="button" 
            className={`btn ${viewMode === 'timeline' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('timeline')}
          >
            <i className="bi bi-list-ul"></i> Timeline
          </button>
          <button 
            type="button" 
            className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('table')}
          >
            <i className="bi bi-table"></i> Table
          </button>
        </div>
      </div>
      <div className="card-body">
        
        {/* Filters */}
        <div className="row mb-4 g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label small text-muted mb-1">Search</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search activities..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Action Type</label>
            <select 
              className="form-select form-select-sm" 
              name="action_type" 
              value={filters.action_type}
              onChange={handleFilterChange}
            >
              <option value="">All Actions</option>
              {actionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">Entity Type</label>
            <select 
              className="form-select form-select-sm" 
              name="entity_type" 
              value={filters.entity_type}
              onChange={handleFilterChange}
            >
              <option value="">All Entities</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <input 
              type="date" 
              className="form-control form-control-sm" 
              name="from_date"
              value={filters.from_date}
              onChange={handleFilterChange}
              placeholder="From Date"
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small text-muted mb-1">To Date</label>
            <input 
              type="date" 
              className="form-control form-control-sm" 
              name="to_date"
              value={filters.to_date}
              onChange={handleFilterChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-12 d-flex gap-2">
            <button 
              className="btn btn-sm btn-primary me-1" 
              onClick={handleApplyFilters}
            >
              Apply
            </button>
            <button 
              className="btn btn-sm btn-outline-secondary" 
              onClick={handleClearFilters}
            >
              Clear
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>{error}
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="activity-timeline">
            {displayLogs.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                <h6 className="text-muted">No activity logs found</h6>
                <p className="text-muted small">Try adjusting your filters</p>
              </div>
            ) : (
              Object.entries(groupLogsByDate(displayLogs)).map(([dateStr, dateLogs]) => (
                <div key={dateStr} className="timeline-group mb-4">
                  <div className="timeline-date-header sticky-top bg-white">
                    <h6 className="text-muted mb-3">
                      <i className="bi bi-calendar3 me-2"></i>
                      {getDateLabel(dateStr)}
                    </h6>
                  </div>
                  <div className="timeline-items">
                    {dateLogs.map((log, index) => (
                      <div key={log.id} className="timeline-item">
                        <div className="timeline-marker">
                          <div className={`timeline-icon bg-${getActionBadgeClass(log.action_type)}-subtle text-${getActionBadgeClass(log.action_type)}`}>
                            <i className={`bi ${getActionIcon(log.action_type)}`}></i>
                          </div>
                          {index !== dateLogs.length - 1 && <div className="timeline-line"></div>}
                        </div>
                        <div className="timeline-content">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <span className={`badge bg-${getActionBadgeClass(log.action_type)}-subtle text-${getActionBadgeClass(log.action_type)}`}>
                                  {log.action_type}
                                </span>
                                {log.entity_type && (
                                  <span className="badge bg-light text-dark">
                                    {log.entity_type}
                                    {log.entity_id && ` #${log.entity_id}`}
                                  </span>
                                )}
                              </div>
                              <p className="mb-1">{log.description}</p>
                              <div className="d-flex gap-3 text-muted small">
                                <span>
                                  <i className="bi bi-clock me-1"></i>
                                  {format(parseISO(log.created_at), 'h:mm a')}
                                </span>
                                {log.ip_address && (
                                  <span>
                                    <i className="bi bi-geo-alt me-1"></i>
                                    {log.ip_address}
                                  </span>
                                )}
                              </div>
                            </div>
                            <small className="text-muted text-nowrap">
                              {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{width: '15%'}}>Action</th>
                  <th>Description</th>
                  <th style={{width: '15%'}}>Entity</th>
                  <th style={{width: '18%'}}>Time</th>
                  <th style={{width: '12%'}}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <i className="bi bi-inbox fs-1 text-muted mb-3 d-block"></i>
                      <h6 className="text-muted">No activity logs found</h6>
                      <p className="text-muted small">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  displayLogs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className={`activity-icon-sm bg-${getActionBadgeClass(log.action_type)}-subtle text-${getActionBadgeClass(log.action_type)}`}>
                            <i className={`bi ${getActionIcon(log.action_type)}`}></i>
                          </div>
                          <span className="small fw-medium">{log.action_type}</span>
                        </div>
                      </td>
                      <td>
                        <div className="activity-description">{log.description}</div>
                      </td>
                      <td>
                        {log.entity_type && (
                          <span className="badge bg-light text-dark">
                            {log.entity_type}
                            {log.entity_id && <><br/><small>#{log.entity_id}</small></>}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <small className="text-muted">
                            {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
                          </small>
                          <small className="text-muted">
                            {format(parseISO(log.created_at), 'MMM dd, yyyy h:mm a')}
                          </small>
                        </div>
                      </td>
                      <td>
                        <small className="text-muted font-monospace">{log.ip_address || '-'}</small>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.lastPage > 1 && (
          <nav aria-label="Activity logs pagination">
            <ul className="pagination pagination-sm justify-content-center mb-0">
              <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                >
                  Previous
                </button>
              </li>
              {[...Array(pagination.lastPage)].map((_, index) => {
                const page = index + 1;
                if (
                  page === 1 ||
                  page === pagination.lastPage ||
                  (page >= pagination.currentPage - 1 && page <= pagination.currentPage + 1)
                ) {
                  return (
                    <li 
                      key={page} 
                      className={`page-item ${pagination.currentPage === page ? 'active' : ''}`}
                    >
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </li>
                  );
                } else if (
                  page === pagination.currentPage - 2 ||
                  page === pagination.currentPage + 2
                ) {
                  return <li key={page} className="page-item disabled"><span className="page-link">...</span></li>;
                }
                return null;
              })}
              <li className={`page-item ${pagination.currentPage === pagination.lastPage ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.lastPage}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        )}
        
        {pagination.total > 0 && (
          <div className="text-center mt-2">
            <small className="text-muted">
              Showing {logs.length} of {pagination.total} activities
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;