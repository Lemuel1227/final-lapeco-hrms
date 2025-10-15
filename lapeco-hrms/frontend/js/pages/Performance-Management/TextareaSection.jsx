import React from 'react';

const TextareaSection = ({ factor, value, onValueChange }) => {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">{factor.title}</h5>
      </div>
      <div className="card-body">
        <label htmlFor={factor.id} className="form-label text-muted small">{factor.description}</label>
        <textarea 
          id={factor.id}
          className="form-control" 
          rows="4"
          value={value || ''}
          onChange={(e) => onValueChange(factor.id, 'value', e.target.value)}
        ></textarea>
      </div>
    </div>
  );
};

export default TextareaSection;