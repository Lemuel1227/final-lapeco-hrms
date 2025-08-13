import React, { useState, useEffect, useMemo, useRef } from 'react';
import placeholderAvatar from '../../assets/placeholder-profile.jpg';
import { USER_ROLES } from '../../constants/roles';
import { employeeAPI, positionAPI } from '../../services/api';
import './MyProfilePage.css';

const InfoField = ({ label, value }) => (
    <div className="info-field">
        <label className="info-label">{label}</label>
        <p className="info-value">{value || 'N/A'}</p>
    </div>
);

const MyProfilePage = () => {
    const [activeTab, setActiveTab] = useState('personal');
    const [formData, setFormData] = useState({});
    const [resumeFile, setResumeFile] = useState(null);
    const [resumePreview, setResumePreview] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [positions, setPositions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const fileInputRef = useRef(null);
    const isHrUser = userRole === USER_ROLES.HR_PERSONNEL;

    // Initialize user data from localStorage
    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                setCurrentUser(userData);
                setUserRole(userData.role || USER_ROLES.HR_PERSONNEL);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }, []);

    // Fetch positions and employees data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [positionsResponse, employeesResponse] = await Promise.all([
                    positionAPI.getAll(),
                    employeeAPI.getAll()
                ]);
                setPositions(positionsResponse.data || []);
                setEmployees(employeesResponse.data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
            setResumePreview(currentUser.resume_file || null);
        }
    }, [currentUser]);

    const positionTitle = useMemo(() => 
        positions.find(p => p.id === currentUser?.position_id)?.title || 'Unassigned'
    , [currentUser, positions]);

    const manager = useMemo(() => {
        if (!currentUser?.position_id) return null;
        return employees.find(emp => emp.position_id === currentUser.position_id && emp.is_team_leader);
    }, [currentUser, employees]);


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

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleResumeFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setResumeFile(file);
            setResumePreview(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        try {
            // Update profile data
            await employeeAPI.update(currentUser.id, formData);
            
            // Update resume if provided
            if (resumeFile) {
                // Note: Resume upload would need a separate API endpoint
                console.log('Resume file ready for upload:', resumeFile);
            }
            
            // Update localStorage with new data
            const updatedUser = { ...currentUser, ...formData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
            
            alert("Profile updated successfully!");
        } catch (error) {
            console.error('Error updating profile:', error);
            alert("Error updating profile. Please try again.");
        }
    };

    return (
        <div className="container-fluid p-0 page-module-container">
            <div className="profile-page-header">
                <div className="profile-avatar-container" onClick={() => fileInputRef.current.click()}>
                    <img 
                        src={currentUser.image_url || placeholderAvatar}
                        alt="My Avatar"
                        className="profile-avatar-large"
                    />
                    <div className="profile-avatar-overlay"><i className="bi bi-camera-fill"></i></div>
                </div>
                <input type="file" ref={fileInputRef} className="d-none" accept="image/*" />
                <div className="profile-header-info">
                    <h1 className="profile-name">{currentUser.name}</h1>
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
                                    <input type="tel" className="form-control" id="contact_number" name="contact_number" value={formData.contact_number} onChange={handleFormChange} />
                                </div>
                                <div className="info-field info-field-full-width">
                                    <label htmlFor="address" className="info-label">Address</label>
                                    <textarea className="form-control" id="address" name="address" rows="3" value={formData.address} onChange={handleFormChange}></textarea>
                                </div>
                            </div>
                        )}

                        {activeTab === 'employment' && (
                            <div className="info-grid">
                                <InfoField label="Employee ID" value={currentUser.employee_id || currentUser.id} />
                                <InfoField label="Joining Date" value={currentUser.joining_date} />
                                <InfoField label="Status" value={currentUser.status || 'Active'} />
                                <InfoField label="Reports To" value={manager?.name} />
                            </div>
                        )}

                        {activeTab === 'requirements' && (
                             <div className="info-grid">
                                <div className="info-field">
                                    <label htmlFor="sss_no" className="info-label">SSS No.</label>
                                    <input type="text" className="form-control" id="sss_no" name="sss_no" value={formData.sss_no} onChange={handleFormChange} disabled={!isHrUser} />
                                </div>
                                <div className="info-field">
                                    <label htmlFor="tin_no" className="info-label">TIN No.</label>
                                    <input type="text" className="form-control" id="tin_no" name="tin_no" value={formData.tin_no} onChange={handleFormChange} disabled={!isHrUser} />
                                </div>
                                <div className="info-field">
                                    <label htmlFor="pag_ibig_no" className="info-label">Pag-IBIG No.</label>
                                    <input type="text" className="form-control" id="pag_ibig_no" name="pag_ibig_no" value={formData.pag_ibig_no} onChange={handleFormChange} disabled={!isHrUser} />
                                </div>
                                <div className="info-field">
                                    <label htmlFor="philhealth_no" className="info-label">PhilHealth No.</label>
                                    <input type="text" className="form-control" id="philhealth_no" name="philhealth_no" value={formData.philhealth_no} onChange={handleFormChange} disabled={!isHrUser} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'resume' && (
                            <div className="resume-tab-container">
                                {isHrUser && (
                                    <div className="mb-3">
                                        <label htmlFor="resumeFile" className="info-label">Upload New Resume (PDF)</label>
                                        <input type="file" className="form-control" id="resumeFile" name="resumeFile" accept=".pdf" onChange={handleResumeFileChange} />
                                    </div>
                                )}
                                {resumePreview ? (
                                    <div className="resume-viewer">
                                        <iframe src={resumePreview} title={`${currentUser.name}'s Resume`} width="100%" height="100%" />
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
        </div>
    );
};

export default MyProfilePage;