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

const AdminOffices = () => {
  const [offices, setOffices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({ name: '', city: '', address: '', status: 'active' });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { loadOffices(); }, []);

  const loadOffices = () => {
    setIsLoading(true);
    api.get('/admin/offices')
      .then(res => setOffices(res.data))
      .catch(() => showToast('Failed to load offices.', 'error'))
      .finally(() => setIsLoading(false));
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Office name is required.';
    if (!formData.city.trim()) e.city = 'City is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/offices/${editing.id}`, formData);
        showToast('Office updated successfully.');
      } else {
        await api.post('/admin/offices', formData);
        showToast('Office created successfully.');
      }
      setShowModal(false);
      loadOffices();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error saving office.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (office) => {
    try {
      await api.delete(`/admin/offices/${office.id}`);
      showToast('Office deleted successfully.');
      setDeleteConfirm(null);
      loadOffices();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Cannot delete office.', 'error');
      setDeleteConfirm(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', city: '', address: '', status: 'active' });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (off) => {
    setEditing(off);
    setFormData({ name: off.name, city: off.city, address: off.address || '', status: off.status });
    setErrors({});
    setShowModal(true);
  };

  const inp = { className: 'input-field', style: { width: '100%' } };
  const errStyle = { color: 'var(--danger-color)', fontSize: '0.82rem', marginTop: '4px' };

  return (
    <div style={{ padding: '30px' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Offices Management</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Create, edit, and delete RTO offices.</p>
        </div>
        <button className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={openCreate}>
          <Plus size={18} /> Add Office
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading offices...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                {['ID', 'Name', 'City', 'Address', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.9rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {offices.map(off => (
                <tr key={off.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{off.id}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{off.name}</td>
                  <td style={{ padding: '14px 18px' }}>{off.city}</td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{off.address || '—'}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem',
                      background: off.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: off.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 600 }}>
                      {off.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center' }}
                        onClick={() => openEdit(off)}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center',
                        background: 'rgba(239,68,68,0.1)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)',
                        borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setDeleteConfirm(off)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {offices.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No offices found. Click "Add Office" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '460px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{editing ? 'Edit Office' : 'Add New Office'}</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Office Name *</label>
                <input {...inp} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Ahmedabad RTO" />
                {errors.name && <div style={errStyle}>{errors.name}</div>}
              </div>
              <div>
                <label className="label">City *</label>
                <input {...inp} value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="e.g. Ahmedabad" />
                {errors.city && <div style={errStyle}>{errors.city}</div>}
              </div>
              <div>
                <label className="label">Address</label>
                <input {...inp} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Full address (optional)" />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="select-field" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn-accent" disabled={saving}>
                  {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Office')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '400px', padding: '28px', textAlign: 'center' }}>
            <Trash2 size={40} color="var(--danger-color)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Delete Office?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
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

export default AdminOffices;
