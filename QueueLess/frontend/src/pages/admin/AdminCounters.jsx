import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, X } from 'lucide-react';

const Toast = ({ msg, type, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
    background: type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
    color: 'white', padding: '14px 20px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', gap: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)', fontWeight: 600, minWidth: '280px'
  }}>
    {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
    {msg}
    <X size={16} style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={onClose} />
  </div>
);

const AdminCounters = () => {
  const [counters, setCounters] = useState([]);
  const [offices, setOffices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({ office_id: '', counter_name: '', status: 'active' });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [cRes, oRes] = await Promise.all([api.get('/admin/counters'), api.get('/admin/offices')]);
      setCounters(cRes.data);
      setOffices(oRes.data);
    } catch { showToast('Failed to load data.', 'error'); }
    finally { setIsLoading(false); }
  };

  const validate = () => {
    const e = {};
    if (!formData.counter_name.trim()) e.counter_name = 'Counter name is required.';
    if (!formData.office_id) e.office_id = 'Please select an office.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...formData, office_id: parseInt(formData.office_id) };
      if (editing) {
        await api.put(`/admin/counters/${editing.id}`, payload);
        showToast('Counter updated successfully.');
      } else {
        await api.post('/admin/counters', payload);
        showToast('Counter created successfully.');
      }
      setShowModal(false);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error saving counter.', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (ctr) => {
    try {
      await api.delete(`/admin/counters/${ctr.id}`);
      showToast('Counter deleted successfully.');
      setDeleteConfirm(null);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Cannot delete counter.', 'error');
      setDeleteConfirm(null);
    }
  };

  const errStyle = { color: 'var(--danger-color)', fontSize: '0.82rem', marginTop: '4px' };

  return (
    <div style={{ padding: '30px' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Counter Management</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Create, edit, and delete service counters.</p>
        </div>
        <button className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setEditing(null); setFormData({ office_id: offices[0]?.id || '', counter_name: '', status: 'active' }); setErrors({}); setShowModal(true); }}>
          <Plus size={18} /> Add Counter
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading counters...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                {['ID', 'Counter Name', 'Office', 'Assigned Employee', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.9rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {counters.map(ctr => (
                <tr key={ctr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{ctr.id}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700 }}>{ctr.counter_name}</td>
                  <td style={{ padding: '14px 18px' }}>{ctr.office_name}</td>
                  <td style={{ padding: '14px 18px', fontSize: '0.9rem', color: ctr.employee_name ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {ctr.employee_name ? <><strong>{ctr.employee_name}</strong><br /><span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{ctr.employee_email}</span></> : '—'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                      background: ctr.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: ctr.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {ctr.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center' }}
                        onClick={() => { setEditing(ctr); setFormData({ office_id: ctr.office_id, counter_name: ctr.counter_name, status: ctr.status }); setErrors({}); setShowModal(true); }}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setDeleteConfirm(ctr)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {counters.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No counters found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card animate-fade-in" style={{ width: '440px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{editing ? 'Edit Counter' : 'Add New Counter'}</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Office *</label>
                <select className="select-field" value={formData.office_id} onChange={e => setFormData({ ...formData, office_id: e.target.value })}>
                  <option value="">-- Select Office --</option>
                  {offices.map(o => <option key={o.id} value={o.id}>{o.name} ({o.city})</option>)}
                </select>
                {errors.office_id && <div style={errStyle}>{errors.office_id}</div>}
              </div>
              <div>
                <label className="label">Counter Name *</label>
                <input className="input-field" value={formData.counter_name} onChange={e => setFormData({ ...formData, counter_name: e.target.value })} placeholder="e.g. Counter 1 – Learner's Licence" />
                {errors.counter_name && <div style={errStyle}>{errors.counter_name}</div>}
              </div>
              <div>
                <label className="label">Status</label>
                <select className="select-field" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              </div>
              <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn-accent" disabled={saving}>
                  {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Counter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '400px', padding: '28px', textAlign: 'center' }}>
            <Trash2 size={40} color="var(--danger-color)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Delete Counter?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Delete <strong>{deleteConfirm.counter_name}</strong>? Any assigned employee will be unlinked.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={{ padding: '10px 24px', background: 'var(--danger-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleDelete(deleteConfirm)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCounters;
