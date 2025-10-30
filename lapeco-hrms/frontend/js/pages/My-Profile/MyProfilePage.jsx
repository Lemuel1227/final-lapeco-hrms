import React, { useState, useEffect, useRef } from 'react';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import { USER_ROLES } from '../../constants/roles';
import { employeeAPI } from '../../services/api';
import './MyProfilePage.css';
import ResumeIframe from '../../common/ResumeIframe';
import ToastNotification from '../../common/ToastNotification';
import ConfirmationModal from '../../modals/ConfirmationModal';
import api from '../../services/api';

const formatSssNumber = (value = '') => {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length !== 10) {
    return value?.trim() || '';
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 9)}-${digits.slice(9)}`;
};

const formatTinNumber = (value = '') => {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 12) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return value?.trim() || '';
};

const formatPagIbigNumber = (value = '') => {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length !== 12) {
    return value?.trim() || '';
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
};

const formatPhilhealthNumber = (value = '') => {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length !== 12) {
    return value?.trim() || '';
  }
  return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11)}`;
};

const InfoField = ({ label, value }) => (
    <div className="info-field">
        <label className="info-label">{label}</label>
        <p className="info-value">{value || 'N/A'}</p>
    </div>
);

const MyProfilePage = () => {
    const [activeTab, setActiveTab] = useState('personal');
    const [formData, setFormData] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [resumeFile, setResumeFile] = useState(null);
    const [resumePreview, setResumePreview] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    const fileInputRef = useRef(null);
    const isHrUser = userRole === USER_ROLES.HR_PERSONNEL;

    // Fetch current user data from API
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.get('/user');
                const userData = response.data;
                setCurrentUser(userData);
                setUserRole(userData.role || USER_ROLES.HR_PERSONNEL);
                
                // Update localStorage with fresh data
                localStorage.setItem('user', JSON.stringify(userData));
            } catch (error) {
                console.error('Error fetching user data:', error);
                // Fallback to localStorage if API fails
                try {
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        const userData = JSON.parse(storedUser);
                        setCurrentUser(userData);
                        setUserRole(userData.role || USER_ROLES.HR_PERSONNEL);
                    }
                } catch (err) {
                    console.error('Error parsing stored user:', err);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Update form data when currentUser changes
    useEffect(() => {
        if (currentUser) {
            setFormData({
                contact_number: currentUser.contact_number || '',
                address: currentUser.address || '',
                sss_no: currentUser.sss_no || '',
                tin_no: currentUser.tin_no || '',
                pag_ibig_no: currentUser.pag_ibig_no || '',
                philhealth_no: currentUser.philhealth_no || '',
            });
            // Set resume URL - if user has resume_file, create API URL
            if (currentUser.resume_file) {
                setResumePreview(`http://localhost:8000/api/employees/${currentUser.id}/resume`);
            } else {
                setResumePreview(null);
            }
        }
    }, [currentUser]);

    // Get position title from user data
    const positionTitle = currentUser?.position_name || 'Unassigned';


    if (loading || !currentUser) {
        return (
            <div className="text-center p-5">
                <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading user data...</p>
            </div>
        );
    }

    const validateField = (name, value, currentFormData = formData) => {
        let error = null;
        
        switch (name) {
            case 'contact_number':
                if (!value.trim()) {
                    error = 'Contact number is required.';
                } else if (!/^[0-9+\-()\s]+$/.test(value.trim())) {
                    error = 'Contact number can only contain digits, +, -, (), and spaces.';
                } else if (value.replace(/[^0-9]/g, '').length < 7) {
                    error = 'Contact number must contain at least 7 digits.';
                } else if (value.replace(/[^0-9]/g, '').length > 15) {
                    error = 'Contact number must not exceed 15 digits.';
                }
                break;
                
            case 'address':
                if (!value.trim()) {
                    error = 'Address is required.';
                } else if (value.trim().length < 10) {
                    error = 'Address must be at least 10 characters.';
                } else if (value.trim().length > 500) {
                    error = 'Address must not exceed 500 characters.';
                }
                break;
                
            case 'sss_no':
                if (value && value.trim()) {
                    const sssDigits = value.replace(/[^0-9]/g, '');
                    if (sssDigits.length !== 10) {
                        error = 'SSS number must be 10 digits (e.g., 12-3456789-0).';
                    }
                }
                break;
                
            case 'tin_no':
                if (value && value.trim()) {
                    const tinDigits = value.replace(/[^0-9]/g, '');
                    if (tinDigits.length !== 9 && tinDigits.length !== 12) {
                        error = 'TIN must be 9 or 12 digits (e.g., 123-456-789 or 123-456-789-000).';
                    }
                }
                break;
                
            case 'pag_ibig_no':
                if (value && value.trim()) {
                    const pagibigDigits = value.replace(/[^0-9]/g, '');
                    if (pagibigDigits.length !== 12) {
                        error = 'Pag-IBIG number must be 12 digits (e.g., 1234-5678-9012).';
                    }
                }
                break;
                
            case 'philhealth_no':
                if (value && value.trim()) {
                    const philhealthDigits = value.replace(/[^0-9]/g, '');
                    if (philhealthDigits.length !== 12) {
                        error = 'PhilHealth number must be 12 digits (e.g., 12-345678901-2).';
                    }
                }
                break;
        }
        
        return error;
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        const updatedFormData = { ...formData, [name]: value };
        setFormData(updatedFormData);
        
        // Validate the field in real-time if there's already an error or if the field has content
        if (formErrors[name] || value) {
            const error = validateField(name, value, updatedFormData);
            setFormErrors({ ...formErrors, [name]: error });
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        
        // Validate on blur to show errors when user leaves the field
        const error = validateField(name, value, formData);
        setFormErrors({ ...formErrors, [name]: error });
    };

    const validateForm = () => {
        const errors = {};
        
        // Validate fields based on active tab
        if (activeTab === 'personal') {
            const fieldsToValidate = ['contact_number', 'address'];
            fieldsToValidate.forEach(fieldName => {
                const error = validateField(fieldName, formData[fieldName], formData);
                if (error) {
                    errors[fieldName] = error;
                }
            });
        } else if (activeTab === 'requirements' && isHrUser) {
            const fieldsToValidate = ['sss_no', 'tin_no', 'pag_ibig_no', 'philhealth_no'];
            fieldsToValidate.forEach(fieldName => {
                const error = validateField(fieldName, formData[fieldName], formData);
                if (error) {
                    errors[fieldName] = error;
                }
            });
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleResumeFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setResumeFile(file);
            setResumePreview(URL.createObjectURL(file));
        }
    };

    const handleProfileImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setToast({ show: true, message: 'Please select a valid image file.', type: 'error' });
                return;
            }
            // Validate file size (max 2MB to match backend validation)
            if (file.size > 2 * 1024 * 1024) {
                setToast({ show: true, message: 'Image size must be less than 2MB.', type: 'error' });
                return;
            }
            setProfileImage(file);
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        
        // Validate form before submission
        if (!validateForm()) {
            setToast({ show: true, message: 'Please fix the validation errors before saving.', type: 'error' });
            return;
        }
        
        // Show confirmation modal
        setShowConfirmModal(true);
    };

    const confirmSaveChanges = async () => {
        setShowConfirmModal(false);
        
        try {
            // Check if we have a new resume file or profile image to upload
            const hasNewResumeFile = resumeFile && resumeFile instanceof File;
            const hasNewProfileImage = profileImage && profileImage instanceof File;
            const hasNewFile = hasNewResumeFile || hasNewProfileImage;
            
            let response;
            if (hasNewFile) {
                // Use FormData for file uploads
                const payload = new FormData();
                payload.append('_method', 'PUT'); // Method override for Laravel
                payload.append('contact_number', formData.contact_number || '');
                payload.append('address', formData.address || '');
                payload.append('sss_no', formatSssNumber(formData.sss_no) || '');
                payload.append('tin_no', formatTinNumber(formData.tin_no) || '');
                payload.append('pag_ibig_no', formatPagIbigNumber(formData.pag_ibig_no) || '');
                payload.append('philhealth_no', formatPhilhealthNumber(formData.philhealth_no) || '');
                if (hasNewResumeFile) {
                    payload.append('resume_file', resumeFile);
                }
                if (hasNewProfileImage) {
                    payload.append('imageUrl', profileImage);
                }
                
                // Use POST with method override for file uploads
                response = await api.post(`/employees/${currentUser.id}`, payload);
            } else {
                // Use regular JSON for non-file updates
                const formattedData = {
                    ...formData,
                    sss_no: formatSssNumber(formData.sss_no),
                    tin_no: formatTinNumber(formData.tin_no),
                    pag_ibig_no: formatPagIbigNumber(formData.pag_ibig_no),
                    philhealth_no: formatPhilhealthNumber(formData.philhealth_no)
                };
                response = await employeeAPI.update(currentUser.id, formattedData);
            }
            
            // Update localStorage with response data from backend
            const updatedEmployeeData = response.data.employee || response.data;
            const updatedUser = { 
                ...currentUser, 
                ...formData,
                // Update image_url from backend response if profile picture was uploaded
                image_url: updatedEmployeeData.image_url || updatedEmployeeData.profile_picture_url || currentUser.image_url
            };
            
            if (hasNewResumeFile) {
                updatedUser.resume_file = 'uploaded'; // Indicate file was uploaded
                // Update preview to show new file
                setResumePreview(`http://localhost:8000/api/employees/${currentUser.id}/resume`);
            }
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
            
            // Reset file states after successful upload
            setProfileImage(null);
            setProfileImagePreview(null);
            setResumeFile(null);
            
            setToast({ show: true, message: 'Profile updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Profile update error:', error);
            
            // Extract user-friendly error message from backend response
            let message = 'Error updating profile. Please try again.';
            
            if (error?.response?.data?.message) {
                // Use the user-friendly message from backend
                message = error.response.data.message;
            } else if (error?.response?.data?.errors) {
                // Handle validation errors - extract and format them
                const apiErrors = error.response.data.errors;
                const errorMessages = Object.values(apiErrors).flat();
                message = errorMessages.join('\n');
            } else if (error?.response?.status === 403) {
                message = 'Access denied. You do not have permission to perform this action.';
            } else if (error?.response?.status === 422) {
                message = error.response.data.message || 'Please check your input and try again.';
            } else if (error?.response?.status >= 500) {
                message = 'Server error occurred. Please try again later or contact support.';
            }
            
            setToast({ show: true, message: message, type: 'error' });
        }
    };

    return (
        <div className="container-fluid p-0 page-module-container">
            <div className="profile-page-header">
                <div className="profile-avatar-container" onClick={() => fileInputRef.current.click()}>
                    <img 
                        src={profileImagePreview || currentUser.profile_picture_url || placeholderAvatar}
                        alt="My Avatar"
                        className="profile-avatar-large"
                    />
                    <div className="profile-avatar-overlay"><i className="bi bi-camera-fill"></i></div>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="d-none" 
                    accept="image/*" 
                    onChange={handleProfileImageChange}
                />
                <div className="profile-header-info">
                    <h1 className="profile-name">{currentUser.first_name} {currentUser.middle_name} {currentUser.last_name}</h1>
                    <p className="profile-position">{positionTitle}</p>
                </div>
            </div>

            <div className="card profile-content-card">
                <div className="card-header">
                    <ul className="nav nav-tabs card-header-tabs">
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>
                                <i className="bi bi-person-lines-fill me-2"></i>Personal
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'employment' ? 'active' : ''}`} onClick={() => setActiveTab('employment')}>
                                <i className="bi bi-building me-2"></i>Employment
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'requirements' ? 'active' : ''}`} onClick={() => setActiveTab('requirements')}>
                                <i className="bi bi-card-checklist me-2"></i>Government Requirements
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'resume' ? 'active' : ''}`} onClick={() => setActiveTab('resume')}>
                                <i className="bi bi-file-earmark-person-fill me-2"></i>Resume
                            </button>
                        </li>
                    </ul>
                </div>
                <form onSubmit={handleSaveChanges}>
                    <div className="card-body">
                        {activeTab === 'personal' && (
                            <div className="info-grid">
                                <InfoField label="Email Address" value={currentUser.email} />
                                <InfoField label="Birthday" value={currentUser.birthday} />
                                <InfoField label="Gender" value={currentUser.gender} />
                                <div className="info-field">
                                    <label htmlFor="contact_number" className="info-label">Contact Number</label>
                                    <input 
                                        type="tel" 
                                        className={`form-control ${formErrors.contact_number ? 'is-invalid' : ''}`}
                                        id="contact_number" 
                                        name="contact_number" 
                                        value={formData.contact_number} 
                                        onChange={handleFormChange}
                                        onBlur={handleBlur}
                                        onInput={(e) => {
                                            // Remove invalid characters
                                            let value = e.target.value.replace(/[^0-9+\-()\s]/g, '');
                                            // Count only digits
                                            const digitCount = value.replace(/[^0-9]/g, '').length;
                                            // If more than 11 digits, trim to 11
                                            if (digitCount > 11) {
                                                const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
                                                value = digits;
                                            }
                                            e.target.value = value;
                                        }}
                                    />
                                    {formErrors.contact_number && <div className="invalid-feedback">{formErrors.contact_number}</div>}
                                </div>
                                <div className="info-field info-field-full-width">
                                    <label htmlFor="address" className="info-label">Address</label>
                                    <textarea 
                                        className={`form-control ${formErrors.address ? 'is-invalid' : ''}`}
                                        id="address" 
                                        name="address" 
                                        rows="3" 
                                        value={formData.address} 
                                        onChange={handleFormChange}
                                        onBlur={handleBlur}
                                    ></textarea>
                                    {formErrors.address && <div className="invalid-feedback">{formErrors.address}</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'employment' && (
                            <div className="info-grid">
                                <InfoField label="Employee ID" value={currentUser.employee_id || currentUser.id} />
                                <InfoField label="Joining Date" value={currentUser.joining_date} />
                                <InfoField label="Status" value={currentUser.account_status || 'Active'} />
                                <InfoField label="Employment Status" value={currentUser.employment_status || 'Active'} />
                            </div>
                        )}

                        {activeTab === 'requirements' && (
                             <div className="info-grid">
                                <div className="info-field">
                                    <label htmlFor="sss_no" className="info-label">SSS No.</label>
                                    <input 
                                        type="text" 
                                        className={`form-control ${formErrors.sss_no ? 'is-invalid' : ''}`}
                                        id="sss_no" 
                                        name="sss_no" 
                                        value={formData.sss_no} 
                                        onChange={handleFormChange}
                                        onBlur={handleBlur}
                                        onInput={(e) => {
                                            let value = e.target.value.replace(/[^0-9-]/g, '');
                                            const digitCount = value.replace(/[^0-9]/g, '').length;
                                            if (digitCount > 10) {
                                                const digits = value.replace(/[^0-9]/g, '').slice(0, 10);
                                                value = digits;
                                            }
                                            e.target.value = value;
                                        }}
                                        placeholder="12-3456789-0"
                                        disabled={!isHrUser} 
                                    />
                                    {formErrors.sss_no && <div className="invalid-feedback">{formErrors.sss_no}</div>}
                                </div>
                                <div className="info-field">
                                    <label htmlFor="tin_no" className="info-label">TIN No.</label>
                                    <input 
                                        type="text" 
                                        className={`form-control ${formErrors.tin_no ? 'is-invalid' : ''}`}
                                        id="tin_no" 
                                        name="tin_no" 
                                        value={formData.tin_no} 
                                        onChange={handleFormChange}
                                        onBlur={handleBlur}
                                        onInput={(e) => {
                                            let value = e.target.value.replace(/[^0-9-]/g, '');
                                            const digitCount = value.replace(/[^0-9]/g, '').length;
                                            if (digitCount > 12) {
                                                const digits = value.replace(/[^0-9]/g, '').slice(0, 12);
                                                value = digits;
                                            }
                                            e.target.value = value;
                                        }}
                                        placeholder="123-456-789-000"
                                        disabled={!isHrUser} 
                                    />
                                    {formErrors.tin_no && <div className="invalid-feedback">{formErrors.tin_no}</div>}
                                </div>
                                <div className="info-field">
                                    <label htmlFor="pag_ibig_no" className="info-label">Pag-IBIG No.</label>
                                    <input 
                                        type="text" 
                                        className={`form-control ${formErrors.pag_ibig_no ? 'is-invalid' : ''}`}
                                        id="pag_ibig_no" 
                                        name="pag_ibig_no" 
                                        value={formData.pag_ibig_no} 
                                        onChange={handleFormChange}
                                        onBlur={handleBlur}
                                        onInput={(e) => {
                                            let value = e.target.value.replace(/[^0-9-]/g, '');
                                            const digitCount = value.replace(/[^0-9]/g, '').length;
                                            if (digitCount > 12) {
                                                const digits = value.replace(/[^0-9]/g, '').slice(0, 12);
                                                value = digits;
                                            }
                                            e.target.value = value;
                                        }}
                                        placeholder="1234-5678-9012"
                                        disabled={!isHrUser} 
                                    />
                                    {formErrors.pag_ibig_no && <div className="invalid-feedback">{formErrors.pag_ibig_no}</div>}
                                </div>
                                <div className="info-field">
                                    <label htmlFor="philhealth_no" className="info-label">PhilHealth No.</label>
                                    <input 
                                        type="text" 
                                        className={`form-control ${formErrors.philhealth_no ? 'is-invalid' : ''}`}
                                        id="philhealth_no" 
                                        name="philhealth_no" 
                                        value={formData.philhealth_no} 
                                        onChange={handleFormChange}
                                        onBlur={handleBlur}
                                        onInput={(e) => {
                                            let value = e.target.value.replace(/[^0-9-]/g, '');
                                            const digitCount = value.replace(/[^0-9]/g, '').length;
                                            if (digitCount > 12) {
                                                const digits = value.replace(/[^0-9]/g, '').slice(0, 12);
                                                value = digits;
                                            }
                                            e.target.value = value;
                                        }}
                                        placeholder="12-345678901-2"
                                        disabled={!isHrUser} 
                                    />
                                    {formErrors.philhealth_no && <div className="invalid-feedback">{formErrors.philhealth_no}</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'resume' && (
                            <div className="resume-tab-container">
                                {isHrUser && (
                                    <div className="mb-3">
                                        <label htmlFor="resumeFile" className="info-label">Upload New Resume (PDF, DOC, DOCX)</label>
                                        <input type="file" className="form-control" id="resumeFile" name="resumeFile" accept=".pdf,.doc,.docx" onChange={handleResumeFileChange} />
                                    </div>
                                )}
                                {resumePreview ? (
                                    <div className="resume-viewer">
                                        {resumePreview.startsWith('blob:') ? (
                                            <iframe src={resumePreview} title={`${currentUser.name}'s Resume`} width="100%" height="600px" />
                                        ) : (
                                            <ResumeIframe resumeUrl={resumePreview} />
                                        )}
                                    </div>
                                ) : (
                                    <div className="resume-placeholder">
                                        <i className="bi bi-file-earmark-person-fill"></i>
                                        <p>No Resume on File</p>
                                        {isHrUser && <small className="text-muted">Upload a resume using the field above.</small>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {(activeTab === 'personal' || (isHrUser && (activeTab === 'requirements' || activeTab === 'resume'))) && (
                        <div className="card-footer form-footer">
                            <button type="submit" className="btn btn-success">Save Changes</button>
                        </div>
                    )}
                </form>
            </div>
            
            {/* Confirmation Modal */}
            <ConfirmationModal
                show={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmSaveChanges}
                title="Confirm Save Changes"
                message="Are you sure you want to save these changes to your profile?"
                confirmText="Save Changes"
                confirmVariant="success"
            />
            
            {/* Toast Notification */}
            {toast.show && (
                <ToastNotification
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ show: false, message: '', type: 'success' })}
                />
            )}
        </div>
    );
};

export default MyProfilePage;