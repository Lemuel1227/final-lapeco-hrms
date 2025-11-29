import React, { useEffect, useMemo, useState } from 'react';
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
    <div className="mt-3 chatbot-manager">
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="qa-toolbar d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <label className="form-label fw-bold mb-0">Type</label>
              <select className="form-select form-select-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">All</option>
                <option value="recruitment">Recruitment</option>
                <option value="faq">FAQ</option>
              </select>
              <div className="input-group input-group-sm ms-2" style={{maxWidth:'720px', flex:'1 1 720px'}}>
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input type="text" className="form-control" placeholder="Search question or answer" value={search} onChange={e => setSearch(e.target.value)} />
                <button className="btn btn-outline-secondary" onClick={loadData} title="Refresh"><i className="bi bi-arrow-clockwise"></i></button>
              </div>
            </div>
            <div className="qa-summary text-muted">
              <span className="me-3">Total: {counts.total}</span>
              <span className="me-3">Active: {counts.active}</span>
              <span>Inactive: {counts.inactive}</span>
            </div>
          </div>

          <div className="qa-add-form border rounded p-3 mb-3 bg-light">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-md-2">
                <select className="form-select" value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
                  <option value="recruitment">Recruitment</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
              <div className="col-12 col-md-4">
                <input type="text" className="form-control" placeholder="Question" value={newItem.question} onChange={e => setNewItem({ ...newItem, question: e.target.value })} />
              </div>
              <div className="col-12 col-md-5">
                <input type="text" className="form-control" placeholder="Answer" value={newItem.answer} onChange={e => setNewItem({ ...newItem, answer: e.target.value })} />
              </div>
              <div className="col-12 col-md-1 d-grid">
                <button className="btn btn-success" style={{height:'38px'}} onClick={addItem}><i className="bi bi-plus-lg"></i> Add</button>
              </div>
            </div>
          </div>

          {loading && (<div className="text-center p-4"><div className="spinner-border text-success" role="status"><span className="visually-hidden">Loading...</span></div></div>)}
          {error && !loading && (<div className="alert alert-danger">{error}</div>)}

          {!loading && !error && (
            <div className="table-responsive qa-table">
              <table className="table table-sm table-bordered align-middle">
                <thead>
                  <tr>
                    <th style={{width:'140px'}}>Type</th>
                    <th style={{width:'35%'}}>Question</th>
                    <th>Answer</th>
                    <th style={{width:'120px'}} className="text-center">Status</th>
                    <th style={{width:'200px'}} className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {normalized.map(item => (
                    <tr key={item.id}>
                      <td>
                        {editingId === item.id ? (
                          <select className="form-select form-select-sm" value={item.type} onChange={e => updateField(item.id, 'type', e.target.value)}>
                            <option value="recruitment">Recruitment</option>
                            <option value="faq">FAQ</option>
                          </select>
                        ) : (
                          <span className="badge bg-secondary">{item.type}</span>
                        )}
                      </td>
                      <td>
                        {editingId === item.id ? (
                          <input type="text" className="form-control form-control-sm" value={item.question || ''} onChange={e => updateField(item.id, 'question', e.target.value)} />
                        ) : (
                          <div>{item.question}</div>
                        )}
                      </td>
                      <td>
                        {editingId === item.id ? (
                          <textarea className="form-control form-control-sm" rows={2} value={item.answer || ''} onChange={e => updateField(item.id, 'answer', e.target.value)} />
                        ) : (
                          <div className="text-muted" style={{maxWidth:'520px'}}>{item.answer}</div>
                        )}
                      </td>
                      <td className="text-center">
                        {editingId === item.id ? (
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" checked={!!item.active} onChange={e => updateField(item.id, 'active', e.target.checked)} />
                          </div>
                        ) : (
                          <button type="button" className={`btn btn-sm ${item.active ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => quickToggleActive(item)}>{item.active ? 'Active' : 'Inactive'}</button>
                        )}
                      </td>
                      <td className="text-center">
                        {editingId === item.id ? (
                          <div className="d-inline-flex gap-2 justify-content-center">
                            <button className="btn btn-sm btn-success" onClick={() => saveEdit(item.id)}><i className="bi bi-check-lg"></i> Save</button>
                            <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit}><i className="bi bi-x-lg"></i> Cancel</button>
                          </div>
                        ) : (
                          <div className="d-inline-flex gap-2 justify-content-center">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => startEdit(item.id)}><i className="bi bi-pencil"></i> Edit</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => confirmDelete(item)}><i className="bi bi-trash"></i> Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {normalized.length === 0 && (
                    <tr><td colSpan="5" className="text-center p-4">No items found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
