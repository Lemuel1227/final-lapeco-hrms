import React, { useState, useEffect, useMemo } from 'react';
import { templateAPI, scheduleAPI } from '../../services/api';
import ConfirmationModal from '../../modals/ConfirmationModal';
import CreateTemplateModal from '../../modals/CreateTemplateModal';
import SelectDateForScheduleModal from '../../modals/SelectDateForScheduleModal';
import ScheduleDetailsView from './ScheduleDetailsView';
import ToastNotification from '../../common/ToastNotification';
import { useNavigate } from 'react-router-dom';

const ScheduleTemplatesView = () => {
  const navigate = useNavigate();
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsView, setShowDetailsView] = useState(false);
  const [templateDetails, setTemplateDetails] = useState(null);
  const [creationSource, setCreationSource] = useState(null);
  const [showSelectDateModal, setShowSelectDateModal] = useState(false);
  const [existingScheduleDatesSet, setExistingScheduleDatesSet] = useState(new Set());
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        console.log('Loading templates...');
        const response = await templateAPI.getAll();
        console.log('Templates API response:', response);
        
        // Handle different possible API response structures
        const templatesData = response.data?.data || response.data || [];
        console.log('Templates data:', templatesData);
        
        setTemplates(Array.isArray(templatesData) ? templatesData : []);
      } catch (error) {
        console.error('Failed to load templates:', error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
    
    const loadExistingScheduleDates = async () => {
      try {
        const response = await scheduleAPI.getAllBasic();
        const schedulesData = response.data?.data || response.data || [];
        
        const datesSet = new Set();
        if (Array.isArray(schedulesData)) {
          schedulesData.forEach(schedule => {
            if (schedule.date) {
              datesSet.add(schedule.date.split('T')[0]); // Get just the date part
            }
          });
        }
        setExistingScheduleDatesSet(datesSet);
      } catch (error) {
        console.error('Failed to load existing schedule dates:', error);
        setExistingScheduleDatesSet(new Set());
      }
    };
    
    loadTemplates();
    loadExistingScheduleDates();
  }, []);

  const filteredTemplates = useMemo(() => {
    // Ensure templates is always an array
    const templatesArray = Array.isArray(templates) ? templates : [];
    return templatesArray.filter(template => 
      template.name?.toLowerCase().includes(templateSearchTerm.toLowerCase())
    );
  }, [templates, templateSearchTerm]);

  const handleDeleteTemplate = (template) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  const handleViewTemplateDetails = async (template) => {
    try {
      // Load full template details
      const response = await templateAPI.getById(template.id);
      const fullTemplateData = response.data?.template || null;
      
      console.log('Template details API response:', response);
      console.log('Full template data:', fullTemplateData);
      
      setTemplateDetails({
        info: template,
        type: 'template',
        fullData: fullTemplateData
      });
      setShowDetailsView(true);
    } catch (error) {
      console.error('Failed to load template details:', error);
      // Still show details view with basic info if full data fails
      setTemplateDetails({
        info: template,
        type: 'template',
        fullData: null
      });
      setShowDetailsView(true);
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setShowEditModal(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handleEditModalSave = async (templateData) => {
    try {
      if (selectedTemplate?.id) {
        // Update existing template
        await templateAPI.update(selectedTemplate.id, templateData);
        setToast({ show: true, message: 'Template updated successfully!', type: 'success' });
      } else {
        // Create new template
        await templateAPI.create(templateData);
        setToast({ show: true, message: 'Template created successfully!', type: 'success' });
      }
      
      // Refresh the templates list
      const response = await templateAPI.getAll();
      const templatesData = response.data?.data || response.data || [];
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      
      setShowEditModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
      const message = error?.response?.data?.message || 'Failed to save template. Please try again.';
      setToast({ show: true, message, type: 'error' });
    }
  };

  const handleStartCreationFlow = (source) => {
    setCreationSource(source);
    setShowSelectDateModal(true);
  };

  const handleProceedToBuilder = (selectedDates) => {
    navigate('/dashboard/schedule-management/create', { 
      state: { 
        dates: Array.isArray(selectedDates) ? selectedDates : [selectedDates], 
        method: creationSource.type, 
        sourceData: creationSource.data,
        sourceScheduleInfo: creationSource.sourceScheduleInfo
      } 
    });
    setShowSelectDateModal(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (selectedTemplate?.id) {
        await templateAPI.delete(selectedTemplate.id);
        
        // Refresh the templates list
        const response = await templateAPI.getAll();
        const templatesData = response.data?.data || response.data || [];
        setTemplates(Array.isArray(templatesData) ? templatesData : []);
        
        setShowDeleteModal(false);
        setSelectedTemplate(null);
        setToast({ show: true, message: 'Template deleted successfully!', type: 'success' });
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      const message = error?.response?.data?.message || 'Failed to delete template. Please try again.';
      setToast({ show: true, message, type: 'error' });
    }
  };

  const formatTimeToAMPM = (time) => {
    if (!time) return '---';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="templates-container">
      {showDetailsView ? (
        <ScheduleDetailsView
          previewData={templateDetails}
          schedulesByDate={{}}
          formatTimeToAMPM={formatTimeToAMPM}
          onBack={() => {
            setShowDetailsView(false);
            setTemplateDetails(null);
          }}
          onStartCreationFlow={handleStartCreationFlow}
        />
      ) : (
        <>
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
          onClick={handleCreateTemplate}
        >
          <div className="text-center text-muted">
            <i className="bi bi-plus-square-dotted fs-3"></i>
            <p className="mt-2 mb-0 fw-semibold" style={{fontSize: '0.9rem'}}>Create New Template</p>
          </div>
        </div>
        
        {/* Template Cards */}
        {loading ? (
          <div className="w-100 text-center py-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading templates...</p>
          </div>
        ) : filteredTemplates?.length > 0 ? (
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
                  onClick={() => handleDeleteTemplate(tpl)}
                >
                  Delete
                </button>
                <button 
                  className="btn btn-sm btn-outline-secondary" 
                  onClick={() => handleEditTemplate(tpl)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-sm btn-success" 
                  onClick={() => handleViewTemplateDetails(tpl)}
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
        </>
      )}
      
      <ConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedTemplate(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        message={`Are you sure you want to delete the template "${selectedTemplate?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
      
      <CreateTemplateModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTemplate(null);
        }}
        onSave={handleEditModalSave}
        templateData={selectedTemplate}
        positions={[]} // TODO: Load positions if needed for template editing
      />
      
      {/* Toast Notification */}
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
      
      {showSelectDateModal && (
        <SelectDateForScheduleModal 
          show={showSelectDateModal} 
          onClose={() => setShowSelectDateModal(false)} 
          onProceed={handleProceedToBuilder} 
          existingScheduleDates={existingScheduleDatesSet} 
        />
      )}
    </div>
  );
};

export default ScheduleTemplatesView;