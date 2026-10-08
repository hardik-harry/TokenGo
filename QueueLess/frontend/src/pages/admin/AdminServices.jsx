import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2 } from 'lucide-react';
import { formatWaitDuration } from '../../utils/timeUtils';

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [offices, setOffices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', code: '', description: '', baseline_service_minutes: 15, status: 'active', office_id: '' });

  useEffect(() => { 
    loadInitData();
  }, []);

  const loadInitData = async () => {
    setIsLoading(true);
    try {
      const [svcRes, offRes] = await Promise.all([
        api.get('/admin/services'),
        api.get('/admin/offices')
      ]);
      setServices(svcRes.data);
      setOffices(offRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/admin/services/${editing.id}`, formData);
      } else {
        await api.post('/admin/services', formData);
      }
      setShowModal(false);
      loadInitData();
    } catch (err) {
      console.error(err);
      alert('Error saving service');
    }
  };

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Services Management</h2>
        <button className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setEditing(null); setFormData({ name: '', code: '', description: '', baseline_service_minutes: 15, status: 'active', office_id: offices.length > 0 ? offices[0].id : ''}); setShowModal(true); }}>
          <Plus size={18} /> Add Service
        </button>
      </div>

      {isLoading ? <div>Loading services...</div> : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Service Time</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(svc => (
                <tr key={svc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px 20px' }}>{svc.id}</td>
                  <td style={{ padding: '15px 20px', fontWeight: 'bold' }}>{svc.code}</td>
                  <td style={{ padding: '15px 20px' }}>{svc.name}</td>
                  <td style={{ padding: '15px 20px' }}>{formatWaitDuration(svc.baseline_service_minutes)}</td>
                  <td style={{ padding: '15px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', background: svc.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: svc.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {svc.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.9rem', display: 'flex', gap: '5px' }}
                      onClick={() => { setEditing(svc); setFormData({name: svc.name, code: svc.code, description: svc.description || '', baseline_service_minutes: svc.baseline_service_minutes, status: svc.status, office_id: ''}); setShowModal(true); }}>
                      <Edit2 size={16} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No services found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '450px', padding: '30px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>{editing ? 'Edit Service' : 'Add Service'}</h3>
            <form onSubmit={handleCreateOrUpdate}>
              {!editing && (
                <div style={{ marginBottom: '15px' }}>
                  <label className="label">Office Assignment</label>
                  <select required className="select-field" value={formData.office_id} onChange={e => setFormData({...formData, office_id: e.target.value})}>
                    <option value="">-- Select Office --</option>
                    {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: '15px' }}>
                <label className="label">Service Name</label>
                <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="label">Service Code</label>
                <input required className="input-field" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="label">Average Service Time (mins)</label>
                <input type="number" required className="input-field" value={formData.baseline_service_minutes} onChange={e => setFormData({...formData, baseline_service_minutes: e.target.value})} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="label">Status</label>
                <select className="select-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-accent">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminServices;
