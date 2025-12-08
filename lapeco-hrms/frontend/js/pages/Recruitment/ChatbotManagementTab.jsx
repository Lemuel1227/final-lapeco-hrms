import React, { useEffect, useMemo, useState } from 'react';
import './ChatbotManagementTab.css';
import ConfirmationModal from '../../modals/ConfirmationModal';
import ToastNotification from '../../common/ToastNotification';
import { chatbotAPI } from '../../services/api';

const DEFAULT_TYPE = 'recruitment';

const ChatbotManagementTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'question', dir: 'asc' });
  const [tagInputs, setTagInputs] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newItem, setNewItem] = useState({ type: DEFAULT_TYPE, question: '', answer: '' });

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const params = filterType === 'all' ? {} : { type: filterType };
      const resp = await chatbotAPI.getAll(params);
      setItems(Array.isArray(resp?.data?.data) ? resp.data.data : []);
    } catch (e) {
      setError('Failed to load chatbot Q&A.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [filterType]);

  const startEdit = (id) => setEditingId(id);
  const cancelEdit = () => setEditingId(null);

  const updateField = (id, key, value) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [key]: value } : it));
  };

  const addTagToItem = () => {};
  const removeTagFromItem = () => {};

  const saveEdit = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    try {
      await chatbotAPI.update(id, { type: item.type, question: item.question, answer: item.answer, active: !!item.active });
      setEditingId(null);
      setToast({ show: true, message: 'Saved changes.', type: 'success' });
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to save changes.';
      setToast({ show: true, message: msg, type: 'error' });
    }
  };

  const quickToggleActive = async (item) => {
    try {
      const next = !item.active;
      await chatbotAPI.update(item.id, { active: next });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: next } : i));
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to update status.';
      setToast({ show: true, message: msg, type: 'error' });
    }
  };

  const addItem = async () => {
    const payload = { type: newItem.type, question: newItem.question, answer: newItem.answer };
    if (!payload.question.trim() || !payload.answer.trim()) {
      setToast({ show: true, message: 'Question and Answer are required.', type: 'warning' });
      return;
    }
    try {
      const resp = await chatbotAPI.create(payload);
      const created = resp?.data?.qa || null;
      setItems(prev => created ? [created, ...prev] : prev);
      setNewItem({ type: DEFAULT_TYPE, question: '', answer: '' });
      setToast({ show: true, message: 'Added new Q&A.', type: 'success' });
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to add Q&A.';
      setToast({ show: true, message: msg, type: 'error' });
    }
  };

  const confirmDelete = (item) => setDeletingItem(item);
  const doDelete = async () => {
    if (!deletingItem) return;
    try {
      await chatbotAPI.delete(deletingItem.id);
      setItems(prev => prev.filter(i => i.id !== deletingItem.id));
      setDeletingItem(null);
      setToast({ show: true, message: 'Deleted Q&A.', type: 'success' });
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to delete Q&A.';
      setToast({ show: true, message: msg, type: 'error' });
    }
  };

  const normalized = useMemo(() => {
    let data = filterType === 'all' ? items : items.filter(i => i.type === filterType);
    const s = search.trim().toLowerCase();
    if (s) {
      data = data.filter(i => (i.question || '').toLowerCase().includes(s) || (i.answer || '').toLowerCase().includes(s));
    }
    const { key, dir } = sort;
    const cmp = (a, b) => {
      const va = (a[key] || '').toString().toLowerCase();
      const vb = (b[key] || '').toString().toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    };
    return [...data].sort(cmp);
  }, [items, filterType, search, sort]);

  const counts = useMemo(() => {
    const total = normalized.length;
    const active = normalized.filter(i => i.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [normalized]);

  const setSortKey = (key) => {
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <div className="chatbot-management-container">
      {/* Stats Cards */}
      <div className="chatbot-stats-row mb-4">
        <div className="chatbot-stat-card">
          <div className="stat-icon icon-total">
            <i className="bi bi-chat-dots"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{counts.total}</div>
            <div className="stat-label">Total Q&A</div>
          </div>
        </div>
        <div className="chatbot-stat-card">
          <div className="stat-icon icon-active">
            <i className="bi bi-check-circle"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{counts.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="chatbot-stat-card">
          <div className="stat-icon icon-inactive">
            <i className="bi bi-dash-circle"></i>
          </div>
          <div className="stat-content">
            <div className="stat-value">{counts.inactive}</div>
            <div className="stat-label">Inactive</div>
          </div>
        </div>
      </div>

      {/* Add New Q&A Button & Search Section */}
      <div className="qa-controls-section mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-auto">
            <select className="form-select form-select-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="recruitment">Recruitment</option>
              <option value="faq">FAQ</option>
            </select>
          </div>
          <div className="col-12 col-md">
            <div className="input-group input-group-sm">
              <span className="input-group-text"><i className="bi bi-search"></i></span>
              <input type="text" className="form-control" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
              <button className="btn btn-outline-secondary btn-sm" onClick={loadData} title="Refresh"><i className="bi bi-arrow-clockwise"></i></button>
            </div>
          </div>
          <div className="col-auto">
            <button className="btn btn-success btn-sm" onClick={() => setShowAddModal(true)}>
              <i className="bi bi-plus-circle me-1"></i>Add Q&A
            </button>
          </div>
        </div>
      </div>

      {/* Q&A Table */}
      <div className="qa-table-section">
        {loading && (
          <div className="loading-container">
            <div className="spinner-border text-success" role="status"><span className="visually-hidden">Loading...</span></div>
            <p className="mt-3 text-muted">Loading Q&A data...</p>
          </div>
        )}
        
        {error && !loading && (<div className="alert alert-danger alert-dismissible fade show" role="alert">{error}<button type="button" className="btn-close" onClick={() => setError('')}></button></div>)}

        {!loading && !error && (
          <div className="table-responsive qa-table">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th style={{width:'30px'}}></th>
                  <th style={{width:'100px'}}>
                    <span className="cursor-pointer d-inline-flex align-items-center gap-1" onClick={() => setSortKey('type')} title="Click to sort">
                      Type {sort.key === 'type' && <i className={`bi bi-arrow-${sort.dir === 'asc' ? 'up' : 'down'}`}></i>}
                    </span>
                  </th>
                  <th>
                    <span className="cursor-pointer d-inline-flex align-items-center gap-1" onClick={() => setSortKey('question')} title="Click to sort">
                      Question {sort.key === 'question' && <i className={`bi bi-arrow-${sort.dir === 'asc' ? 'up' : 'down'}`}></i>}
                    </span>
                  </th>
                  <th style={{width:'100px'}} className="text-center">Status</th>
                  <th style={{width:'150px'}} className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {normalized.map(item => (
                  <React.Fragment key={item.id}>
                    <tr className={editingId === item.id ? 'editing' : ''}>
                      <td className="expand-cell">
                        {editingId !== item.id && (
                          <button className="btn btn-sm btn-link expand-btn" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} title="View answer">
                            <i className={`bi bi-chevron-${expandedId === item.id ? 'up' : 'down'}`}></i>
                          </button>
                        )}
                      </td>
                      <td>
                        {editingId === item.id ? (
                          <select className="form-select form-select-sm" value={item.type} onChange={e => updateField(item.id, 'type', e.target.value)}>
                            <option value="recruitment">Recruitment</option>
                            <option value="faq">FAQ</option>
                          </select>
                        ) : (
                          <span className={`badge bg-type-${item.type}`}>{item.type}</span>
                        )}
                      </td>
                      <td className="question-cell">
                        {editingId === item.id ? (
                          <input type="text" className="form-control form-control-sm" value={item.question || ''} onChange={e => updateField(item.id, 'question', e.target.value)} />
                        ) : (
                          <span className="qa-text question-text">{item.question}</span>
                        )}
                      </td>
                      <td className="text-center">
                        {editingId === item.id ? (
                          <div className="form-check form-switch d-flex justify-content-center">
                            <input className="form-check-input" type="checkbox" checked={!!item.active} onChange={e => updateField(item.id, 'active', e.target.checked)} />
                          </div>
                        ) : (
                          <span className={`status-badge status-${item.active ? 'active' : 'inactive'}`}>
                            <i className={`bi bi-${item.active ? 'check-circle-fill' : 'circle'}`}></i>
                            {item.active ? 'Active' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {editingId === item.id ? (
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-success" onClick={() => saveEdit(item.id)} title="Save changes"><i className="bi bi-check-lg"></i></button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} title="Cancel"><i className="bi bi-x-lg"></i></button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(item.id)} title="Edit"><i className="bi bi-pencil"></i></button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(item)} title="Delete"><i className="bi bi-trash"></i></button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === item.id && editingId !== item.id && (
                      <tr className="expand-row">
                        <td colSpan="5">
                          <div className="answer-expanded">
                            <div className="answer-label">Answer:</div>
                            {item.dynamic_handler ? (
                              <div className="text-muted fst-italic">
                                <i className="bi bi-lightning-charge me-1"></i>
                                Dynamic content: {item.dynamic_handler} (System generated)
                              </div>
                            ) : (
                              <div className="answer-content">{item.answer}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {editingId === item.id && (
                      <tr className="expand-row editing-row">
                        <td colSpan="5">
                          <div className="answer-expanded">
                            <div className="answer-label">Answer:</div>
                            {item.dynamic_handler ? (
                              <div className="alert alert-info py-2 mb-0">
                                <i className="bi bi-info-circle me-2"></i>
                                This answer is dynamically generated based on system data ({item.dynamic_handler}) and cannot be manually edited.
                              </div>
                            ) : (
                              <textarea className="form-control form-control-sm" rows={3} value={item.answer || ''} onChange={e => updateField(item.id, 'answer', e.target.value)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {normalized.length === 0 && (
                  <tr><td colSpan="5" className="text-center p-5"><div className="empty-state"><i className="bi bi-inbox"></i><p>No Q&A items found</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        show={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={doDelete}
        title="Delete Q&A"
        message={`Are you sure you want to delete this Q&A? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />

      {/* Add New Q&A Modal */}
      <div className={`modal fade ${showAddModal ? 'show' : ''}`} style={{display: showAddModal ? 'block' : 'none'}} tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title fw-bold">Add New Q&A</h5>
              <button type="button" className="btn-close" onClick={() => { setShowAddModal(false); setNewItem({ type: DEFAULT_TYPE, question: '', answer: '' }); }}></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-600">Type</label>
                <select className="form-select" value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
                  <option value="recruitment">Recruitment</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label fw-600">Question</label>
                <input type="text" className="form-control" placeholder="Enter your question..." value={newItem.question} onChange={e => setNewItem({ ...newItem, question: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-600">Answer</label>
                <textarea className="form-control" rows="5" placeholder="Enter your answer..." value={newItem.answer} onChange={e => setNewItem({ ...newItem, answer: e.target.value })}></textarea>
              </div>
            </div>
            <div className="modal-footer border-0">
              <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowAddModal(false); setNewItem({ type: DEFAULT_TYPE, question: '', answer: '' }); }}>Cancel</button>
              <button type="button" className="btn btn-success" onClick={() => { addItem(); setShowAddModal(false); setNewItem({ type: DEFAULT_TYPE, question: '', answer: '' }); }}>Add Q&A</button>
            </div>
          </div>
        </div>
      </div>
      {showAddModal && <div className="modal-backdrop fade show"></div>}

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

export default ChatbotManagementTab;
