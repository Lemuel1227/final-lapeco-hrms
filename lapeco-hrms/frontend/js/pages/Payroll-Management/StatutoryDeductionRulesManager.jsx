import React, { useState, useEffect } from 'react';
import './StatutoryDeductionRulesManager.css';
import ConfirmationModal from '../../modals/ConfirmationModal';
import api from '../../services/api';

const StatutoryDeductionRulesManager = () => {
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    deduction_type: '',
    rule_name: '',
    rule_type: 'fixed_percentage',
    fixed_percentage: '',
    employee_rate: '',
    employer_rate: '',
    minimum_salary: '',
    maximum_salary: '',
    is_default: false,
    description: '',
    formula: '',
    brackets: [],
  });

  const DEDUCTION_TYPES = ['SSS', 'PhilHealth', 'Pag-IBIG', 'Tax'];
  const [testData, setTestData] = useState({ salary: 50000 });
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('settings');
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalTab, setModalTab] = useState('attributes');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmVariant: 'danger',
    onConfirm: null,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && selectedRule) {
      fetchHistory(selectedRule.id);
    }
  }, [activeTab, selectedRule]);

  const fetchHistory = async (ruleId) => {
    try {
      setLoadingHistory(true);
      const response = await api.get(`/statutory-deduction-rules/${ruleId}/history`);
      setHistoryLogs(response.data?.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/statutory-deduction-rules');
      setRules(response.data?.data || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError(`Failed to load deduction rules: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRule = (rule) => {
    setSelectedRule(rule);
    setActiveTab('settings');

    // Recalculate fixed amounts for SSS if missing or zero (to handle legacy data)
    let processedBrackets = rule.brackets || [];
    if (rule.deduction_type === 'SSS') {
        processedBrackets = processedBrackets.map(bracket => {
            const regularSS = parseFloat(bracket.regular_ss || 0);
            const eeRate = parseFloat(bracket.employee_rate || 0);
            const erRate = parseFloat(bracket.employer_rate || 0);
            const fixedAmount = parseFloat(bracket.fixed_amount || 0);
            const fixedEmployerAmount = parseFloat(bracket.fixed_employer_amount || 0);

            // Calculate if fixed amounts are zero/missing but rates exist
            let newFixedAmount = bracket.fixed_amount;
            let newFixedEmployerAmount = bracket.fixed_employer_amount;

            if (regularSS > 0) {
                 // Always recalculate for display consistency if rates are present
                if (eeRate > 0) {
                     newFixedAmount = (regularSS * (eeRate / 100)).toFixed(2);
                }
                if (erRate > 0) {
                    newFixedEmployerAmount = (regularSS * (erRate / 100)).toFixed(2);
                }
            }

            return {
                ...bracket,
                fixed_amount: newFixedAmount,
                fixed_employer_amount: newFixedEmployerAmount
            };
        });
    }

    setFormData({
      deduction_type: rule.deduction_type,
      rule_name: rule.rule_name || '',
      rule_type: rule.rule_type,
      fixed_percentage: rule.fixed_percentage || '',
      employee_rate: rule.employee_rate || '',
      employer_rate: rule.employer_rate || '',
      minimum_salary: rule.minimum_salary || '',
      maximum_salary: rule.maximum_salary || '',
      is_default: rule.is_default || false,
      description: rule.description || '',
      formula: rule.formula ? JSON.stringify(rule.formula) : '',
      brackets: processedBrackets
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setSelectedRule(null);
    setActiveTab('settings');
    setFormData({
      deduction_type: '',
      rule_name: '',
      rule_type: 'fixed_percentage',
      fixed_percentage: '',
      employee_rate: '',
      employer_rate: '',
      minimum_salary: '',
      maximum_salary: '',
      is_default: false,
      description: '',
      formula: '',
      brackets: []
    });
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'employee_rate' || name === 'employer_rate') {
        const otherRate = name === 'employee_rate' 
            ? parseFloat(formData.employer_rate || 0) 
            : parseFloat(formData.employee_rate || 0);
        const currentRate = parseFloat(value || 0);
        const total = (currentRate + otherRate).toFixed(2);
        
        setFormData(prev => ({ 
            ...prev, 
            [name]: value,
            fixed_percentage: total
        }));
    } else if (name === 'deduction_type' && value === 'SSS') {
      // Generate default SSS brackets (2025 Table Structure)
      // Source: RA 11199 - 15% Contribution Rate (10% ER, 5% EE)
      // Min MSC: 5,000 | Max MSC: 35,000
      // EC Contribution: 10.00 (MSC < 15k), 30.00 (MSC >= 15k)
      
      const brackets = [];
      
      // Row 1: Below 5,250 (MSC 5,000)
      brackets.push({
        salary_from: '0.00',
        salary_to: '5249.99',
        regular_ss: '5000.00',
        employee_rate: '5.0',
        employer_rate: '10.0',
        fixed_amount: (5000.00 * 0.05).toFixed(2),        // 250.00
        fixed_employer_amount: (5000.00 * 0.10 + 10.00).toFixed(2) // 500 + 10 = 510.00
      });
      
      let currentStart = 5250.00;
      let currentMSC = 5500.00;
      
      // Generate rows until 34,750
      while (currentStart < 34750) {
        const currentTo = currentStart + 499.99;
        // MSC is fully applicable up to 35k (Regular + MPF combined for calculation)
        const msc = Math.min(currentMSC, 35000.00); 
        
        const ec = msc >= 15000 ? 30.00 : 10.00;
        
        brackets.push({
          salary_from: currentStart.toFixed(2),
          salary_to: currentTo.toFixed(2),
          regular_ss: msc.toFixed(2),
          employee_rate: '5.0',
          employer_rate: '10.0',
          fixed_amount: (msc * 0.05).toFixed(2),
          fixed_employer_amount: (msc * 0.10 + ec).toFixed(2)
        });
        
        currentStart += 500;
        currentMSC += 500;
      }
      
      // Last Row: 34,750 - Over (Max MSC 35,000)
      brackets.push({
        salary_from: '34750.00',
        salary_to: '', // Represents Over/Infinity
        regular_ss: '35000.00',
        employee_rate: '5.0',
        employer_rate: '10.0',
        fixed_amount: (35000.00 * 0.05).toFixed(2),       // 1,750.00
        fixed_employer_amount: (35000.00 * 0.10 + 30.00).toFixed(2) // 3,500 + 30 = 3,530.00
      });

      setFormData(prev => ({
        ...prev,
        [name]: value,
        rule_type: 'salary_bracket', // SSS uses salary bracket table
        brackets: brackets
      }));
    } else if (name === 'deduction_type' && value === 'PhilHealth') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        rule_type: 'fixed_percentage',
        fixed_percentage: '5',
        employee_rate: '2.5',
        employer_rate: '2.5',
        brackets: []
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    }
  };

  const handleBracketChange = (index, field, value) => {
    const newBrackets = [...formData.brackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    
    // Auto-calculate SSS Shares if related fields change
    if (formData.deduction_type === 'SSS') {
        const bracket = newBrackets[index];
        const regularSS = parseFloat(bracket.regular_ss || 0);
        const eeRate = parseFloat(bracket.employee_rate || 0);
        const erRate = parseFloat(bracket.employer_rate || 0);

        if (field === 'regular_ss' || field === 'employee_rate' || field === 'employer_rate') {
            if (regularSS > 0) {
                newBrackets[index].fixed_amount = (regularSS * (eeRate / 100)).toFixed(2);
                newBrackets[index].fixed_employer_amount = (regularSS * (erRate / 100)).toFixed(2);
            }
        }
    }

    setFormData(prev => ({ ...prev, brackets: newBrackets }));
  };

  const handleAddBracket = () => {
    setFormData(prev => {
      let newBracket = {
        salary_from: '',
        salary_to: '',
        regular_ss: '',
        employee_rate: '',
        employer_rate: '',
        fixed_amount: '',
        fixed_employer_amount: ''
      };

      // Auto-populate logic for SSS
      if (prev.deduction_type === 'SSS') {
        const lastBracket = prev.brackets[prev.brackets.length - 1];
        if (!lastBracket) {
          // Default start for SSS (based on provided table image)
          // Range: BELOW 5,250 (0 - 5,249.99), Regular SS: 5,000.00
          newBracket.salary_from = '0.00';
          newBracket.salary_to = '5249.99';
          newBracket.regular_ss = '5000.00';
          newBracket.employee_rate = '4.5';
          newBracket.employer_rate = '9.5';
          newBracket.fixed_amount = (5000.00 * 0.045).toFixed(2);
          newBracket.fixed_employer_amount = (5000.00 * 0.095).toFixed(2);
        } else {
          // Increment based on last bracket
          // Range increment: 0.01 from last max
          // Range size: 500 (standard step is 499.99 difference)
          // Regular SS increment: 500
          const lastTo = parseFloat(lastBracket.salary_to || 0);
          const lastSS = parseFloat(lastBracket.regular_ss || 0);
          const eeRate = parseFloat(lastBracket.employee_rate || 4.5);
          const erRate = parseFloat(lastBracket.employer_rate || 9.5);

          if (!isNaN(lastTo)) {
            newBracket.salary_from = (lastTo + 0.01).toFixed(2);
            newBracket.salary_to = (lastTo + 0.01 + 499.99).toFixed(2);
          }
          
          if (!isNaN(lastSS)) {
            const nextSS = lastSS + 500;
            // Cap at 20000 for standard auto-add, but user can edit
            const msc = Math.min(nextSS, 20000); 
            newBracket.regular_ss = msc.toFixed(2);
            newBracket.employee_rate = eeRate.toString();
            newBracket.employer_rate = erRate.toString();
            newBracket.fixed_amount = (msc * (eeRate / 100)).toFixed(2);
            newBracket.fixed_employer_amount = (msc * (erRate / 100)).toFixed(2);
          }
        }
      }

      return {
        ...prev,
        brackets: [...prev.brackets, newBracket]
      };
    });
  };

  const handleRemoveBracket = (index) => {
    setFormData(prev => ({
      ...prev,
      brackets: prev.brackets.filter((_, i) => i !== index)
    }));
  };

  const handleSaveRule = (e) => {
    e.preventDefault();
    setConfirmConfig({
      title: selectedRule ? 'Update Rule' : 'Create Rule',
      message: `Are you sure you want to ${selectedRule ? 'update' : 'create'} this deduction rule?`,
      confirmText: 'Save',
      confirmVariant: 'success',
      onConfirm: executeSaveRule,
    });
    setShowConfirmModal(true);
  };

  const executeSaveRule = async () => {
    try {
      setLoading(true);
      const payload = {
        ...formData,
        formula: formData.formula ? JSON.parse(formData.formula) : null,
      };

      if (selectedRule) {
        await api.put(`/statutory-deduction-rules/${selectedRule.id}`, payload);
      } else {
        await api.post('/statutory-deduction-rules', payload);
      }
      
      await fetchRules();
      setShowForm(false);
      setError(null);
      setShowConfirmModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestRule = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/statutory-deduction-rules/${selectedRule.id}/test`, testData);
      setTestResult(response.data);
    } catch (err) {
      setError('Failed to test rule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = (ruleId) => {
    setConfirmConfig({
      title: 'Delete Rule',
      message: 'Are you sure you want to delete this rule? This action cannot be undone.',
      confirmText: 'Delete',
      confirmVariant: 'danger',
      onConfirm: () => executeDeleteRule(ruleId),
    });
    setShowConfirmModal(true);
  };

  const executeDeleteRule = async (ruleId) => {
    try {
      setLoading(true);
      await api.delete(`/statutory-deduction-rules/${ruleId}`);
      await fetchRules();
      setShowForm(false);
      setSelectedRule(null);
      setShowConfirmModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRules = rules.filter(rule => 
    rule.rule_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rule.deduction_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeductionIcon = (type) => {
    switch(type) {
      case 'SSS': return 'bi-shield-shaded';
      case 'PhilHealth': return 'bi-heart-pulse-fill';
      case 'Pag-IBIG': return 'bi-house-door-fill';
      case 'Tax': return 'bi-cash-coin';
      default: return 'bi-file-text';
    }
  };

  const formatChanges = (changes) => {
    if (!changes) return null;
    
    const formatted = [];
    
    if (changes.attributes) {
      Object.entries(changes.attributes).forEach(([key, value]) => {
        if (key === 'updated_at') return;
        // Check if it's a complex change object (old/new) or just a value
        const isDetailed = typeof value === 'object' && value !== null && 'new' in value;
        const newValue = isDetailed ? value.new : value;
        const oldValue = isDetailed ? value.old : null;

        formatted.push(
          <div key={`attr-${key}`} className="history-change-item">
            <span className="fw-bold text-capitalize">{key.replace(/_/g, ' ')}:</span> 
            <span className="text-muted ms-2 text-break">
                {isDetailed && oldValue !== null && (
                    <span className="text-danger text-decoration-line-through me-2">
                        {typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)}
                    </span>
                )}
                <span className={isDetailed ? 'text-success' : ''}>
                    {typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}
                </span>
            </span>
          </div>
        );
      });
    }
    
    if (changes.brackets) {
        formatted.push(
            <div key="brackets" className="history-change-item mt-2">
                <span className="fw-bold text-primary"><i className="bi bi-table me-1"></i>Brackets Updated</span>
                <div className="text-muted small ms-3">
                    <div>Old: {changes.brackets.old?.length || 0} brackets</div>
                    <div>New: {changes.brackets.new?.length || 0} brackets</div>
                </div>
            </div>
        );
    }
    
    return formatted.length > 0 ? formatted : <span className="text-muted">No specific changes recorded</span>;
  };

  const renderDetailModal = () => {
    if (!selectedLog) return null;

    const { changes } = selectedLog;
    const oldBrackets = changes.brackets?.old || [];
    const newBrackets = changes.brackets?.new || [];

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Change Details - {new Date(selectedLog.created_at).toLocaleString()}</h5>
                        <button type="button" className="btn-close" onClick={() => setSelectedLog(null)}></button>
                    </div>
                    <div className="modal-body">
                        <ul className="nav nav-tabs mb-3">
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${modalTab === 'attributes' ? 'active' : ''}`}
                                    onClick={() => setModalTab('attributes')}
                                    type="button"
                                >
                                    Attributes
                                </button>
                            </li>
                            {changes.brackets && (
                                <li className="nav-item">
                                    <button 
                                        className={`nav-link ${modalTab === 'brackets' ? 'active' : ''}`}
                                        onClick={() => setModalTab('brackets')}
                                        type="button"
                                    >
                                        Brackets Comparison
                                    </button>
                                </li>
                            )}
                        </ul>
                        <div className="tab-content">
                            {modalTab === 'attributes' && (
                                <div className="tab-pane fade show active">
                                    {changes.attributes ? (
                                        <table className="table table-bordered table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Field</th>
                                                    <th>Old Value</th>
                                                    <th>New Value</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(changes.attributes).map(([key, value]) => {
                                                    if (key === 'updated_at') return null;
                                                    const isDetailed = typeof value === 'object' && value !== null && 'new' in value;
                                                    const newValue = isDetailed ? value.new : value;
                                                    const oldValue = isDetailed ? value.old : '-';
                                                    
                                                    return (
                                                        <tr key={key}>
                                                            <td className="fw-bold text-capitalize">{key.replace(/_/g, ' ')}</td>
                                                            <td className="text-danger">{typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)}</td>
                                                            <td className="text-success">{typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="text-muted">No attribute changes.</p>
                                    )}
                                </div>
                            )}
                            {modalTab === 'brackets' && changes.brackets && (
                                <div className="tab-pane fade show active">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <h6 className="text-danger border-bottom pb-2">Previous Brackets ({oldBrackets.length})</h6>
                                            <div className="table-responsive" style={{ maxHeight: '400px' }}>
                                                <table className="table table-sm table-bordered text-muted">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Range</th>
                                                            {selectedRule?.deduction_type === 'SSS' && <th>Regular SS</th>}
                                                            <th>EE %</th>
                                                            <th>ER %</th>
                                                            <th>EE Fix</th>
                                                            <th>ER Fix</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {oldBrackets.map((b, i) => (
                                                            <tr key={i}>
                                                                <td>{b.salary_from} - {b.salary_to || 'Max'}</td>
                                                                {selectedRule?.deduction_type === 'SSS' && <td>{b.regular_ss}</td>}
                                                                <td>{b.employee_rate}</td>
                                                                <td>{b.employer_rate}</td>
                                                                <td>{b.fixed_amount}</td>
                                                                <td>{b.fixed_employer_amount}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <h6 className="text-success border-bottom pb-2">New Brackets ({newBrackets.length})</h6>
                                            <div className="table-responsive" style={{ maxHeight: '400px' }}>
                                                <table className="table table-sm table-bordered">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Range</th>
                                                            {selectedRule?.deduction_type === 'SSS' && <th>Regular SS</th>}
                                                            <th>EE %</th>
                                                            <th>ER %</th>
                                                            <th>EE Fix</th>
                                                            <th>ER Fix</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {newBrackets.map((b, i) => (
                                                            <tr key={i}>
                                                                <td>{b.salary_from} - {b.salary_to || 'Max'}</td>
                                                                {selectedRule?.deduction_type === 'SSS' && <td>{b.regular_ss}</td>}
                                                                <td>{b.employee_rate}</td>
                                                                <td>{b.employer_rate}</td>
                                                                <td>{b.fixed_amount}</td>
                                                                <td>{b.fixed_employer_amount}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="sdrm-container">
      <div className="sdrm-header">
        <div>
          <h2>Statutory Deduction Rules</h2>
          <p className="text-muted mb-0">Manage deduction formulas, brackets, and rates</p>
        </div>
        <button className="sdrm-btn sdrm-btn-primary" onClick={handleAddNew}>
          <i className="bi bi-plus-lg me-2"></i>Add New Rule
        </button>
      </div>

      {error && <div className="sdrm-alert sdrm-alert-danger"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>}

      <div className="d-flex flex-column h-100">
        {/* Search and Header Section */}
        <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 text-secondary fw-bold text-uppercase letter-spacing-1">
                Active Rules <span className="badge bg-light text-dark border ms-2">{filteredRules.length}</span>
            </h6>
            <div className="sdrm-search-box" style={{width: '300px'}}>
                <i className="bi bi-search"></i>
                <input 
                  type="text" 
                  placeholder="Search rules..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Horizontal Scrollable Header Cards */}
        <div className="sdrm-cards-scroll-container mb-4">
            <div 
                className={`sdrm-card-item dashed-border d-flex align-items-center justify-content-center text-primary ${!selectedRule && showForm ? 'active' : ''}`}
                onClick={handleAddNew}
                style={{ minWidth: '200px' }}
            >
                <div className="text-center">
                    <i className="bi bi-plus-circle fs-3 mb-2 d-block"></i>
                    <span className="fw-bold">New Rule</span>
                </div>
            </div>

            {loading && rules.length === 0 ? (
               [1, 2, 3, 4].map(n => (
                <div key={n} className="sdrm-card-item skeleton-card">
                   <div className="d-flex justify-content-between align-items-start mb-3">
                     <div className="skeleton-box rounded-circle" style={{width: '40px', height: '40px'}}></div>
                   </div>
                   <div className="sdrm-card-content w-100">
                     <div className="skeleton-text mb-2" style={{width: '70%'}}></div>
                     <div className="skeleton-text" style={{width: '40%'}}></div>
                   </div>
                </div>
              ))
            ) : filteredRules.length === 0 ? (
              <div className="text-center p-4 text-muted bg-light rounded border border-dashed flex-grow-1">
                <small>No rules found matching "{searchTerm}"</small>
              </div>
            ) : (
              filteredRules.map(rule => (
                <div 
                  key={rule.id} 
                  className={`sdrm-card-item ${selectedRule?.id === rule.id ? 'active' : ''}`}
                  onClick={() => handleSelectRule(rule)}
                >
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div className="sdrm-item-icon">
                      <i className={`bi ${getDeductionIcon(rule.deduction_type)}`}></i>
                    </div>
                    {rule.is_default && <span className="sdrm-default-badge">DEFAULT</span>}
                  </div>
                  <div className="sdrm-card-content">
                    <div className="sdrm-item-name mb-1 text-truncate" title={rule.rule_name || rule.deduction_type}>
                        {rule.rule_name || rule.deduction_type}
                    </div>
                    <div className="sdrm-item-type text-muted small text-truncate">
                        {rule.deduction_type} • {rule.rule_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))
            )}
        </div>

        {/* Main Content Area */}
        <div className="sdrm-content-full flex-grow-1">
          {!showForm ? (
            <div className="sdrm-empty-state h-100">
              <div className="empty-state-icon">
                <i className="bi bi-calculator"></i>
              </div>
              <h3>Select a Rule</h3>
              <p>Choose a deduction rule from the cards above to view or edit its details.</p>
            </div>
          ) : (
            <div className="sdrm-form-wrapper h-100">
              <div className="d-flex align-items-center justify-content-between border-bottom px-3 bg-light">
                  <div className="d-flex">
                      <button 
                          className={`btn rounded-0 py-3 px-4 ${activeTab === 'settings' ? 'text-primary fw-bold bg-white' : 'text-muted'}`}
                          onClick={() => setActiveTab('settings')}
                      >
                          <i className="bi bi-sliders me-2"></i>Settings
                      </button>
                      {selectedRule && (
                          <button 
                              className={`btn rounded-0 py-3 px-4 ${activeTab === 'history' ? 'text-primary fw-bold bg-white' : 'text-muted'}`}
                              onClick={() => setActiveTab('history')}
                          >
                              <i className="bi bi-clock-history me-2"></i>History
                          </button>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-close"
                    aria-label="Close"
                  ></button>
              </div>

              {activeTab === 'settings' ? (
              <>
              <form onSubmit={handleSaveRule} className="sdrm-form">
                <div className="sdrm-form-header pt-3 px-4">
                  <h3>{selectedRule ? 'Edit Rule Configuration' : 'New Rule Configuration'}</h3>
                </div>

                <div className="sdrm-section">
                  <h4 className="sdrm-section-title"><i className="bi bi-info-circle me-2"></i>Basic Information</h4>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="sdrm-form-group">
                        <label>Deduction Type</label>
                        <select
                          name="deduction_type"
                          value={formData.deduction_type}
                          onChange={handleInputChange}
                          required
                          className="form-select"
                        >
                          <option value="">-- Select Deduction Type --</option>
                          {DEDUCTION_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="sdrm-form-group">
                        <label>Rule Name</label>
                        <input
                          type="text"
                          name="rule_name"
                          value={formData.rule_name}
                          onChange={handleInputChange}
                          placeholder="e.g., SSS 2025 Table"
                          required
                          className="form-control"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="sdrm-form-group">
                        <label>Description</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows="2"
                          className="form-control"
                          placeholder="Optional description of this rule..."
                        />
                      </div>
                    </div>
                    <div className="col-12">
                       <div className="form-check">
                        <input
                          type="checkbox"
                          name="is_default"
                          checked={formData.is_default}
                          onChange={handleInputChange}
                          className="form-check-input"
                          id="isDefaultCheck"
                        />
                        <label className="form-check-label" htmlFor="isDefaultCheck">
                          Set as default rule for this deduction type
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sdrm-section">
                  <h4 className="sdrm-section-title"><i className="bi bi-sliders me-2"></i>Calculation Logic</h4>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="sdrm-form-group">
                        <label>Rule Type</label>
                        <select 
                          name="rule_type" 
                          value={formData.rule_type} 
                          onChange={handleInputChange}
                          className="form-select"
                        >
                          <option value="fixed_percentage">Fixed Percentage</option>
                          <option value="salary_bracket">Salary Bracket Table</option>
                          <option value="custom_formula">Custom Formula</option>
                        </select>
                      </div>
                    </div>
                    
                    {formData.rule_type === 'fixed_percentage' && (
                      <>
                        <div className="w-100"></div>
                        <div className="col-md-6">
                          <div className="sdrm-form-group">
                            <label>Employee Share (%)</label>
                            <input
                              type="number"
                              name="employee_rate"
                              value={formData.employee_rate}
                              onChange={handleInputChange}
                              step="0.01"
                              min="0"
                              max="100"
                              className="form-control"
                              placeholder="e.g. 2.5"
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="sdrm-form-group">
                            <label>Employer Share (%)</label>
                            <input
                              type="number"
                              name="employer_rate"
                              value={formData.employer_rate}
                              onChange={handleInputChange}
                              step="0.01"
                              min="0"
                              max="100"
                              className="form-control"
                              placeholder="e.g. 2.5"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {formData.rule_type !== 'salary_bracket' && (
                  <div className="row g-3 mt-2">
                    <div className="col-md-6">
                      <div className="sdrm-form-group">
                        <label>Minimum Salary Base</label>
                        <input
                          type="number"
                          name="minimum_salary"
                          value={formData.minimum_salary}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="form-control"
                        />
                        <small className="text-muted">Salary below this will use this amount as base</small>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="sdrm-form-group">
                        <label>Maximum Salary Base</label>
                        <input
                          type="number"
                          name="maximum_salary"
                          value={formData.maximum_salary}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          className="form-control"
                        />
                         <small className="text-muted">Salary above this will use this amount as base</small>
                      </div>
                    </div>
                  </div>
                  )}

                  {formData.rule_type === 'custom_formula' && (
                    <div className="mt-3">
                      <div className="sdrm-form-group">
                        <label>Formula Configuration (JSON)</label>
                        <textarea
                          name="formula"
                          value={formData.formula}
                          onChange={handleInputChange}
                          rows="4"
                          className="form-control font-monospace"
                          placeholder='{"employee_formula": "salary * 0.05", "employer_formula": "salary * 0.05"}'
                        />
                        <small className="text-muted d-block mt-1">
                          Available variables: <code>salary</code>, <code>gross</code>. Supports basic math operators.
                        </small>
                      </div>
                    </div>
                  )}
                </div>

                {formData.rule_type === 'salary_bracket' && (
                  <div className="sdrm-section">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h4 className="sdrm-section-title mb-0"><i className="bi bi-table me-2"></i>Salary Brackets</h4>
                      <button
                        type="button"
                        onClick={handleAddBracket}
                        className="btn btn-sm btn-outline-primary"
                      >
                        <i className="bi bi-plus-lg me-1"></i>Add Row
                      </button>
                    </div>
                    
                    <div className="sdrm-brackets-container">
                      <div className={`sdrm-bracket-header ${
                        formData.deduction_type === 'SSS' 
                          ? 'sdrm-bracket-header-sss' 
                          : ['Pag-IBIG'].includes(formData.deduction_type) 
                            ? 'sdrm-bracket-header-with-employer' 
                            : 'sdrm-bracket-header-no-employer'
                      }`}>
                        <div className="sdrm-bracket-col">Min Salary</div>
                      <div className="sdrm-bracket-col">Max Salary</div>
                      {formData.deduction_type === 'SSS' && (
                        <div className="sdrm-bracket-col">Regular SS</div>
                      )}
                      <div className="sdrm-bracket-col">EE Rate (%)</div>
                      {['SSS', 'Pag-IBIG'].includes(formData.deduction_type) && (
                        <div className="sdrm-bracket-col">ER Rate (%)</div>
                      )}
                      <div className="sdrm-bracket-col">EE Share (₱)</div>
                      {['SSS', 'Pag-IBIG'].includes(formData.deduction_type) && (
                        <div className="sdrm-bracket-col">ER Share (₱)</div>
                      )}
                      <div className="sdrm-bracket-col text-end">Action</div>
                    </div>
                      
                      <div className="sdrm-brackets-list">
                      {formData.brackets.length === 0 ? (
                        <div className="text-center p-4 bg-light rounded border border-dashed m-3">
                          <small className="text-muted">No brackets defined yet. Click "Add Row" to start.</small>
                        </div>
                      ) : (
                        formData.brackets.map((bracket, index) => (
                          <div key={index} className={`sdrm-bracket-row ${
                            formData.deduction_type === 'SSS'
                              ? 'sdrm-bracket-sss'
                              : ['Pag-IBIG'].includes(formData.deduction_type)
                                ? 'sdrm-bracket-with-employer'
                                : 'sdrm-bracket-no-employer'
                          }`}>
                            <div className="sdrm-bracket-field">
                              <div className="input-group input-group-sm">
                                <span className="input-group-text">₱</span>
                                <input
                                  type="number"
                                  value={bracket.salary_from}
                                  onChange={(e) => handleBracketChange(index, 'salary_from', e.target.value)}
                                  step="0.01"
                                  className="form-control"
                                  placeholder="0.00"
                                  readOnly={formData.deduction_type === 'SSS'}
                                />
                              </div>
                            </div>
                            <div className="sdrm-bracket-field">
                              <div className="input-group input-group-sm">
                                <span className="input-group-text">₱</span>
                                <input
                                  type="number"
                                  value={bracket.salary_to || ''}
                                  onChange={(e) => handleBracketChange(index, 'salary_to', e.target.value)}
                                  step="0.01"
                                  className="form-control"
                                  placeholder="Unlimited"
                                  readOnly={formData.deduction_type === 'SSS'}
                                />
                              </div>
                            </div>

                            {formData.deduction_type === 'SSS' && (
                              <div className="sdrm-bracket-field">
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text">₱</span>
                                  <input
                                    type="number"
                                    value={bracket.regular_ss || ''}
                                    onChange={(e) => handleBracketChange(index, 'regular_ss', e.target.value)}
                                    step="0.01"
                                    className="form-control"
                                    placeholder="0.00"
                                    readOnly={true}
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="sdrm-bracket-field">
                              <div className="input-group input-group-sm">
                                <input
                                  type="number"
                                  value={bracket.employee_rate || ''}
                                  onChange={(e) => handleBracketChange(index, 'employee_rate', e.target.value)}
                                  step="0.01"
                                  className="form-control"
                                  placeholder="0"
                                />
                                <span className="input-group-text">%</span>
                              </div>
                            </div>

                            {['SSS', 'Pag-IBIG'].includes(formData.deduction_type) && (
                              <div className="sdrm-bracket-field">
                                <div className="input-group input-group-sm">
                                  <input
                                    type="number"
                                    value={bracket.employer_rate || ''}
                                    onChange={(e) => handleBracketChange(index, 'employer_rate', e.target.value)}
                                    step="0.01"
                                    className="form-control"
                                    placeholder="0"
                                  />
                                  <span className="input-group-text">%</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="sdrm-bracket-field">
                              <div className="input-group input-group-sm">
                                <span className="input-group-text">₱</span>
                                <input
                                  type="number"
                                  value={bracket.fixed_amount || ''}
                                  onChange={(e) => handleBracketChange(index, 'fixed_amount', e.target.value)}
                                  step="0.01"
                                  className="form-control"
                                  placeholder="0.00"
                                  readOnly={formData.deduction_type === 'SSS'}
                                />
                              </div>
                            </div>

                            {['SSS', 'Pag-IBIG'].includes(formData.deduction_type) && (
                              <div className="sdrm-bracket-field">
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text">₱</span>
                                  <input
                                    type="number"
                                    value={bracket.fixed_employer_amount || ''}
                                    onChange={(e) => handleBracketChange(index, 'fixed_employer_amount', e.target.value)}
                                    step="0.01"
                                    className="form-control"
                                    placeholder="0.00"
                                    readOnly={formData.deduction_type === 'SSS'}
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="sdrm-bracket-action text-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveBracket(index)}
                                className="btn btn-sm btn-outline-danger border-0"
                                title="Remove Bracket"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="sdrm-actions">
                  <div className="d-flex gap-2">
                    <button type="submit" className="sdrm-btn sdrm-btn-success" disabled={loading}>
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="bi bi-check-lg me-2"></i>
                      )}
                      Save Rule
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="sdrm-btn sdrm-btn-secondary"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                  {selectedRule && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(selectedRule.id)}
                      className="sdrm-btn sdrm-btn-danger"
                      disabled={loading}
                    >
                      {loading ? (
                         <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="bi bi-trash me-2"></i>
                      )}
                      Delete Rule
                    </button>
                  )}
                </div>
              </form>

              {selectedRule && (
                <div className="sdrm-test-section">
                  <h4 className="sdrm-section-title"><i className="bi bi-lightning-charge me-2"></i>Test Configuration</h4>
                  <div className="d-flex gap-3 align-items-end">
                    <div className="flex-grow-1">
                      <label className="form-label small fw-bold">Test Salary Amount</label>
                      <div className="input-group">
                        <span className="input-group-text">₱</span>
                        <input
                          type="number"
                          value={testData.salary}
                          onChange={(e) => setTestData({ salary: parseFloat(e.target.value) })}
                          step="0.01"
                          className="form-control"
                        />
                      </div>
                    </div>
                    <button onClick={handleTestRule} className="sdrm-btn sdrm-btn-info" disabled={loading}>
                      {loading ? (
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      ) : (
                        <i className="bi bi-play-fill me-2"></i>
                      )}
                      Run Test
                    </button>
                  </div>
                  
                  {testResult && (
                    <div className="sdrm-test-result mt-3">
                      <h5 className="text-success mb-2"><i className="bi bi-check-circle-fill me-2"></i>Calculation Result</h5>
                      <pre className="mb-0">{JSON.stringify(testResult.result, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
              </>
              ) : (
                  <div className="sdrm-history p-4 bg-white" style={{ minHeight: '400px' }}>
                    <h4 className="sdrm-section-title mb-4"><i className="bi bi-clock-history me-2"></i>Change History</h4>
                    
                    {loadingHistory ? (
                      [1, 2, 3].map(n => (
                        <div key={n} className="card mb-3 border-0 shadow-sm history-log-card skeleton-card">
                           <div className="card-body">
                             <div className="d-flex justify-content-between align-items-start mb-2">
                                <div className="skeleton-text" style={{width: '150px'}}></div>
                                <div className="skeleton-text" style={{width: '100px'}}></div>
                             </div>
                             <div className="history-changes bg-light p-3 rounded mt-2">
                                <div className="skeleton-text mb-1" style={{width: '80%'}}></div>
                                <div className="skeleton-text" style={{width: '60%'}}></div>
                             </div>
                           </div>
                        </div>
                      ))
                    ) : historyLogs.length === 0 ? (
                      <div className="text-center py-5 text-muted rounded bg-light">
                        <i className="bi bi-info-circle fs-1 mb-2"></i>
                        <p>No changes recorded for this rule yet.</p>
                      </div>
                    ) : (
                      <div className="timeline">
                        {historyLogs.map((log) => (
                          <div 
                            key={log.id} 
                            className="card mb-3 border-0 shadow-sm history-log-card"
                            onClick={() => {
                              setSelectedLog(log);
                              setModalTab('attributes');
                            }}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <span className={`badge ${log.action === 'created' ? 'bg-success' : log.action === 'updated' ? 'bg-primary' : 'bg-danger'} me-2 text-uppercase`}>
                                    {log.action}
                                  </span>
                                  <span className="fw-bold text-dark">{log.user}</span>
                                </div>
                                <small className="text-muted">
                                  {new Date(log.created_at).toLocaleString()}
                                </small>
                              </div>
                              
                              <div className="history-changes bg-light p-3 rounded mt-2">
                                {formatChanges(log.changes)}
                              </div>
                              <div className="text-center mt-2">
                                <small className="text-primary">Click to view full details</small>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        show={showConfirmModal}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        confirmVariant={confirmConfig.confirmVariant}
        confirmLoading={loading}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => {
          if (confirmConfig.onConfirm) {
            confirmConfig.onConfirm();
          }
        }}
      />
      
      {renderDetailModal()}
    </div>
  );
};

export default StatutoryDeductionRulesManager;
