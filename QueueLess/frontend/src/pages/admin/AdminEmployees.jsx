import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Edit2, Trash2, CheckCircle, XCircle, X, Users } from 'lucide-react';

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

const AdminEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', new_password: '', mobile_number: '', assigned_office_id: '', assigned_counter_id: '', status: 'active' });
  const [errors, setErrors] = useState({});

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [eRes, oRes, cRes] = await Promise.all([
        api.get('/admin/employees'),
        api.get('/admin/offices'),
        api.get('/admin/counters'),
      ]);
      setEmployees(eRes.data);
      setOffices(oRes.data);
      setCounters(cRes.data);
    } catch { showToast('Failed to load data.', 'error'); }
    finally { setIsLoading(false); }
  };

  const filteredCounters = formData.assigned_office_id
    ? counters.filter(c => String(c.office_id) === String(formData.assigned_office_id))
    : counters;

  const validate = () => {
    const e = {};
    if (!formData.name?.trim()) e.name = 'Name is required.';
    if (!formData.email?.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email format.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        mobile_number: formData.mobile_number || null,
        new_password: formData.new_password || null,
        assigned_office_id: formData.assigned_office_id ? parseInt(formData.assigned_office_id) : null,
        assigned_counter_id: formData.assigned_counter_id ? parseInt(formData.assigned_counter_id) : null,
        status: formData.status,
      };
      await api.put(`/admin/employees/${editing.id}`, payload);
      showToast('Employee updated successfully.');
      setShowModal(false);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error updating employee.', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (emp) => {
    try {
      await api.delete(`/admin/employees/${emp.id}`);
      showToast('Employee deleted successfully.');
      setDeleteConfirm(null);
      loadAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Cannot delete employee.', 'error');
      setDeleteConfirm(null);
    }
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      new_password: '',
      mobile_number: emp.mobile_number || '',
      assigned_office_id: emp.assigned_office_id || '',
      assigned_counter_id: emp.assigned_counter_id || '',
      status: emp.status || 'active',
    });
    setErrors({});
    setShowModal(true);
  };

  const errStyle = { color: 'var(--danger-color)', fontSize: '0.82rem', marginTop: '4px' };

  return (
    <div style={{ padding: '30px' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Employee Management</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>View and manage all employee accounts and counter assignments.</p>
        </div>
        <div style={{ padding: '8px 16px', background: 'rgba(12,59,122,0.08)', borderRadius: '8px', fontWeight: 600, color: 'var(--primary-color)' }}>
          <Users size={16} style={{ marginRight: '6px' }} />{employees.length} Employees
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading employees...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Assigned Office', 'Assigned Counter', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 18px', fontWeight: 600, fontSize: '0.9rem', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--border-color)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 600 }}>{emp.name}</td>
                  <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{emp.email}</td>
                  <td style={{ padding: '14px 18px' }}>{emp.assigned_office_name || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                  <td style={{ padding: '14px 18px' }}>{emp.assigned_counter_name || <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unassigned</span>}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600,
                      background: emp.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: emp.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {emp.status?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center' }}
                        onClick={() => openEdit(emp)}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setDeleteConfirm(emp)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card animate-fade-in" style={{ width: '500px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Edit Employee</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setShowModal(false)} />
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  {errors.name && <div style={errStyle}>{errors.name}</div>}
                </div>
                <div>
                  <label className="label">Email Address *</label>
                  <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  {errors.email && <div style={errStyle}>{errors.email}</div>}
                </div>
                <div>
                  <label className="label">Mobile Number</label>
                  <input className="input-field" value={formData.mobile_number} onChange={e => setFormData({ ...formData, mobile_number: e.target.value })} placeholder="+91 9876543210" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="label">Assigned Office</label>
                    <select className="select-field" value={formData.assigned_office_id}
                      onChange={e => setFormData({ ...formData, assigned_office_id: e.target.value, assigned_counter_id: '' })}>
                      <option value="">— None —</option>
                      {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Assigned Counter</label>
                    <select className="select-field" value={formData.assigned_counter_id}
                      onChange={e => setFormData({ ...formData, assigned_counter_id: e.target.value })}
                      disabled={!formData.assigned_office_id}>
                      <option value="">— None —</option>
                      {filteredCounters.map(c => <option key={c.id} value={c.id}>{c.counter_name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Account Status</label>
                  <select className="select-field" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />
                <div>
                  <label className="label">New Password <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>(leave blank to keep current)</span></label>
                  <input type="password" className="input-field" value={formData.new_password} onChange={e => setFormData({ ...formData, new_password: e.target.value })} placeholder="Enter new password" />
                </div>
              </div>
              
              <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn-accent" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card animate-fade-in" style={{ width: '400px', padding: '28px', textAlign: 'center' }}>
            <Trash2 size={40} color="var(--danger-color)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Delete Employee?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Permanently delete <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email})? This cannot be undone.
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

export default AdminEmployees;
