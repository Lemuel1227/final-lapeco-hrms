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
    birthday: '',
    gender: '',
    sssNo: '',
    tinNo: '',
    pagIbigNo: '',
    philhealthNo: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      if (positions.length === 1) {
        setFormData({ ...initialFormState, jobOpeningId: positions[0].id });
      } else {
        setFormData(initialFormState);
      }
      setErrors({});
    }
  }, [show, positions]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid.';
    }
    if (!formData.jobOpeningId) newErrors.jobOpeningId = 'Please select a position.';
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
        resume_file: formData.resumeFile,
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
                    className="form-control" 
                    id="middleName" 
                    name="middleName" 
                    value={formData.middleName} 
                    onChange={handleChange} 
                  />
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
                  <label htmlFor="phone" className="form-label">Phone</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    id="phone" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="birthday" className="form-label">Birthday</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    id="birthday" 
                    name="birthday" 
                    value={formData.birthday} 
                    onChange={handleChange} 
                  />
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
                    <option value="Other">Other</option>
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
                    className="form-control" 
                    id="resumeFile" 
                    name="resumeFile" 
                    accept=".pdf,.doc,.docx" 
                    onChange={handleChange} 
                  />
                  {formData.resumeFile && <small className="text-muted d-block mt-1">{formData.resumeFile.name}</small>}
                </div>
              </div>

              <hr className="my-4"/>
              <h6 className="form-section-title">Government Requirements (Optional)</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="sssNo" className="form-label">SSS No.</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="sssNo" 
                    name="sssNo" 
                    value={formData.sssNo} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="tinNo" className="form-label">TIN No.</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="tinNo" 
                    name="tinNo" 
                    value={formData.tinNo} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="pagIbigNo" className="form-label">Pag-IBIG No.</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="pagIbigNo" 
                    name="pagIbigNo" 
                    value={formData.pagIbigNo} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="philhealthNo" className="form-label">PhilHealth No.</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="philhealthNo" 
                    name="philhealthNo" 
                    value={formData.philhealthNo} 
                    onChange={handleChange} 
                  />
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