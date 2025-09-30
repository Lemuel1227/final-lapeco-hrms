import React, { useState, useMemo } from 'react';
import ReportCard from './ReportCard';
import ReportConfigurationModal from '../../modals/ReportConfigurationModal';
import ReportPreviewModal from '../../modals/ReportPreviewModal';
import useReportGenerator from '../../hooks/useReportGenerator';
import { reportsConfig, reportCategories } from '../../config/reports.config';
import './ReportsPage.css';

const ReportsPage = (props) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [configModalState, setConfigModalState] = useState({ show: false, config: null });
  const [showPreview, setShowPreview] = useState(false);
  
  const { generateReport, pdfDataUri, isLoading, setPdfDataUri } = useReportGenerator();

  const reportCounts = useMemo(() => {
    const counts = reportsConfig.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {});
    counts.All = reportsConfig.length;
    return counts;
  }, []);

  const filteredReports = useMemo(() => {
    let reports = [...reportsConfig];
    if (activeCategory !== 'All') {
      reports = reports.filter(r => r.category === activeCategory);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      reports = reports.filter(
        r => r.title.toLowerCase().includes(lowerSearch) || r.description.toLowerCase().includes(lowerSearch)
      );
    }
    return reports;
  }, [activeCategory, searchTerm]);

  const handleOpenConfig = (reportConfig) => {
    if (reportConfig.parameters) {
      setConfigModalState({ show: true, config: reportConfig });
    } else {
      handleRunReport(reportConfig.id, {});
    }
  };

  const handleRunReport = (reportId, params) => {
    generateReport(reportId, params, props);
    setConfigModalState({ show: false, config: null });
    setShowPreview(true);
  };
  
  const handleClosePreview = () => {
    setShowPreview(false);
    if (pdfDataUri) {
        URL.revokeObjectURL(pdfDataUri);
    }
    setPdfDataUri('');
  };

  const categories = ['All', ...Object.values(reportCategories)];

  return (
    <div className="container-fluid p-0 page-module-container">
      <header className="page-header mb-4">
        <h1 className="page-main-title">Reports Center</h1>
        <p className="text-muted">Select a category and generate report.</p>
      </header>
      
      <div className="reports-category-filter">
        {categories.map(category => (
          (reportCounts[category] > 0 || category === 'All') && (
            <button
              key={category}
              className={`category-filter-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              <span>{category}</span>
              <span className="badge rounded-pill">{reportCounts[category]}</span>
            </button>
          )
        ))}
      </div>

      <div className="reports-content-area">
        <div className="input-group search-bar">
          <span className="input-group-text"><i className="bi bi-search"></i></span>
          <input
            type="text"
            className="form-control"
            placeholder={`Search all reports...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="reports-grid-v2">
          {filteredReports.map(config => (
            <ReportCard
              key={config.id}
              title={config.title}
              description={config.description}
              icon={config.icon}
              onGenerate={() => handleOpenConfig(config)}
            />
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center p-5 bg-light rounded">
              <h5>No Reports Found</h5>
              <p className="text-muted">Try adjusting your category selection or search term.</p>
          </div>
        )}
      </div>

      <ReportConfigurationModal
        show={configModalState.show}
        onClose={() => setConfigModalState({ show: false, config: null })}
        reportConfig={configModalState.config}
        onRunReport={handleRunReport}
        trainingPrograms={props.trainingPrograms}
        payrolls={props.payrolls} 
      />

      {isLoading && (
         <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content"><div className="modal-body text-center p-4">
                    <div className="spinner-border text-success mb-3" role="status"><span className="visually-hidden">Loading...</span></div>
                    <h4>Generating Report...</h4>
                </div></div>
            </div>
        </div>
      )}

      {pdfDataUri && (
         <ReportPreviewModal
            show={showPreview}
            onClose={handleClosePreview}
            pdfDataUri={pdfDataUri}
            reportTitle={configModalState.config?.title || 'Report Preview'}
        />
      )}
    </div>
  );
};

export default ReportsPage;