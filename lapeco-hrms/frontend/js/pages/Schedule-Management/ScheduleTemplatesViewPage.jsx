import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScheduleTemplatesView from './ScheduleTemplatesView';
import { templateAPI } from '../../services/api';
import ToastNotification from '../../common/ToastNotification';

const ScheduleTemplatesViewPage = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [templateDetailsById, setTemplateDetailsById] = useState({});
  const [loading, setLoading] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const refreshTemplates = useCallback(async ({ force = false } = {}) => {
    setLoading(true);
    try {
      const response = await templateAPI.getAll();
      const templatesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setTemplates(templatesData);
      return templatesData;
    } catch (error) {
      setToast({ show: true, message: 'Failed to load templates.', type: 'error' });
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplateDetails = useCallback(async (templateId, { force = false } = {}) => {
    if (!templateId) return null;

    if (!force && templateDetailsById[templateId]) {
      return templateDetailsById[templateId];
    }

    try {
      const response = await templateAPI.getById(templateId);
      const templateData = response.data?.template || null;

      const normalizedTemplate = templateData
        ? (() => {
            let columns = templateData.columns;
            if (typeof columns === 'string') {
              try {
                columns = JSON.parse(columns);
              } catch (err) {
                columns = [];
              }
            }
            if (!Array.isArray(columns) && columns) {
              columns = Object.values(columns);
            }
            if (!Array.isArray(columns)) {
              columns = [];
            }

            const assignments = Array.isArray(templateData.assignments)
              ? templateData.assignments.map(assignment => ({
                  ...assignment,
                  user: assignment.user || null,
                }))
              : [];

            return {
              ...templateData,
              columns,
              assignments,
            };
          })()
        : null;

      setTemplateDetailsById(prev => ({
        ...prev,
        [templateId]: normalizedTemplate,
      }));

      return normalizedTemplate;
    } catch (err) {
      console.error('Failed to load template details:', err);
      return null;
    }
  }, [templateDetailsById]);

  useEffect(() => {
    refreshTemplates().catch(() => {});
  }, [refreshTemplates]);

  const filteredTemplates = useMemo(() => {
    if (!templateSearchTerm) return templates;
    return templates.filter(tpl => tpl.name.toLowerCase().includes(templateSearchTerm.toLowerCase()));
  }, [templates, templateSearchTerm]);

  const handleOpenCreateTemplateModal = () => {
    // Navigate to template creation or open modal
    setToast({ show: true, message: 'Template creation feature coming soon', type: 'info' });
  };

  const handleOpenDeleteConfirm = async (templateId) => {
    try {
      await templateAPI.delete(templateId);
      setToast({ show: true, message: 'Template deleted successfully!', type: 'success' });
      await refreshTemplates({ force: true });
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to delete template. Please try again.';
      setToast({ show: true, message, type: 'error' });
    }
  };

  const handleViewTemplateDetails = async (templateInfo) => {
    const detailedTemplate = await loadTemplateDetails(templateInfo.id, { force: false });
    if (detailedTemplate) {
      // Navigate to template details or show modal
      navigate('/dashboard/schedule-management/create', { 
        state: { 
          method: 'template', 
          sourceData: detailedTemplate 
        } 
      });
    }
  };

  const setPreviewData = (data) => {
    // Handle preview data if needed
    console.log('Preview data:', data);
  };

  return (
    <>
      <ScheduleTemplatesView
        templateSearchTerm={templateSearchTerm}
        setTemplateSearchTerm={setTemplateSearchTerm}
        filteredTemplates={filteredTemplates}
        handleOpenCreateTemplateModal={handleOpenCreateTemplateModal}
        handleOpenDeleteConfirm={handleOpenDeleteConfirm}
        setPreviewData={setPreviewData}
        isLoading={loading && templates.length === 0}
        onViewTemplateDetails={handleViewTemplateDetails}
      />
      
      {toast.show && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  );
};

export default ScheduleTemplatesViewPage;
