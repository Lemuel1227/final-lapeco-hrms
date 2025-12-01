import React, { useState, useEffect } from 'react';
import './StatutoryDeductionRulesManager.css';
import ConfirmationModal from '../../modals/ConfirmationModal';

const StatutoryDeductionRulesManager = () => {
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    deduction_type: '',
    rule_name: '',
    rule_type: 'fixed_percentage',
    fixed_percentage: '',
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

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/statutory-deduction-rules', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      });
      
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON Response:', text);
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      setRules(data.data || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError(`Failed to load deduction rules: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRule = (rule) => {
    setSelectedRule(rule);
    setFormData({
      deduction_type: rule.deduction_type,
      rule_name: rule.rule_name || '',
      rule_type: rule.rule_type,
      fixed_percentage: rule.fixed_percentage || '',
      minimum_salary: rule.minimum_salary || '',
      maximum_salary: rule.maximum_salary || '',
      is_default: rule.is_default || false,
      description: rule.description || '',
      formula: rule.formula ? JSON.stringify(rule.formula) : '',
      brackets: rule.brackets || []
    });
    setShowForm(true);
  };

  const handleAddNew = () => {
    setSelectedRule(null);
    setFormData({
      deduction_type: '',
      rule_name: '',
      rule_type: 'fixed_percentage',
      fixed_percentage: '',
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
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleBracketChange = (index, field, value) => {
    const newBrackets = [...formData.brackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    setFormData(prev => ({ ...prev, brackets: newBrackets }));
  };

  const handleAddBracket = () => {
    setFormData(prev => ({
      ...prev,
      brackets: [...prev.brackets, {
        salary_from: '',
        salary_to: '',
        employee_rate: '',
        employer_rate: '',
        fixed_amount: ''
      }]
    }));
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
      const url = selectedRule 
        ? `/api/statutory-deduction-rules/${selectedRule.id}` 
        : '/api/statutory-deduction-rules';
      const method = selectedRule ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        formula: formData.formula ? JSON.parse(formData.formula) : null,
      };

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save rule');
      
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
      const response = await fetch(`/api/statutory-deduction-rules/${selectedRule.id}/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(testData),
      });

      const data = await response.json();
      setTestResult(data);
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
      const response = await fetch(`/api/statutory-deduction-rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete rule');
      
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

  return (
    <div className="sdrm-container">
      <div className="sdrm-header">
        <h2>Statutory Deduction Rules</h2>
        <button className="sdrm-btn sdrm-btn-primary" onClick={handleAddNew}>Add New Rule</button>
      </div>

      {error && <div className="sdrm-alert sdrm-alert-danger">{error}</div>}

      <div className="sdrm-grid">
        <div className="sdrm-list">
          <h3>Active Rules</h3>
          {rules.map(rule => (
            <div 
              key={rule.id} 
              className={`sdrm-item ${selectedRule?.id === rule.id ? 'active' : ''}`}
              onClick={() => handleSelectRule(rule)}
            >
              <div className="sdrm-item-name">
                {rule.rule_name || rule.deduction_type}
                {rule.is_default && <span className="sdrm-default-badge">DEFAULT</span>}
              </div>
              <div className="sdrm-item-type">{rule.deduction_type} - {rule.rule_type}</div>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="sdrm-form-wrapper">
            <form onSubmit={handleSaveRule} className="sdrm-form">
              <h3>{selectedRule ? 'Edit Rule' : 'New Rule'}</h3>

              <div className="sdrm-form-group">
                <label>Deduction Type</label>
                <select
                  name="deduction_type"
                  value={formData.deduction_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Select Deduction Type --</option>
                  {DEDUCTION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="sdrm-form-group">
                <label>Rule Name (for identification)</label>
                <input
                  type="text"
                  name="rule_name"
                  value={formData.rule_name}
                  onChange={handleInputChange}
                  placeholder="e.g., SSS 2025, PhilHealth Standard, etc."
                  required
                />
              </div>

              <div className="sdrm-form-group">
                <label>Rule Type</label>
                <select name="rule_type" value={formData.rule_type} onChange={handleInputChange}>
                  <option value="fixed_percentage">Fixed Percentage</option>
                  <option value="salary_bracket">Salary Bracket</option>
                  <option value="custom_formula">Custom Formula</option>
                </select>
              </div>

              {formData.rule_type === 'fixed_percentage' && (
                <div className="sdrm-form-group">
                  <label>Fixed Percentage (%)</label>
                  <input
                    type="number"
                    name="fixed_percentage"
                    value={formData.fixed_percentage}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              )}

              <div className="sdrm-form-group">
                <label>Minimum Salary</label>
                <input
                  type="number"
                  name="minimum_salary"
                  value={formData.minimum_salary}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="sdrm-form-group">
                <label>Maximum Salary</label>
                <input
                  type="number"
                  name="maximum_salary"
                  value={formData.maximum_salary}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="sdrm-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>

              <div className="sdrm-form-group">
                <label className="sdrm-checkbox-label">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={formData.is_default}
                    onChange={handleInputChange}
                  />
                  <span>Set as default rule for this deduction type</span>
                </label>
              </div>

              {formData.rule_type === 'custom_formula' && (
                <div className="sdrm-form-group">
                  <label>Formula (JSON)</label>
                  <textarea
                    name="formula"
                    value={formData.formula}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder='{"employee_formula": "salary * 0.05", "employer_formula": "salary * 0.05"}'
                  />
                </div>
              )}

              {formData.rule_type === 'salary_bracket' && (
                <div className="sdrm-brackets">
                  <h4>Salary Brackets</h4>
                  {formData.brackets.map((bracket, index) => (
                    <div key={index} className="sdrm-bracket-row">
                      <input
                        type="number"
                        placeholder="From"
                        value={bracket.salary_from}
                        onChange={(e) => handleBracketChange(index, 'salary_from', e.target.value)}
                        step="0.01"
                      />
                      <input
                        type="number"
                        placeholder="To (optional)"
                        value={bracket.salary_to || ''}
                        onChange={(e) => handleBracketChange(index, 'salary_to', e.target.value)}
                        step="0.01"
                      />
                      <input
                        type="number"
                        placeholder="Employee Rate (%)"
                        value={bracket.employee_rate || ''}
                        onChange={(e) => handleBracketChange(index, 'employee_rate', e.target.value)}
                        step="0.01"
                      />
                      <input
                        type="number"
                        placeholder="Employer Rate (%)"
                        value={bracket.employer_rate || ''}
                        onChange={(e) => handleBracketChange(index, 'employer_rate', e.target.value)}
                        step="0.01"
                      />
                      <input
                        type="number"
                        placeholder="Fixed Amount"
                        value={bracket.fixed_amount || ''}
                        onChange={(e) => handleBracketChange(index, 'fixed_amount', e.target.value)}
                        step="0.01"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBracket(index)}
                        className="sdrm-btn sdrm-btn-sm sdrm-btn-danger"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddBracket}
                    className="sdrm-btn sdrm-btn-sm sdrm-btn-secondary"
                  >
                    Add Bracket
                  </button>
                </div>
              )}

              <div className="sdrm-actions">
                <button type="submit" className="sdrm-btn sdrm-btn-success" disabled={loading}>Save Rule</button>
                {selectedRule && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(selectedRule.id)}
                    className="sdrm-btn sdrm-btn-danger"
                    disabled={loading}
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="sdrm-btn sdrm-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>

            {selectedRule && (
              <div className="sdrm-test">
                <h4>Test Rule</h4>
                <div className="sdrm-form-group">
                  <label>Test Salary</label>
                  <input
                    type="number"
                    value={testData.salary}
                    onChange={(e) => setTestData({ salary: parseFloat(e.target.value) })}
                    step="0.01"
                  />
                </div>
                <button onClick={handleTestRule} className="sdrm-btn sdrm-btn-info" disabled={loading}>Test</button>
                
                {testResult && (
                  <div className="sdrm-test-result">
                    <h5>Result:</h5>
                    <pre>{JSON.stringify(testResult.result, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
    </div>
  );
};

export default StatutoryDeductionRulesManager;
