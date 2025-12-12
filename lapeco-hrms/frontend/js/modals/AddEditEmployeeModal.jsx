import React, { useState, useEffect, useRef } from 'react';
import './AddEditEmployeeModal.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import placeholderImage from '../assets/placeholder-profile.jpg';
import ResumeIframe from '../common/ResumeIframe';
import { employeeAPI } from '../services/api';
import { IMaskInput } from 'react-imask';

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

const AddEditEmployeeModal = ({ show, onClose, onSave, employeeId, employeeData, positions, viewOnly, onSwitchToEdit }) => {
  
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
      if (show && employeeId && !employeeData) {
        setLoading(true);
        try {
          const response = await employeeAPI.getById(employeeId);
          setFetchedEmployeeData(response.data);
        } catch (error) {
          setFetchedEmployeeData(null);
        } finally {
          setLoading(false);
        }
      } else {
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
        setFormData(mappedFormData);
      } else {
        setFormData(initialFormState);
      }
      setActiveTab('personal');
      setFormErrors({});
      setIsSubmitting(false);
    }
  }, [fetchedEmployeeData, employeeData, show, isEditMode, viewOnly]);

  const validateField = (name, value, currentFormData = formData) => {
    let error = null;
    
    switch (name) {
      case 'firstName':
        if (!value.trim()) {
          error = 'First name is required.';
        } else if (value.trim().length < 2) {
          error = 'First name must be at least 2 characters.';
        } else if (value.trim().length > 50) {
          error = 'First name must not exceed 50 characters.';
        } else if (!/^[a-zA-Z\s.-]+$/.test(value.trim())) {
          error = 'First name can only contain letters, spaces, dots and hyphens.';
        }
        break;
        
      case 'middleName':
        if (value && value.trim().length > 50) {
          error = 'Middle name must not exceed 50 characters.';
        } else if (value && !/^[a-zA-Z\s.-]+$/.test(value.trim())) {
          error = 'Middle name can only contain letters, spaces, dots and hyphens.';
        }
        break;
        
      case 'lastName':
        if (!value.trim()) {
          error = 'Last name is required.';
        } else if (value.trim().length < 2) {
          error = 'Last name must be at least 2 characters.';
        } else if (value.trim().length > 50) {
          error = 'Last name must not exceed 50 characters.';
        } else if (!/^[a-zA-Z\s.-]+$/.test(value.trim())) {
          error = 'Last name can only contain letters, spaces, dots and hyphens.';
        }
        break;
        
      case 'email':
        if (!value.trim()) {
          error = 'Email is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          error = 'Please enter a valid email address.';
        } else if (value.trim().length > 255) {
          error = 'Email must not exceed 255 characters.';
        }
        break;
        
      case 'positionId':
        if (!isEditMode && !value) {
          error = 'Position is required.';
        }
        break;
        
      case 'joiningDate':
        if (!isEditMode && !value) {
          error = 'Joining date is required.';
        }
        break;
        
      case 'birthday':
        if (!value) {
          error = 'Birthday is required.';
        } else {
          const age = calculateAge(value);
          if (age < 18) {
            error = 'Employee must be at least 18 years old.';
          } else if (age > 100) {
            error = 'Please enter a valid birthday.';
          }
        }
        break;
        
      case 'gender':
        if (!value) {
          error = 'Gender is required.';
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
        
      case 'contactNumber':
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
        
      case 'sssNo':
        if (value && value.trim()) {
          const sssDigits = value.replace(/[^0-9]/g, '');
          if (sssDigits.length !== 10) {
            error = 'SSS number must be 10 digits (e.g., 12-3456789-0).';
          }
        }
        break;
        
      case 'tinNo':
        if (value && value.trim()) {
          const tinDigits = value.replace(/[^0-9]/g, '');
          if (tinDigits.length !== 9 && tinDigits.length !== 12) {
            error = 'TIN must be 9 or 12 digits (e.g., 123-456-789 or 123-456-789-000).';
          }
        }
        break;
        
      case 'pagIbigNo':
        if (value && value.trim()) {
          const pagibigDigits = value.replace(/[^0-9]/g, '');
          if (pagibigDigits.length !== 12) {
            error = 'Pag-IBIG number must be 12 digits (e.g., 1234-5678-9012).';
          }
        }
        break;
        
      case 'philhealthNo':
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
          setFormData({ ...formData, resumeFile: file, resumeUrl: URL.createObjectURL(file) });
        } else {
          // If no file selected, revert to original resume URL if editing
          setFormData({ ...formData, resumeFile: null, resumeUrl: employeeData?.resumeUrl || null });
        }
      }
    } else {
      // Update form data
      const updatedFormData = { ...formData, [name]: value };
      setFormData(updatedFormData);
      
      // Validate the field in real-time if there's already an error or if the field has content
      if (formErrors[name] || value) {
        const error = validateField(name, value, updatedFormData);
        setFormErrors({ ...formErrors, [name]: error });
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Validate on blur to show errors when user leaves the field
    const error = validateField(name, value, formData);
    setFormErrors({ ...formErrors, [name]: error });
  };

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate all required fields
    const fieldsToValidate = [
      'firstName', 'middleName', 'lastName', 'email', 
      'positionId', 'joiningDate', 'birthday', 'gender',
      'address', 'contactNumber', 'sssNo', 'tinNo', 
      'pagIbigNo', 'philhealthNo'
    ];
    
    fieldsToValidate.forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName], formData);
      if (error) {
        errors[fieldName] = error;
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;
    setIsSubmitting(true);
    const normalizeOptionalField = (value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      }
      return value;
    };

    const contactNumberValue = formData.contactNumber?.trim() || '';
    const formattedSssNo = formatSssNumber(formData.sssNo);
    const formattedTinNo = formatTinNumber(formData.tinNo);
    const formattedPagIbigNo = formatPagIbigNumber(formData.pagIbigNo);
    const formattedPhilhealthNo = formatPhilhealthNumber(formData.philhealthNo);
    const normalizedPositionId = formData.positionId ? Number(formData.positionId) : null;

    const dataToSave = { ...formData, contactNumber: contactNumberValue };
    delete dataToSave.imagePreviewUrl;
    dataToSave.name = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ').trim();
    dataToSave.first_name = formData.firstName;
    dataToSave.middle_name = formData.middleName || null;
    dataToSave.last_name = formData.lastName;
    dataToSave.contact_number = contactNumberValue;

    dataToSave.sssNo = formattedSssNo;
    dataToSave.sss_no = normalizeOptionalField(formattedSssNo);
    dataToSave.tinNo = formattedTinNo;
    dataToSave.tin_no = normalizeOptionalField(formattedTinNo);
    dataToSave.pagIbigNo = formattedPagIbigNo;
    dataToSave.pag_ibig_no = normalizeOptionalField(formattedPagIbigNo);
    dataToSave.philhealthNo = formattedPhilhealthNo;
    dataToSave.philhealth_no = normalizeOptionalField(formattedPhilhealthNo);

    dataToSave.position_id = normalizedPositionId;
    if (formData.joiningDate) {
      dataToSave.joining_date = formData.joiningDate;
    }
    if (formData.status) {
      dataToSave.account_status = formData.status;
    }

    if (!formData.middleName) {
      delete dataToSave.middleName;
    }

    try {
      // Use employeeId prop, or get ID from employeeData/fetchedEmployeeData
      const id = employeeId || employeeData?.id || fetchedEmployeeData?.id;
      await onSave(dataToSave, id);
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

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <input
                        type="text"
                        className={`form-control ${formErrors.firstName ? 'is-invalid' : ''}`}
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="First Name*"
                        disabled={isViewMode}
                        required
                      />
                      {formErrors.firstName && <div className="invalid-feedback">{formErrors.firstName}</div>}
                    </div>
                    <div className="col-md-4">
                      <input
                        type="text"
                        className={`form-control ${formErrors.middleName ? 'is-invalid' : ''}`}
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleChange}
                        placeholder="Middle Name"
                        disabled={isViewMode}
                      />
                      {formErrors.middleName && <div className="invalid-feedback">{formErrors.middleName}</div>}
                    </div>
                    <div className="col-md-4">
                      <input
                        type="text"
                        className={`form-control ${formErrors.lastName ? 'is-invalid' : ''}`}
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Last Name*"
                        disabled={isViewMode}
                        required
                      />
                      {formErrors.lastName && <div className="invalid-feedback">{formErrors.lastName}</div>}
                    </div>
                  </div>

                  <div className="mb-3 text-start">
                    <label htmlFor="positionId" className="form-label">Position*</label>
                    <select
                        className={`form-select ${formErrors.positionId ? 'is-invalid' : ''}`}
                        id="positionId"
                        name="positionId"
                        value={formData.positionId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required disabled={isViewMode}>
                        <option value="">Select a position...</option>
                        {(positions || []).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    {formErrors.positionId && <div className="invalid-feedback">{formErrors.positionId}</div>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="joiningDate" className="form-label">Joining Date*</label>
                    <input type="date" className={`form-control ${formErrors.joiningDate ? 'is-invalid' : ''}`} id="joiningDate" name="joiningDate" value={formData.joiningDate} onChange={handleChange} onBlur={handleBlur} required disabled={isViewMode || isEditMode} />
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
                            <input 
                              type="email" 
                              className={`form-control ${formErrors.email ? 'is-invalid' : ''}`} 
                              id="email" 
                              name="email" 
                              value={formData.email} 
                              onChange={handleChange} 
                              onBlur={handleBlur}
                              onInput={(e) => {
                                e.target.value = e.target.value.replace(/[^a-zA-Z0-9@._+-]/g, '');
                              }}
                              maxLength="255" 
                              required 
                              disabled={isViewMode} 
                            />
                            {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="contactNumber" className="form-label">Contact Number*</label>
                            <input 
                              type="tel" 
                              className={`form-control ${formErrors.contactNumber ? 'is-invalid' : ''}`} 
                              id="contactNumber" 
                              name="contactNumber" 
                              value={formData.contactNumber} 
                              onChange={handleChange} 
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
                              required 
                              disabled={isViewMode} 
                            />
                            {formErrors.contactNumber && <div className="invalid-feedback">{formErrors.contactNumber}</div>}
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="birthday" className="form-label">Birthday*</label>
                            <input type="date" className={`form-control ${formErrors.birthday ? 'is-invalid' : ''}`} id="birthday" name="birthday" value={formData.birthday} onChange={handleChange} onBlur={handleBlur} required disabled={isViewMode} />
                            {formErrors.birthday && <div className="invalid-feedback">{formErrors.birthday}</div>}
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="gender" className="form-label">Gender*</label>
                            <select className={`form-select ${formErrors.gender ? 'is-invalid' : ''}`} id="gender" name="gender" value={formData.gender} onChange={handleChange} onBlur={handleBlur} required disabled={isViewMode}>
                              <option value="">Select...</option><option value="Male">Male</option><option value="Female">Female</option>
                            </select>
                            {formErrors.gender && <div className="invalid-feedback">{formErrors.gender}</div>}
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="age" className="form-label">Age</label>
                            <input type="text" className="form-control" id="age" value={formData.birthday ? `${calculateAge(formData.birthday)} years old` : ''} readOnly disabled />
                          </div>
                          <div className="col-12">
                            <label htmlFor="address" className="form-label">Address*</label>
                            <textarea 
                              className={`form-control ${formErrors.address ? 'is-invalid' : ''}`} 
                              id="address" 
                              name="address" 
                              rows="3" 
                              value={formData.address} 
                              onChange={handleChange} 
                              onBlur={handleBlur}
                              onInput={(e) => {
                                e.target.value = e.target.value.replace(/[^a-zA-Z0-9\s,.#\-/()'"]/g, '');
                              }}
                              maxLength="500" 
                              required 
                              disabled={isViewMode}
                            ></textarea>
                            {formErrors.address && <div className="invalid-feedback">{formErrors.address}</div>}
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === 'statutory' && (
                      <div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="sssNo" className="form-label">SSS No.</label>
                            <IMaskInput
                              mask="00-0000000-0"
                              unmask={true}
                              onAccept={(value) => handleChange({ target: { name: 'sssNo', value } })}
                              value={formData.sssNo}
                              type="text"
                              className={`form-control ${formErrors.sssNo ? 'is-invalid' : ''}`}
                              id="sssNo"
                              name="sssNo"
                              placeholder="00-0000000-0"
                              disabled={isViewMode}
                            />
                            {formErrors.sssNo && <div className="invalid-feedback">{formErrors.sssNo}</div>}
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="tinNo" className="form-label">TIN No.</label>
                            <IMaskInput
                              mask="000-000-000-000"
                              unmask={true}
                              onAccept={(value) => handleChange({ target: { name: 'tinNo', value } })}
                              value={formData.tinNo}
                              type="text"
                              className={`form-control ${formErrors.tinNo ? 'is-invalid' : ''}`}
                              id="tinNo"
                              name="tinNo"
                              placeholder="000-000-000-000"
                              disabled={isViewMode}
                            />
                            {formErrors.tinNo && <div className="invalid-feedback">{formErrors.tinNo}</div>}
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="pagIbigNo" className="form-label">Pag-IBIG No.</label>
                            <IMaskInput
                              mask="0000-0000-0000"
                              unmask={true}
                              onAccept={(value) => handleChange({ target: { name: 'pagIbigNo', value } })}
                              value={formData.pagIbigNo}
                              type="text"
                              className={`form-control ${formErrors.pagIbigNo ? 'is-invalid' : ''}`}
                              id="pagIbigNo"
                              name="pagIbigNo"
                              placeholder="0000-0000-0000"
                              disabled={isViewMode}
                            />
                            {formErrors.pagIbigNo && <div className="invalid-feedback">{formErrors.pagIbigNo}</div>}
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="philhealthNo" className="form-label">PhilHealth No.</label>
                            <IMaskInput
                              mask="00-000000000-0"
                              unmask={true}
                              onAccept={(value) => handleChange({ target: { name: 'philhealthNo', value } })}
                              value={formData.philhealthNo}
                              type="text"
                              className={`form-control ${formErrors.philhealthNo ? 'is-invalid' : ''}`}
                              id="philhealthNo"
                              name="philhealthNo"
                              placeholder="00-000000000-0"
                              disabled={isViewMode}
                            />
                            {formErrors.philhealthNo && <div className="invalid-feedback">{formErrors.philhealthNo}</div>}
                          </div>
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
                            ) : formData.resumeUrl.startsWith('http://localhost:8000gg/api/') ? (
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