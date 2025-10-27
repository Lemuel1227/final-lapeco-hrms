import React from 'react';

const ScheduleTemplatesView = ({
  templateSearchTerm,
  setTemplateSearchTerm,
  filteredTemplates,
  handleOpenCreateTemplateModal,
  handleOpenDeleteConfirm,
  setPreviewData,
  isLoading = false,
  onViewTemplateDetails
}) => {
  return (
    <div className="templates-container">
      <div className="schedule-list-controls">
        <div className="input-group" style={{maxWidth: '400px'}}>
          <span className="input-group-text">
            <i className="bi bi-search"></i>
          </span>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by template name..." 
            value={templateSearchTerm} 
            onChange={(e) => setTemplateSearchTerm(e.target.value)} 
          />
        </div>
      </div>
      
      <div className="schedule-card-grid mt-3">
        {/* Create New Template Card */}
        <div 
          className="schedule-item-card" 
          style={{
            borderStyle: 'dashed', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '180px', 
            cursor: 'pointer'
          }} 
          onClick={() => handleOpenCreateTemplateModal()}
        >
          <div className="text-center text-muted">
            <i className="bi bi-plus-square-dotted fs-3"></i>
            <p className="mt-2 mb-0 fw-semibold" style={{fontSize: '0.9rem'}}>Create New Template</p>
          </div>
        </div>
        
        {/* Template Cards */}
        {isLoading ? (
          <div className="w-100 text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading templates...</p>
          </div>
        ) : filteredTemplates.length > 0 ? (
          filteredTemplates.map(tpl => (
            <div key={tpl.id} className="schedule-item-card type-template">
              <div className="card-header">
                <h5 className="card-title">{tpl.name}</h5>
              </div>
              <div className="card-body">
                <dl className="mb-0">
                  <div className="template-info-section">
                    <dt>Description</dt>
                    <dd>{tpl.description || 'No description provided'}</dd>
                  </div>
                  <div className="template-info-section">
                    <dt>Template Columns</dt>
                    <dd>
                      <div className="d-flex flex-wrap gap-1">
                        {(tpl.columns || []).map(key => (
                          <span 
                            key={key} 
                            className="badge bg-secondary" 
                            style={{fontSize: '0.75rem'}}
                          >
                            {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </dd>
                  </div>
                  <div className="template-info-section">
                    <dt>Assigned Employees</dt>
                    <dd>{tpl.assignments?.length || 0} employees</dd>
                  </div>
                </dl>
              </div>
              <div className="card-footer">
                <button 
                  className="btn btn-sm btn-outline-danger" 
                  onClick={() => handleOpenDeleteConfirm(tpl, 'template')}
                >
                  Delete
                </button>
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => handleOpenCreateTemplateModal(tpl)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-sm btn-success" 
                  onClick={() => onViewTemplateDetails ? onViewTemplateDetails(tpl) : setPreviewData({ ...tpl, type: 'template' })}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="w-100">
            <p className="text-muted text-center mt-4">No templates match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleTemplatesView;