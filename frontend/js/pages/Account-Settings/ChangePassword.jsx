import React, { useState } from 'react';

const ChangePassword = ({ currentUser, handlers }) => {
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [errors, setErrors] = useState({});

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({...prev, [name]: null}));
        }
    };
    
    const validatePassword = () => {
        const newErrors = {};
        if (!passwordData.currentPassword) newErrors.currentPassword = "Current password is required.";
        if (!passwordData.newPassword) newErrors.newPassword = "New password is required.";
        else if (passwordData.newPassword.length < 8) newErrors.newPassword = "Password must be at least 8 characters.";
        if (passwordData.newPassword !== passwordData.confirmPassword) newErrors.confirmPassword = "Passwords do not match.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSaveChanges = (e) => {
        e.preventDefault();
        if (validatePassword()) {
            const success = handlers.changeMyPassword(currentUser.id, passwordData.currentPassword, passwordData.newPassword);
            if (success) {
                alert("Password changed successfully!");
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setErrors({});
            } else {
                setErrors({ currentPassword: "Your current password is not correct." });
            }
        }
    };

    return (
        <div className="card settings-card">
            <div className="card-header">
                <h5 className="mb-0">Change Password</h5>
            </div>
            <form onSubmit={handleSaveChanges}>
                <div className="card-body">
                    <p className="card-text text-muted">For your security, we recommend choosing a strong password that you don't use anywhere else.</p>
                    <div className="mb-3">
                        <label htmlFor="currentPassword" className="form-label">Current Password</label>
                        <input type="password" className={`form-control ${errors.currentPassword ? 'is-invalid' : ''}`} id="currentPassword" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} />
                        {errors.currentPassword && <div className="invalid-feedback">{errors.currentPassword}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="newPassword" className="form-label">New Password</label>
                        <input type="password" className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`} id="newPassword" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} />
                        {errors.newPassword && <div className="invalid-feedback">{errors.newPassword}</div>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                        <input type="password" className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`} id="confirmPassword" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} />
                        {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword}</div>}
                    </div>
                </div>
                <div className="card-footer text-end">
                    <button type="submit" className="btn btn-success">Update Password</button>
                </div>
            </form>
        </div>
    );
};

export default ChangePassword;