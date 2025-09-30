import React, { useState } from 'react';
import ResetDataModal from '../../modals/ResetDataModal';

const DataManagementSettings = ({ onReset }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="card settings-card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-database-fill-x me-2 text-danger"></i>Data Management
          </h5>
        </div>
        <div className="card-body">
          <p className="card-text text-muted">
            Perform high-level data operations. These actions are irreversible and should be used with extreme caution.
          </p>
          <div className="alert alert-danger">
            <strong>Warning:</strong> Resetting data will permanently delete records and restore them to their initial mock state. This cannot be undone.
          </div>
        </div>
        <div className="card-footer text-end">
          <button className="btn btn-danger" onClick={() => setIsModalOpen(true)}>
            Reset Application Data...
          </button>
        </div>
      </div>

      <ResetDataModal
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirmReset={onReset}
      />
    </>
  );
};

export default DataManagementSettings;