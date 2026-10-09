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

const statusBadge = (status) => (
  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
    background: status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
    color: status === 'active' ? 'var(--success-color)' : 'var(--danger-color)' }}>
    {status?.toUpperCase()}
  </span>
);

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [offices, setOffices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', baseline_service_minutes: 15, status: 'active', office_id: '' });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [sRes, oRes] = await Promise.all([api.get('/admin/services'), api.get('/admin/offices')]);
      setServices(sRes.data);
      setOffices(oRes.data);
    } catch { showToast('Failed to load data.', 'error'); }
    finally { setIsLoading(false); }
  };

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Service name is required.';
    if (!formData.code.trim()) e.code = 'Service code is required.';
    if (!editing && !formData.office_id) e.office_id = 'Please select an office.';
    if (!formData.baseline_service_minutes || formData.baseline_service_minutes < 1) e.mins = 'Must be at least 1 minute.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...formData, baseline_service_minutes: parseInt(formData.baseline_service_minutes), office_id: parseInt(formData.office_id) || 1 };
      if (editing) {
        await api.put(`/admin/services/${editing.id}`, payload);
        showToast('Service updated successfully.');
      } else {
        await api.post('/admin/services', payload);
        showToast('Service created successfully.');
      }
      setShowModal(false);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error saving service.', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (svc) => {
    try {
      await api.delete(`/admin/services/${svc.id}`);
      showToast('Service deleted successfully.');
      setDeleteConfirm(null);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Cannot delete service.', 'error');
      setDeleteConfirm(null);
    }
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setFormData({ name: svc.name, code: svc.code, description: svc.description || '', baseline_service_minutes: svc.baseline_service_minutes, status: svc.status, office_id: '' });
    setErrors({});
    setShowModal(true);
  };

  const errStyle = { color: 'var(--danger-color)', fontSize: '0.82rem', marginTop: '4px' };

  return (
    <div style={{ padding: '30px' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Services Management</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Create, edit, and delete queue services.</p>
        </div>
        <button className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setEditing(null); setFormData({ name: '', code: '', description: '', baseline_service_minutes: 15, status: 'active', office_id: offices[0]?.id || '' }); setErrors({}); setShowModal(true); }}>
          <Plus size={18} /> Add Service
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading services...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                {['ID', 'Code', 'Name', 'Avg Service Time', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.9rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map(svc => (
                <tr key={svc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{svc.id}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--primary-color)' }}>{svc.code.toUpperCase()}</td>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{svc.name}</td>
                  <td style={{ padding: '14px 18px' }}>{svc.baseline_service_minutes} min</td>
                  <td style={{ padding: '14px 18px' }}>{statusBadge(svc.status)}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center' }}
                        onClick={() => openEdit(svc)}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setDeleteConfirm(svc)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No services found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '480px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{editing ? 'Edit Service' : 'Add New Service'}</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!editing && (
                <div>
                  <label className="label">Office Assignment *</label>
                  <select className="select-field" value={formData.office_id} onChange={e => setFormData({ ...formData, office_id: e.target.value })}>
                    <option value="">-- Select Office --</option>
                    {offices.map(o => <option key={o.id} value={o.id}>{o.name} ({o.city})</option>)}
                  </select>
                  {errors.office_id && <div style={errStyle}>{errors.office_id}</div>}
                </div>
              )}
              <div>
                <label className="label">Service Name *</label>
                <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Learner's Licence" />
                {errors.name && <div style={errStyle}>{errors.name}</div>}
              </div>
              <div>
                <label className="label">Service Code *</label>
                <input className="input-field" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toLowerCase() })} placeholder="e.g. ll" />
                {errors.code && <div style={errStyle}>{errors.code}</div>}
              </div>
              <div>
                <label className="label">Average Service Time (minutes) *</label>
                <input type="number" min="1" className="input-field" value={formData.baseline_service_minutes}
                  onChange={e => setFormData({ ...formData, baseline_service_minutes: e.target.value })} />
                {errors.mins && <div style={errStyle}>{errors.mins}</div>}
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input-field" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" />
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
                  {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Service')}
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Delete Service?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.
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

export default AdminServices;
