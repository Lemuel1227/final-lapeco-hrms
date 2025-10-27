import React, { useState, useEffect } from 'react';

const AddApplicantModal = ({ show, onClose, onSave, positions = [] }) => {
  const initialFormState = {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    jobOpeningId: '',
    resumeFile: null,
    profilePicture: null,
    birthday: '',
    gender: '',
    sssNo: '',
    tinNo: '',
    pagIbigNo: '',
    philhealthNo: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (show) {
      if (positions.length === 1) {
        setFormData({ ...initialFormState, jobOpeningId: positions[0].id });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
      setPhotoPreview(null);
    }
  }, [show, positions]);

  // Validate individual field in real-time
  const validateField = (name, value) => {
    let error = null;
    
    switch(name) {
      case 'firstName':
        if (value && value.trim()) {
          if (!/^[a-zA-Z\s'-]+$/.test(value)) {
            error = 'First name can only contain letters, spaces, hyphens, and apostrophes.';
          } else if (value.trim().length < 2) {
            error = 'First name must be at least 2 characters.';
          }
        }
        break;
      case 'middleName':
        if (value && value.trim()) {
          if (!/^[a-zA-Z\s'-]+$/.test(value)) {
            error = 'Middle name can only contain letters, spaces, hyphens, and apostrophes.';
          }
        }
        break;
      case 'lastName':
        if (value && value.trim()) {
          if (!/^[a-zA-Z\s'-]+$/.test(value)) {
            error = 'Last name can only contain letters, spaces, hyphens, and apostrophes.';
          } else if (value.trim().length < 2) {
            error = 'Last name must be at least 2 characters.';
          }
        }
        break;
      case 'email':
        if (value && value.trim()) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = 'Email address is invalid.';
          }
        }
        break;
      case 'phone':
        if (value && value.trim()) {
          if (!/^(\+63|0)?9\d{9}$/.test(value.replace(/[\s-]/g, ''))) {
            error = 'Invalid phone number. Use format: 09XXXXXXXXX';
          }
        }
        break;
      case 'birthday':
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          const isBeforeBirthday = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate());
          const actualAge = isBeforeBirthday ? age - 1 : age;
          
          if (actualAge < 18) {
            error = 'Applicant must be at least 18 years old.';
          }
        }
        break;
      case 'sssNo':
        if (value && value.trim()) {
          if (!/^\d{2}-\d{7}-\d{1}$/.test(value) && !/^\d{10}$/.test(value)) {
            error = 'Invalid SSS format. Use: XX-XXXXXXX-X or 10 digits';
          }
        }
        break;
      case 'tinNo':
        if (value && value.trim()) {
          if (!/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(value) && !/^\d{9,12}$/.test(value)) {
            error = 'Invalid TIN format. Use: XXX-XXX-XXX-XXX or 9-12 digits';
          }
        }
        break;
      case 'pagIbigNo':
        if (value && value.trim()) {
          if (!/^\d{4}-\d{4}-\d{4}$/.test(value) && !/^\d{12}$/.test(value)) {
            error = 'Invalid Pag-IBIG format. Use: XXXX-XXXX-XXXX or 12 digits';
          }
        }
        break;
      case 'philhealthNo':
        if (value && value.trim()) {
          if (!/^\d{2}-\d{9}-\d{1}$/.test(value) && !/^\d{12}$/.test(value)) {
            error = 'Invalid PhilHealth format. Use: XX-XXXXXXXXX-X or 12 digits';
          }
        }
        break;
      case 'profilePicture':
        if (value) {
          const maxSize = 2 * 1024 * 1024; // 2MB
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
          if (value.size > maxSize) {
            error = 'Photo must be less than 2MB.';
          } else if (!allowedTypes.includes(value.type)) {
            error = 'Photo must be JPEG, PNG, or GIF format.';
          }
        }
        break;
      case 'resumeFile':
        if (value) {
          const maxSize = 5 * 1024 * 1024; // 5MB
          const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          if (value.size > maxSize) {
            error = 'Resume file must be less than 5MB.';
          } else if (!allowedTypes.includes(value.type)) {
            error = 'Resume must be PDF or DOC format.';
          }
        }
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    let newValue = value;
    
    if (type === 'file') {
      const file = files[0];
      newValue = file;
      setFormData({ ...formData, [name]: file });
      
      // Preview profile picture
      if (name === 'profilePicture' && file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result);
        };
        reader.readAsDataURL(file);
        
        // Validate file immediately
        const fileError = validateField(name, file);
        setErrors({ ...errors, [name]: fileError });
        return;
      }
      
      // Validate resume file
      if (name === 'resumeFile' && file) {
        const fileError = validateField(name, file);
        setErrors({ ...errors, [name]: fileError });
        return;
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Validate field in real-time
    const fieldError = validateField(name, newValue);
    setErrors({ ...errors, [name]: fieldError });
  };

  const handleRemovePhoto = () => {
    setFormData({ ...formData, profilePicture: null });
    setPhotoPreview(null);
    // Reset file input
    const fileInput = document.getElementById('profilePicture');
    if (fileInput) fileInput.value = '';
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required.';
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email address is invalid.';
    }
    
    // Position validation
    if (!formData.jobOpeningId) newErrors.jobOpeningId = 'Please select a position.';
    
    // Phone validation (Philippine format)
    if (formData.phone && !/^(\+63|0)?9\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      newErrors.phone = 'Invalid phone number. Use format: 09XXXXXXXXX';
    }
    
    // Birthday validation (must be 18+)
    if (formData.birthday) {
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const isBeforeBirthday = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate());
      const actualAge = isBeforeBirthday ? age - 1 : age;
      
      if (actualAge < 18) {
        newErrors.birthday = 'Applicant must be at least 18 years old.';
      }
    }
    
    // Government ID validations
    if (formData.sssNo && !/^\d{2}-\d{7}-\d{1}$/.test(formData.sssNo) && !/^\d{10}$/.test(formData.sssNo)) {
      newErrors.sssNo = 'Invalid SSS format. Use: XX-XXXXXXX-X or 10 digits';
    }
    
    if (formData.tinNo && !/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(formData.tinNo) && !/^\d{9,12}$/.test(formData.tinNo)) {
      newErrors.tinNo = 'Invalid TIN format. Use: XXX-XXX-XXX-XXX or 9-12 digits';
    }
    
    if (formData.pagIbigNo && !/^\d{4}-\d{4}-\d{4}$/.test(formData.pagIbigNo) && !/^\d{12}$/.test(formData.pagIbigNo)) {
      newErrors.pagIbigNo = 'Invalid Pag-IBIG format. Use: XXXX-XXXX-XXXX or 12 digits';
    }
    
    if (formData.philhealthNo && !/^\d{2}-\d{9}-\d{1}$/.test(formData.philhealthNo) && !/^\d{12}$/.test(formData.philhealthNo)) {
      newErrors.philhealthNo = 'Invalid PhilHealth format. Use: XX-XXXXXXXXX-X or 12 digits';
    }
    
    // File validations
    if (formData.resumeFile) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (formData.resumeFile.size > maxSize) {
        newErrors.resumeFile = 'Resume file must be less than 5MB.';
      }
      if (!allowedTypes.includes(formData.resumeFile.type)) {
        newErrors.resumeFile = 'Resume must be PDF or DOC format.';
      }
    }
    
    if (formData.profilePicture) {
      const maxSize = 2 * 1024 * 1024; // 2MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (formData.profilePicture.size > maxSize) {
        newErrors.profilePicture = 'Photo must be less than 2MB.';
      }
      if (!allowedTypes.includes(formData.profilePicture.type)) {
        newErrors.profilePicture = 'Photo must be JPEG, PNG, or GIF format.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Transform the data to match the API expectations
      const apiData = {
        first_name: formData.firstName,
        middle_name: formData.middleName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        job_opening_id: formData.jobOpeningId,
        birthday: formData.birthday,
        gender: formData.gender,
        resume: formData.resumeFile,
        profile_picture: formData.profilePicture,
        sss_no: formData.sssNo,
        tin_no: formData.tinNo,
        pag_ibig_no: formData.pagIbigNo,
        philhealth_no: formData.philhealthNo,
      };
      onSave(apiData);
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <form onSubmit={handleSubmit} noValidate>
            <div className="modal-header">
              <h5 className="modal-title">Add New Applicant</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <h6 className="form-section-title">Personal Information</h6>
              
              {/* Photo Upload Section */}
              <div className="row mb-4">
                <div className="col-12">
                  <label className="form-label">Profile Photo</label>
                  <div className="d-flex align-items-center gap-3">
                    <div className="position-relative">
                      <div 
                        className="border rounded d-flex align-items-center justify-content-center" 
                        style={{ width: '120px', height: '120px', overflow: 'hidden', backgroundColor: '#f8f9fa' }}
                      >
                        {photoPreview ? (
                          <img 
                            src={photoPreview} 
                            alt="Preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <i className="bi bi-person-circle" style={{ fontSize: '4rem', color: '#dee2e6' }}></i>
                        )}
                      </div>
                      {photoPreview && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                          onClick={handleRemovePhoto}
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>
                    <div className="flex-grow-1">
                      <input 
                        type="file" 
                        className={`form-control ${errors.profilePicture ? 'is-invalid' : ''}`}
                        id="profilePicture" 
                        name="profilePicture" 
                        accept="image/jpeg,image/jpg,image/png,image/gif" 
                        onChange={handleChange} 
                      />
                      <small className="text-muted">JPG, PNG, or GIF. Max 2MB.</small>
                      {errors.profilePicture && <div className="invalid-feedback d-block">{errors.profilePicture}</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-5">
                  <label htmlFor="firstName" className="form-label">First Name*</label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.firstName ? 'is-invalid' : ''}`} 
                    id="firstName" 
                    name="firstName" 
                    value={formData.firstName} 
                    onChange={handleChange} 
                    required 
                  />
                  {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                </div>
                <div className="col-md-2">
                  <label htmlFor="middleName" className="form-label">Middle</label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.middleName ? 'is-invalid' : ''}`}
                    id="middleName" 
                    name="middleName" 
                    value={formData.middleName} 
                    onChange={handleChange} 
                  />
                  {errors.middleName && <div className="invalid-feedback">{errors.middleName}</div>}
                </div>
                <div className="col-md-5">
                  <label htmlFor="lastName" className="form-label">Last Name*</label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.lastName ? 'is-invalid' : ''}`} 
                    id="lastName" 
                    name="lastName" 
                    value={formData.lastName} 
                    onChange={handleChange} 
                    required 
                  />
                  {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="email" className="form-label">Email*</label>
                  <input 
                    type="email" 
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`} 
                    id="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
                <div className="col-md-6">
                  <label htmlFor="phone" className="form-label">Phone Number</label>
                  <input 
                    type="tel" 
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    id="phone" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    placeholder="09XXXXXXXXX"
                  />
                  {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="birthday" className="form-label">Birthday</label>
                  <input 
                    type="date" 
                    className={`form-control ${errors.birthday ? 'is-invalid' : ''}`}
                    id="birthday" 
                    name="birthday" 
                    value={formData.birthday} 
                    onChange={handleChange}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  />
                  {errors.birthday && <div className="invalid-feedback">{errors.birthday}</div>}
                  <small className="text-muted">Must be at least 18 years old</small>
                </div>
                <div className="col-md-6">
                  <label htmlFor="gender" className="form-label">Gender</label>
                  <select 
                    className="form-select" 
                    id="gender" 
                    name="gender" 
                    value={formData.gender} 
                    onChange={handleChange}
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <hr className="my-4"/>
              <h6 className="form-section-title">Application Details</h6>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="jobOpeningId" className="form-label">Position Applying For*</label>
                  <select 
                    className={`form-select ${errors.jobOpeningId ? 'is-invalid' : ''}`} 
                    id="jobOpeningId" 
                    name="jobOpeningId" 
                    value={formData.jobOpeningId} 
                    onChange={handleChange} 
                    required
                  >
                    <option value="">Select a position...</option>
                    {positions.map(position => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </select>
                  {errors.jobOpeningId && <div className="invalid-feedback">{errors.jobOpeningId}</div>}
                </div>
                <div className="col-md-6">
                  <label htmlFor="resumeFile" className="form-label">Resume (PDF/Doc)</label>
                  <input 
                    type="file" 
                    className={`form-control ${errors.resumeFile ? 'is-invalid' : ''}`}
                    id="resumeFile" 
                    name="resumeFile" 
                    accept=".pdf,.doc,.docx" 
                    onChange={handleChange} 
                  />
                  {formData.resumeFile && <small className="text-muted d-block mt-1"><i className="bi bi-file-earmark-text me-1"></i>{formData.resumeFile.name}</small>}
                  {errors.resumeFile && <div className="invalid-feedback">{errors.resumeFile}</div>}
                  <small className="text-muted">PDF or DOC format. Max 5MB.</small>
                </div>
              </div>

              <hr className="my-4"/>
              <h6 className="form-section-title">Government Requirements (Optional)</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="sssNo" className="form-label">SSS No.</label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.sssNo ? 'is-invalid' : ''}`}
                    id="sssNo" 
                    name="sssNo" 
                    value={formData.sssNo} 
                    onChange={handleChange}
                    placeholder="XX-XXXXXXX-X"
                  />
                  {errors.sssNo && <div className="invalid-feedback">{errors.sssNo}</div>}
                </div>
                <div className="col-md-6">
                  <label htmlFor="tinNo" className="form-label">TIN No.</label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.tinNo ? 'is-invalid' : ''}`}
                    id="tinNo" 
                    name="tinNo" 
                    value={formData.tinNo} 
                    onChange={handleChange}
                    placeholder="XXX-XXX-XXX-XXX"
                  />
                  {errors.tinNo && <div className="invalid-feedback">{errors.tinNo}</div>}
                </div>
                <div className="col-md-6">
                  <label htmlFor="pagIbigNo" className="form-label">Pag-IBIG No.</label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.pagIbigNo ? 'is-invalid' : ''}`}
                    id="pagIbigNo" 
                    name="pagIbigNo" 
                    value={formData.pagIbigNo} 
                    onChange={handleChange}
                    placeholder="XXXX-XXXX-XXXX"
                  />
                  {errors.pagIbigNo && <div className="invalid-feedback">{errors.pagIbigNo}</div>}
                </div>
                <div className="col-md-6">
                  <label htmlFor="philhealthNo" className="form-label">PhilHealth No.</label>
                  <input 
                    type="text" 
                    className={`form-control ${errors.philhealthNo ? 'is-invalid' : ''}`}
                    id="philhealthNo" 
                    name="philhealthNo" 
                    value={formData.philhealthNo} 
                    onChange={handleChange}
                    placeholder="XX-XXXXXXXXX-X"
                  />
                  {errors.philhealthNo && <div className="invalid-feedback">{errors.philhealthNo}</div>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-success">Add Applicant</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddApplicantModal;