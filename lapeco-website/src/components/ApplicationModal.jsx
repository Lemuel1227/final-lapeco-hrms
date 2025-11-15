import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Form, Button, Row, Col, Image } from 'react-bootstrap';
import { toast } from 'react-toastify';
import StepIndicator from './StepIndicator';
import './ApplicationModal.css';
import lapecoLogo from '../assets/images/logo.png';
import { applicantApi } from '../api/api';

const TOTAL_STEPS = 4;
const INITIAL_FORM_DATA = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  birthday: '',
  gender: '',
  job_opening_id: '',
  resume: null,
  profile_picture: null,
  sss: '',
  tin: '',
  pagibig: '',
  philhealth: ''
};
function ApplicationModal({ show, onHide }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [validated, setValidated] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [positions, setPositions] = useState([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const abortControllerRef = useRef(null);

  const loadPositions = useCallback(async () => {
    setIsLoadingPositions(true);
    try {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const response = await applicantApi.getPositions({ signal: controller.signal });
      setPositions(response.data || []);
    } catch (error) {
      if (error.name !== 'CanceledError') {
        console.error('Error fetching positions:', error);
        toast.error('Failed to load positions. Please refresh the page.');
      }
    } finally {
      setIsLoadingPositions(false);
    }
  }, []);

  useEffect(() => {
    if (!show) {
      return undefined;
    }

    loadPositions();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [show, loadPositions]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const [errors, setErrors] = useState({});

  // Validate individual field in real-time
  const validateField = (name, value) => {
    let error = null;
    
    switch(name) {
      case 'first_name':
        if (value && value.trim()) {
          if (!/^[a-zA-Z\s'-]+$/.test(value)) {
            error = 'First name can only contain letters, spaces, hyphens, and apostrophes';
          } else if (value.trim().length < 2) {
            error = 'First name must be at least 2 characters';
          } else if (value.trim().length > 50) {
            error = 'First name must not exceed 50 characters';
          }
        }
        break;
      case 'middle_name':
        if (value && value.trim()) {
          if (!/^[a-zA-Z\s'-]+$/.test(value)) {
            error = 'Middle name can only contain letters, spaces, hyphens, and apostrophes';
          } else if (value.trim().length > 50) {
            error = 'Middle name must not exceed 50 characters';
          }
        }
        break;
      case 'last_name':
        if (value && value.trim()) {
          if (!/^[a-zA-Z\s'-]+$/.test(value)) {
            error = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
          } else if (value.trim().length < 2) {
            error = 'Last name must be at least 2 characters';
          } else if (value.trim().length > 50) {
            error = 'Last name must not exceed 50 characters';
          }
        }
        break;
      case 'email':
        if (value && value.trim()) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            error = 'Invalid email format';
          } else if (value.trim().length > 255) {
            error = 'Email must not exceed 255 characters';
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
            error = 'You must be at least 18 years old to apply';
          }
        }
        break;
      case 'sss':
        if (value && value.trim()) {
          if (!/^\d{2}-\d{7}-\d{1}$/.test(value) && !/^\d{10}$/.test(value)) {
            error = 'Invalid SSS format. Use: XX-XXXXXXX-X or 10 digits';
          }
        }
        break;
      case 'tin':
        if (value && value.trim()) {
          if (!/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(value) && !/^\d{9,12}$/.test(value)) {
            error = 'Invalid TIN format. Use: XXX-XXX-XXX-XXX or 9-12 digits';
          }
        }
        break;
      case 'pagibig':
        if (value && value.trim()) {
          if (!/^\d{4}-\d{4}-\d{4}$/.test(value) && !/^\d{12}$/.test(value)) {
            error = 'Invalid Pag-IBIG format. Use: XXXX-XXXX-XXXX or 12 digits';
          }
        }
        break;
      case 'philhealth':
        if (value && value.trim()) {
          if (!/^\d{2}-\d{9}-\d{1}$/.test(value) && !/^\d{12}$/.test(value)) {
            error = 'Invalid PhilHealth format. Use: XX-XXXXXXXXX-X or 12 digits';
          }
        }
        break;
    }
    
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
    
    // Validate field in real-time
    const fieldError = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: fieldError }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const { name } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: file || null }));
    
    // Validate file immediately
    if (file) {
      let error = null;
      if (name === 'resume') {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          error = 'Resume file must be less than 5MB';
        }
      } else if (name === 'profile_picture') {
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
          error = 'Photo must be less than 2MB';
        }
      }
      setErrors(prev => ({ ...prev, [name]: error }));
    } else {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setFormData(prevState => ({ ...prevState, profile_picture: file }));
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(URL.createObjectURL(file));
      
      // Validate photo size immediately
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        setErrors(prev => ({ ...prev, profile_picture: 'Photo must be less than 2MB' }));
      } else {
        setErrors(prev => ({ ...prev, profile_picture: null }));
      }
    } else if (!file) {
      setFormData(prevState => ({ ...prevState, profile_picture: null }));
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
      }
      setErrors(prev => ({ ...prev, profile_picture: null }));
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setValidated(false);
    setCurrentStep(1);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    document.getElementById('multiStepForm')?.reset();
  };
  const handleAttemptClose = () => {
    setShowExitConfirmModal(true);
  };
  const handleFinalClose = () => {
    setShowExitConfirmModal(false);
    resetForm();
    onHide();
  };
  const handleNextStep = (event) => {
    const form = event.currentTarget;
    event.preventDefault();
    if (form.checkValidity() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }
    setValidated(false);
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  const validateFormData = () => {
    const newErrors = {};
    
    // Name validations
    if (formData.first_name && formData.first_name.trim()) {
      if (formData.first_name.trim().length < 2) {
        newErrors.first_name = 'First name must be at least 2 characters';
      } else if (formData.first_name.trim().length > 50) {
        newErrors.first_name = 'First name must not exceed 50 characters';
      }
    }
    
    if (formData.last_name && formData.last_name.trim()) {
      if (formData.last_name.trim().length < 2) {
        newErrors.last_name = 'Last name must be at least 2 characters';
      } else if (formData.last_name.trim().length > 50) {
        newErrors.last_name = 'Last name must not exceed 50 characters';
      }
    }
    
    if (formData.middle_name && formData.middle_name.trim().length > 50) {
      newErrors.middle_name = 'Middle name must not exceed 50 characters';
    }
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (formData.email.trim().length > 255) {
      newErrors.email = 'Email must not exceed 255 characters';
    }
    
    // Phone validation (Philippine format)
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+63|0)?9\d{9}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
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
        newErrors.birthday = 'You must be at least 18 years old to apply';
      }
    }
    
    // Government ID validations (optional but must be valid if provided)
    if (formData.sss && !/^\d{2}-\d{7}-\d{1}$/.test(formData.sss) && !/^\d{10}$/.test(formData.sss)) {
      newErrors.sss = 'Invalid SSS format. Use: XX-XXXXXXX-X or 10 digits';
    }
    
    if (formData.tin && !/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(formData.tin) && !/^\d{9,12}$/.test(formData.tin)) {
      newErrors.tin = 'Invalid TIN format. Use: XXX-XXX-XXX-XXX or 9-12 digits';
    }
    
    if (formData.pagibig && !/^\d{4}-\d{4}-\d{4}$/.test(formData.pagibig) && !/^\d{12}$/.test(formData.pagibig)) {
      newErrors.pagibig = 'Invalid Pag-IBIG format. Use: XXXX-XXXX-XXXX or 12 digits';
    }
    
    if (formData.philhealth && !/^\d{2}-\d{9}-\d{1}$/.test(formData.philhealth) && !/^\d{12}$/.test(formData.philhealth)) {
      newErrors.philhealth = 'Invalid PhilHealth format. Use: XX-XXXXXXXXX-X or 12 digits';
    }
    
    // File validations
    if (formData.resume) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (formData.resume.size > maxSize) {
        newErrors.resume = 'Resume file must be less than 5MB';
      }
    }
    
    if (formData.profile_picture) {
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (formData.profile_picture.size > maxSize) {
        newErrors.profile_picture = 'Photo must be less than 2MB';
      }
    }
    
    return newErrors;
  };

  const handleAttemptSubmit = () => {
    setValidated(true);
    const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'birthday', 'gender', 'job_opening_id', 'resume'];
    const hasMissing = requiredFields.some(field => !formData[field]);
    if (hasMissing) {
      toast.error('Please fill in all required fields before submitting.');
      return;
    }
    
    // Run custom validations
    const validationErrors = validateFormData();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const errorMessages = Object.values(validationErrors).join('\n');
      toast.error(errorMessages);
      // Find which step has errors and go there
      if (validationErrors.email || validationErrors.phone || validationErrors.birthday) {
        setCurrentStep(1);
      } else if (validationErrors.resume || validationErrors.profile_picture) {
        setCurrentStep(2);
      } else if (validationErrors.sss || validationErrors.tin || validationErrors.pagibig || validationErrors.philhealth) {
        setCurrentStep(3);
      }
      return;
    }
    
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();
      const backendFieldMap = {
        sss: 'sss_no',
        tin: 'tin_no',
        pagibig: 'pag_ibig_no',
        philhealth: 'philhealth_no'
      };
      Object.entries(formData).forEach(([key, value]) => {
        const backendKey = backendFieldMap[key] || key;
        if (value instanceof File) {
          formDataToSend.append(backendKey, value);
        } else if (value !== null && value !== undefined) {
          formDataToSend.append(backendKey, value);
        }
      });

      await applicantApi.submitApplication(formDataToSend);
      toast.success('Application submitted successfully! Thank you.');
      handleFinalClose();
    } catch (error) {
      console.error('Error submitting application:', error);
      if (error.response?.status === 422 && error.response.data?.errors) {
        const validationErrors = Object.values(error.response.data.errors).flat();
        toast.error(validationErrors.join('\n'));
      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Unable to connect to the server. Please check your connection and try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit application. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Row className="mb-3">
              <Form.Group as={Col} md={4} controlId="validationFirstName">
                <Form.Label>First Name*</Form.Label>
                <Form.Control 
                  type="text" 
                  name="first_name" 
                  value={formData.first_name} 
                  onChange={handleChange}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^a-zA-Z\s'-]/g, '');
                  }}
                  maxLength={50}
                  isInvalid={!!errors.first_name}
                  required 
                />
                <Form.Control.Feedback type="invalid">
                  {errors.first_name || 'Please provide your first name.'}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={3} controlId="validationMiddleName">
                <Form.Label>Middle</Form.Label>
                <Form.Control 
                  type="text" 
                  name="middle_name" 
                  value={formData.middle_name} 
                  onChange={handleChange}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^a-zA-Z\s'-]/g, '');
                  }}
                  maxLength={50}
                  isInvalid={!!errors.middle_name}
                />
                <Form.Control.Feedback type="invalid">{errors.middle_name}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={5} controlId="validationLastName">
                <Form.Label>Last Name*</Form.Label>
                <Form.Control 
                  type="text" 
                  name="last_name" 
                  value={formData.last_name} 
                  onChange={handleChange}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^a-zA-Z\s'-]/g, '');
                  }}
                  maxLength={50}
                  isInvalid={!!errors.last_name}
                  required 
                />
                <Form.Control.Feedback type="invalid">
                  {errors.last_name || 'Please provide your last name.'}
                </Form.Control.Feedback>
              </Form.Group>
            </Row>
            <Row className="mb-3">
              <Form.Group as={Col} md={7} controlId="validationEmail">
                <Form.Label>Email*</Form.Label>
                <Form.Control 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  onInput={(e) => {
                    e.target.value = e.target.value.replace(/[^a-zA-Z0-9@._+-]/g, '');
                  }}
                  maxLength={255}
                  placeholder="example@email.com" 
                  isInvalid={!!errors.email}
                  required 
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email || 'Please provide a valid email.'}
                </Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={5} controlId="validationPhone">
                <Form.Label>Phone Number*</Form.Label>
                <Form.Control 
                  type="tel" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  onInput={(e) => {
                    let value = e.target.value.replace(/[^0-9+\-()\s]/g, '');
                    const digitCount = value.replace(/[^0-9]/g, '').length;
                    if (digitCount > 11) {
                      const digits = value.replace(/[^0-9]/g, '').slice(0, 11);
                      value = digits;
                    }
                    e.target.value = value;
                  }}
                  placeholder="09XXXXXXXXX" 
                  isInvalid={!!errors.phone}
                  required 
                />
                <Form.Control.Feedback type="invalid">
                  {errors.phone || 'Please provide a valid phone number.'}
                </Form.Control.Feedback>
              </Form.Group>
            </Row>
            <Row className="mb-4 align-items-center">
              <Form.Group as={Col} sm={8} controlId="validationPhoto">
                <Form.Label>Applicant Photo (Optional)</Form.Label>
                <Form.Control 
                  type="file" 
                  name="profile_picture" 
                  onChange={handlePhotoChange} 
                  accept="image/png, image/jpeg, image/jpg" 
                  isInvalid={!!errors.profile_picture}
                />
                <Form.Control.Feedback type="invalid">{errors.profile_picture}</Form.Control.Feedback>
                <Form.Text className="text-muted">JPG or PNG format. Max 2MB.</Form.Text>
              </Form.Group>
              {photoPreview && (
                <Col sm={4} className="text-center mt-3 mt-sm-0">
                  <Image src={photoPreview} alt="Applicant preview" className="applicant-photo-preview" />
                </Col>
              )}
            </Row>
            <Row className="mb-4">
              <Form.Group as={Col} md={6} controlId="validationBirthday">
                <Form.Label>Birthday*</Form.Label>
                <Form.Control 
                  type="date" 
                  name="birthday" 
                  value={formData.birthday} 
                  onChange={handleChange} 
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  isInvalid={!!errors.birthday}
                  required 
                />
                <Form.Control.Feedback type="invalid">
                  {errors.birthday || 'Please enter your birthday.'}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">Must be at least 18 years old</Form.Text>
              </Form.Group>
              <Form.Group as={Col} md={6} controlId="validationGender">
                <Form.Label>Gender*</Form.Label>
                <Form.Select name="gender" value={formData.gender} onChange={handleChange} required>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">Please select your gender.</Form.Control.Feedback>
              </Form.Group>
            </Row>
          </>
        );
      case 2:
        return (
          <>
            <Row className="mb-4">
              <Form.Group as={Col} md={6} controlId="validationApplyingFor">
                <Form.Label>Applying For*</Form.Label>
                <Form.Select name="job_opening_id" value={formData.job_opening_id} onChange={handleChange} required disabled={isLoadingPositions}>
                  <option value="">{isLoadingPositions ? 'Loading positions...' : 'Select a job...'}</option>
                  {positions.map(position => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">Please select a job position.</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={6} controlId="validationResume">
                <Form.Label>Resume (PDF/Doc)*</Form.Label>
                <Form.Control 
                  type="file" 
                  name="resume" 
                  onChange={handleFileChange} 
                  accept=".pdf,.doc,.docx" 
                  isInvalid={!!errors.resume}
                  required 
                />
                <Form.Control.Feedback type="invalid">
                  {errors.resume || 'Please upload your resume.'}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">PDF or DOC format. Max 5MB.</Form.Text>
              </Form.Group>
            </Row>
          </>
        );
      case 3:
        return (
          <>
            <Row className="mb-3">
              <Form.Group as={Col} md={6} controlId="validationSSS">
                <Form.Label>SSS No.</Form.Label>
                <Form.Control 
                  type="text" 
                  name="sss" 
                  value={formData.sss} 
                  onChange={handleChange}
                  onInput={(e) => {
                    let value = e.target.value.replace(/[^0-9-]/g, '');
                    const digitCount = value.replace(/[^0-9]/g, '').length;
                    if (digitCount > 10) {
                      const digits = value.replace(/[^0-9]/g, '').slice(0, 10);
                      value = digits;
                    }
                    e.target.value = value;
                  }}
                  maxLength={12}
                  placeholder="XX-XXXXXXX-X"
                  isInvalid={!!errors.sss}
                />
                <Form.Control.Feedback type="invalid">{errors.sss}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={6} controlId="validationTIN">
                <Form.Label>TIN No.</Form.Label>
                <Form.Control 
                  type="text" 
                  name="tin" 
                  value={formData.tin} 
                  onChange={handleChange}
                  onInput={(e) => {
                    let value = e.target.value.replace(/[^0-9-]/g, '');
                    const digitCount = value.replace(/[^0-9]/g, '').length;
                    if (digitCount > 12) {
                      const digits = value.replace(/[^0-9]/g, '').slice(0, 12);
                      value = digits;
                    }
                    e.target.value = value;
                  }}
                  maxLength={15}
                  placeholder="XXX-XXX-XXX-XXX"
                  isInvalid={!!errors.tin}
                />
                <Form.Control.Feedback type="invalid">{errors.tin}</Form.Control.Feedback>
              </Form.Group>
            </Row>
            <Row className="mb-4">
              <Form.Group as={Col} md={6} controlId="validationPagibig">
                <Form.Label>Pag-IBIG No.</Form.Label>
                <Form.Control 
                  type="text" 
                  name="pagibig" 
                  value={formData.pagibig} 
                  onChange={handleChange}
                  onInput={(e) => {
                    let value = e.target.value.replace(/[^0-9-]/g, '');
                    const digitCount = value.replace(/[^0-9]/g, '').length;
                    if (digitCount > 12) {
                      const digits = value.replace(/[^0-9]/g, '').slice(0, 12);
                      value = digits;
                    }
                    e.target.value = value;
                  }}
                  maxLength={14}
                  placeholder="XXXX-XXXX-XXXX"
                  isInvalid={!!errors.pagibig}
                />
                <Form.Control.Feedback type="invalid">{errors.pagibig}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group as={Col} md={6} controlId="validationPhilhealth">
                <Form.Label>PhilHealth No.</Form.Label>
                <Form.Control 
                  type="text" 
                  name="philhealth" 
                  value={formData.philhealth} 
                  onChange={handleChange}
                  onInput={(e) => {
                    let value = e.target.value.replace(/[^0-9-]/g, '');
                    const digitCount = value.replace(/[^0-9]/g, '').length;
                    if (digitCount > 12) {
                      const digits = value.replace(/[^0-9]/g, '').slice(0, 12);
                      value = digits;
                    }
                    e.target.value = value;
                  }}
                  maxLength={14}
                  placeholder="XX-XXXXXXXXX-X"
                  isInvalid={!!errors.philhealth}
                />
                <Form.Control.Feedback type="invalid">{errors.philhealth}</Form.Control.Feedback>
              </Form.Group>
            </Row>
          </>
        );
      case 4:
        return (
          <>
            <p className="mb-4">Please review your information carefully before submitting.</p>
            <div className="review-summary">
              {Object.entries(formData).map(([key, value]) => {
                if (!value) return null;
                const formattedKey = key
                  .replace(/_/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase());
                return (
                  <div key={key} className="review-item">
                    <strong>{formattedKey}:</strong>
                    <span>{value instanceof File ? value.name : value}</span>
                  </div>
                );
              })}
            </div>
          </>
        );
      default:
        return null;
    }
  };
  return (
    <>
      <Modal show={show} onHide={handleAttemptClose} dialogClassName="modal-90w" centered backdrop="static" keyboard={false}>
        <Modal.Body className="p-0">
          <div className="application-modal-layout">
            <div className="modal-sidebar">
              <img src={lapecoLogo} alt="LAPECO" className="modal-logo" />
              <StepIndicator currentStep={currentStep} />
            </div>
            <div className="modal-main-content">
              <div className="modal-form-header">
                <h3 className="modal-form-title">
                  {currentStep === 1 && 'Personal Information'}
                  {currentStep === 2 && 'Application Details'}
                  {currentStep === 3 && 'Government Requirements'}
                  {currentStep === 4 && 'Review Your Application'}
                </h3>
                <button type="button" className="btn-close" aria-label="Close" onClick={handleAttemptClose}></button>
              </div>
              <Form noValidate validated={validated} onSubmit={handleNextStep} id="multiStepForm">
                <div className="form-content-area">
                  {renderStepContent()}
                </div>
                <div className="modal-navigation">
                  {currentStep > 1 && (
                    <Button variant="secondary" onClick={handlePrevStep}>
                      Previous
                    </Button>
                  )}
                  <div className="ms-auto">
                    {currentStep < TOTAL_STEPS && (
                      <Button variant="success" type="submit">
                        Next Step
                      </Button>
                    )}
                    {currentStep === TOTAL_STEPS && (
                      <Button variant="success" onClick={handleAttemptSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    )}
                  </div>
                </div>
              </Form>
            </div>
          </div>
        </Modal.Body>
      </Modal>
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Submission</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to submit your application? Please ensure all information is correct.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleFinalSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showExitConfirmModal} onHide={() => setShowExitConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Exit Application?</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to exit? All your progress will be lost.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExitConfirmModal(false)}>
            Stay
          </Button>
          <Button variant="danger" onClick={handleFinalClose}>
            Exit
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
export default ApplicationModal;
