import React from 'react';

const ReportCard = ({ title, description, icon, onGenerate }) => {
  return (
    <div className="report-card-v2">
      <div className="report-card-v2-body">
        <div className="card-icon">
          <i className={`bi ${icon}`}></i>
        </div>
        <div className="card-info">
          <h5 className="card-title">{title}</h5>
          <p className="card-description">{description}</p>
        </div>
      </div>
      <div className="report-card-v2-footer">
        <button className="btn btn-sm btn-success" onClick={onGenerate}>
          Generate <i className="bi bi-arrow-right-short"></i>
        </button>
      </div>
    </div>
  );
};

export default ReportCard;