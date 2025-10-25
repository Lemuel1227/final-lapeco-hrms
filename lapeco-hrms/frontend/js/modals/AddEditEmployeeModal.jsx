import React, { useState, useEffect, useRef } from 'react';
import './AddEditEmployeeModal.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import placeholderImage from '../assets/placeholder-profile.jpg';
import ResumeIframe from '../common/ResumeIframe';
import { employeeAPI } from '../services/api';

const AddEditEmployeeModal = ({ show, onClose, onSave, employeeId, employeeData, positions, viewOnly, onSwitchToEdit }) => {
  console.log('=== MODAL PROPS ===');
  console.log('show:', show);
  console.log('employeeId:', employeeId);
  console.log('employeeData:', employeeData);
  console.log('viewOnly:', viewOnly);
  console.log('===================');
  
  const initialFormState = {
    firstName: '', middleName: '', lastName: '',
    email: '', positionId: '',
    joiningDate: new Date().toISOString().split('T')[0],
    birthday: '', gender: '', address: '', contactNumber: '',
    imageUrl: null, imagePreviewUrl: placeholderImage,
    sssNo: '', tinNo: '', pagIbigNo: '', philhealthNo: '',
    status: 'Active', resumeFile: null, resumeUrl: null,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState({});
  const [activeTab, setActiveTab] = useState('personal');
  const [isViewMode, setIsViewMode] = useState(viewOnly);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchedEmployeeData, setFetchedEmployeeData] = useState(null);
  const fileInputRef = useRef(null);

  const isEditMode = Boolean(employeeId || (employeeData && employeeData.id));

  // Fetch employee data when modal opens with employeeId
  useEffect(() => {
    const fetchEmployeeData = async () => {
      console.log('Fetch check - show:', show, 'employeeId:', employeeId, 'employeeData:', employeeData);
      if (show && employeeId && !employeeData) {
        console.log('✅ Fetching employee data for ID:', employeeId);
        setLoading(true);
        try {
          const response = await employeeAPI.getById(employeeId);
          console.log('✅ Fetched employee data:', response.data);
          setFetchedEmployeeData(response.data);
        } catch (error) {
          console.error('❌ Error fetching employee data:', error);
          setFetchedEmployeeData(null);
        } finally {
          setLoading(false);
        }
      } else {
        console.log('❌ Not fetching. Conditions:', { show, hasEmployeeId: !!employeeId, hasEmployeeData: !!employeeData });
      }
    };
    fetchEmployeeData();
  }, [show, employeeId, employeeData]);

  // Populate form data when employee data is available
  useEffect(() => {
    if (show) {
      setIsViewMode(viewOnly);
      const dataToUse = employeeData || fetchedEmployeeData;
      if (isEditMode && dataToUse) {
        console.log('=== MODAL DATA DEBUG ===');
        console.log('Raw dataToUse:', dataToUse);
        console.log('Contact Number - camelCase:', dataToUse.contactNumber);
        console.log('Contact Number - snake_case:', dataToUse.contact_number);
        console.log('Position ID - camelCase:', dataToUse.positionId);
        console.log('Position ID - snake_case:', dataToUse.position_id);
        console.log('Position Name:', dataToUse.position);
        console.log('SSS No - camelCase:', dataToUse.sssNo);
        console.log('SSS No - snake_case:', dataToUse.sss_no);
        console.log('TIN No - camelCase:', dataToUse.tinNo);
        console.log('TIN No - snake_case:', dataToUse.tin_no);
        console.log('Pag-IBIG No - camelCase:', dataToUse.pagIbigNo);
        console.log('Pag-IBIG No - snake_case:', dataToUse.pag_ibig_no);
        console.log('PhilHealth No - camelCase:', dataToUse.philhealthNo);
        console.log('PhilHealth No - snake_case:', dataToUse.philhealth_no);
        
        const mappedFormData = {
          firstName: dataToUse.first_name || '',
          middleName: dataToUse.middle_name || '',
          lastName: dataToUse.last_name || '',
          email: dataToUse.email || '',
          positionId: dataToUse.positionId || dataToUse.position_id || '',
          joiningDate: dataToUse.joiningDate || dataToUse.joining_date || new Date().toISOString().split('T')[0],
          birthday: dataToUse.birthday || '',
          gender: dataToUse.gender || '',
          address: dataToUse.address || '',
          contactNumber: dataToUse.contactNumber || dataToUse.contact_number || '',
          imageUrl: dataToUse.imageUrl || dataToUse.profile_picture_url || null,
          imagePreviewUrl: dataToUse.imageUrl || dataToUse.profile_picture_url || placeholderImage,
          sssNo: dataToUse.sssNo || dataToUse.sss_no || '',
          tinNo: dataToUse.tinNo || dataToUse.tin_no || '',
          pagIbigNo: dataToUse.pagIbigNo || dataToUse.pag_ibig_no || '',
          philhealthNo: dataToUse.philhealthNo || dataToUse.philhealth_no || '',
          status: dataToUse.account_status || 'Active',
          resumeFile: null,
          resumeUrl: dataToUse.resumeUrl || null,
        };
        
        console.log('Mapped formData:', mappedFormData);
        console.log('=== END DEBUG ===');
        setFormData(mappedFormData);
      } else {
        setFormData(initialFormState);
      }
      setActiveTab('personal');
      setFormErrors({});
      setIsSubmitting(false);
    }
  }, [fetchedEmployeeData, employeeData, show, isEditMode, viewOnly]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      if (name === 'imageUrl') {
        if (file) {
          setFormData({ ...formData, imageUrl: file, imagePreviewUrl: URL.createObjectURL(file) });
        }
      } else if (name === 'resumeFile') {
        if (file) {
          console.log('Resume file selected:', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified
          });
          // For new file uploads, create a temporary URL for preview
          setFormData({ ...formData, resumeFile: file, resumeUrl: URL.createObjectURL(file) });
        } else {
          // If no file selected, revert to original resume URL if editing
          setFormData({ ...formData, resumeFile: null, resumeUrl: employeeData?.resumeUrl || null });
        }
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: null });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!formData.email.trim()) { errors.email = 'Email is required.'; } 
    else if (!/\S+@\S+\.\S+/.test(formData.email)) { errors.email = 'Email address is invalid.';}
    if (!isEditMode && !formData.positionId) errors.positionId = 'Position is required.';
    if (!isEditMode && !formData.joiningDate) errors.joiningDate = 'Joining date is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);
    const dataToSave = { ...formData };
    delete dataToSave.imagePreviewUrl;
    dataToSave.name = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ').trim();
    dataToSave.first_name = formData.firstName;
    dataToSave.middle_name = formData.middleName || null;
    dataToSave.last_name = formData.lastName;

    if (!formData.middleName) {
      delete dataToSave.middleName;
    }

    try {
      await onSave(dataToSave, employeeData?.id);
      onClose();
    } catch (err) {
      // Parent handler shows alerts; keep modal open for corrections
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) {
    return null;
  }

  const modalTitle = isViewMode ? 'View Employee Details' : (isEditMode ? 'Edit Employee Details' : 'Add New Employee');

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-xl">
        <div className="modal-content">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">{modalTitle}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
            </div>
            <div className="modal-body employee-form-modal-body">
              {loading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                  <div className="text-center">
                    <div className="spinner-border text-success mb-3" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Loading employee data...</p>
                  </div>
                </div>
              ) : (
              <div className="employee-form-container">
                <div className="employee-form-left-column">
                  <div className={`employee-profile-img-container ${isViewMode ? '' : 'editable'}`} onClick={() => !isViewMode && fileInputRef.current.click()}>
                    <img src={formData.imagePreviewUrl} alt="Profile Preview" className="employee-profile-img-form" onError={(e) => { e.target.src = placeholderImage; }} />
                    {!isViewMode && <div className="employee-profile-img-overlay"><i className="bi bi-camera-fill"></i></div>}
                  </div>
                  <input type="file" ref={fileInputRef} name="imageUrl" accept="image/*" onChange={handleChange} className="d-none" disabled={isViewMode} />

                  <div className="row g-2">
                    <div className="col-md-5">
                      <input
                        type="text"
                        className={`form-control ${formErrors.firstName ? 'is-invalid' : ''}`}
                        id="firstName"
                        name="firstName"
                        placeholder="First Name"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        disabled={isViewMode}
                      />
                      {formErrors.firstName && <div className="invalid-feedback">{formErrors.firstName}</div>}
                    </div>
                    <div className="col-md-3">
                      <input
                        type="text"
                        className="form-control"
                        id="middleName"
                        name="middleName"
                        placeholder="Middle Name"
                        value={formData.middleName}
                        onChange={handleChange}
                        disabled={isViewMode}
                      />
                    </div>
                    <div className="col-md-4">
                      <input
                        type="text"
                        className={`form-control ${formErrors.lastName ? 'is-invalid' : ''}`}
                        id="lastName"
                        name="lastName"
                        placeholder="Last Name"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        disabled={isViewMode}
                      />
                      {formErrors.lastName && <div className="invalid-feedback">{formErrors.lastName}</div>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="positionId" className="form-label">Position*</label>
                    <select className={`form-select ${formErrors.positionId ? 'is-invalid' : ''}`} id="positionId" name="positionId" value={formData.positionId} onChange={handleChange} required disabled={isViewMode}>
                        <option value="">Select a position...</option>
                        {(positions || []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    {formErrors.positionId && <div className="invalid-feedback">{formErrors.positionId}</div>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="joiningDate" className="form-label">Joining Date*</label>
                    <input type="date" className={`form-control ${formErrors.joiningDate ? 'is-invalid' : ''}`} id="joiningDate" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required disabled={isViewMode} />
                    {formErrors.joiningDate && <div className="invalid-feedback">{formErrors.joiningDate}</div>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="status" className="form-label">Status*</label>
                    <select className="form-select" id="status" name="status" value={formData.status} onChange={handleChange} disabled={isViewMode}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="employee-form-right-column">
                  <ul className="nav nav-tabs">
                    <li className="nav-item">
                      <button type="button" className={`nav-link ${activeTab === 'personal' ? 'active' : ''}`} onClick={() => setActiveTab('personal')}>Personal Details</button>
                    </li>
                    <li className="nav-item">
                      <button type="button" className={`nav-link ${activeTab === 'statutory' ? 'active' : ''}`} onClick={() => setActiveTab('statutory')}>Government Requirements</button>
                    </li>
                    <li className="nav-item">
                      <button type="button" className={`nav-link ${activeTab === 'resume' ? 'active' : ''}`} onClick={() => setActiveTab('resume')}>Resume</button>                      
                    </li>
                  </ul>
                  <div className="tab-content">
                    {activeTab === 'personal' && (
                      <div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="email" className="form-label">Email Address*</label>
                            <input type="email" className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} id="email" name="email" value={formData.email} onChange={handleChange} required disabled={isViewMode} />
                            {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="contactNumber" className="form-label">Contact Number</label>
                            <input type="tel" className="form-control" id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleChange} disabled={isViewMode} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="birthday" className="form-label">Birthday</label>
                            <input type="date" className="form-control" id="birthday" name="birthday" value={formData.birthday} onChange={handleChange} disabled={isViewMode} />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="gender" className="form-label">Gender</label>
                            <select className="form-select" id="gender" name="gender" value={formData.gender} onChange={handleChange} disabled={isViewMode}>
                              <option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="col-12">
                            <label htmlFor="address" className="form-label">Address</label>
                            <textarea className="form-control" id="address" name="address" rows="3" value={formData.address} onChange={handleChange} disabled={isViewMode}></textarea>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === 'statutory' && (
                      <div>
                        <div className="row g-3">
                          <div className="col-md-6"><label htmlFor="sssNo" className="form-label">SSS No.</label><input type="text" className="form-control" id="sssNo" name="sssNo" value={formData.sssNo} onChange={handleChange} disabled={isViewMode} /></div>
                          <div className="col-md-6"><label htmlFor="tinNo" className="form-label">TIN No.</label><input type="text" className="form-control" id="tinNo" name="tinNo" value={formData.tinNo} onChange={handleChange} disabled={isViewMode} /></div>
                          <div className="col-md-6"><label htmlFor="pagIbigNo" className="form-label">Pag-IBIG No.</label><input type="text" className="form-control" id="pagIbigNo" name="pagIbigNo" value={formData.pagIbigNo} onChange={handleChange} disabled={isViewMode} /></div>
                          <div className="col-md-6"><label htmlFor="philhealthNo" className="form-label">PhilHealth No.</label><input type="text" className="form-control" id="philhealthNo" name="philhealthNo" value={formData.philhealthNo} onChange={handleChange} disabled={isViewMode} /></div>
                        </div>
                      </div>
                    )}
                    {activeTab === 'resume' && (
                      <div className="resume-tab-container">
                        {!isViewMode && (
                          <div className="mb-3">
                            <label htmlFor="resumeFile" className="form-label">Upload New Resume (PDF, DOC, DOCX)</label>
                            <input type="file" className="form-control" id="resumeFile" name="resumeFile" accept=".pdf,.doc,.docx" onChange={handleChange} />
                          </div>
                        )}

                        {formData.resumeUrl ? (
                          <div className="resume-viewer">
                            {formData.resumeUrl.startsWith('blob:') ? (
                              <iframe src={formData.resumeUrl} width="100%" height="600px" title="Resume Preview"></iframe>
                            ) : formData.resumeUrl.startsWith('http://localhost:8000/api/') ? (
                              <ResumeIframe resumeUrl={formData.resumeUrl} />
                            ) : (
                              <div className="d-flex flex-column align-items-center">
                                <a href={formData.resumeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mb-3">
                                  <i className="bi bi-file-earmark-pdf me-2"></i>View Resume
                                </a>
                                <p className="text-muted">Resume file is available. Click the button above to view it.</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="resume-placeholder">
                            <i className="bi bi-file-earmark-person-fill"></i>
                            <p>No Resume on File</p>
                            {!isViewMode && <small className="text-muted">Upload a new resume using the field above.</small>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
            <div className="modal-footer">
               {isViewMode ? (
                <>
                    <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
                    <button type="button" className="btn btn-primary" onClick={onSwitchToEdit}>
                        <i className="bi bi-pencil-fill me-2"></i>Edit
                    </button>
                </>
              ) : (
                <>
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary" 
                        onClick={() => viewOnly ? onSwitchToEdit() : onClose()}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                        {isEditMode ? 'Save Changes' : 'Add Employee'}
                    </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditEmployeeModal;