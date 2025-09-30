import React, { useState } from 'react';
import ConfirmationModal from '../../modals/ConfirmationModal';

const AdminSettings = ({ onReset }) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleConfirmReset = () => {
        onReset();
        setShowConfirmModal(false);
    };

    return (
        <>
            <div className="card settings-card border-danger">
                <div className="card-header bg-danger-subtle">
                    <h5 className="mb-0 text-danger-emphasis"><i className="bi bi-exclamation-triangle-fill me-2"></i>Danger Zone</h5>
                </div>
                <div className="card-body">
                    <p className="card-text">
                        This is a high-risk action intended for development and demonstration purposes only.
                    </p>
                    <div className="alert alert-danger">
                        <strong>Warning:</strong> Clicking this button will reset all data in the application—including employees, schedules, payrolls, and accounts—to its original default state. All changes will be lost.
                    </div>
                </div>
                <div className="card-footer text-end">
                    <button className="btn btn-danger" onClick={() => setShowConfirmModal(true)}>
                        Reset All Application Data
                    </button>
                </div>
            </div>

            <ConfirmationModal
                show={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmReset}
                title="Confirm Full Data Reset"
                confirmText="Yes, I understand, reset everything"
                confirmVariant="danger"
            >
                <p>Are you absolutely sure you want to proceed? This will wipe all current data and restore the initial mock data.</p>
                <p className="fw-bold text-danger">This action is irreversible.</p>
            </ConfirmationModal>
        </>
    );
};

export default AdminSettings;