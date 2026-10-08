import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2 } from 'lucide-react';

const AdminOffices = () => {
  const [offices, setOffices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', city: '', address: '', status: 'active' });

  useEffect(() => { loadOffices(); }, []);

  const loadOffices = () => {
    setIsLoading(true);
    api.get('/admin/offices')
      .then(res => setOffices(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/admin/offices/${editing.id}`, formData);
      } else {
        await api.post('/admin/offices', formData);
      }
      setShowModal(false);
      loadOffices();
    } catch (err) {
      console.error(err);
      alert('Error saving office');
    }
  };

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Offices Management</h2>
        <button className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setEditing(null); setFormData({ name: '', city: '', address: '', status: 'active'}); setShowModal(true); }}>
          <Plus size={18} /> Add Office
        </button>
      </div>

      {isLoading ? <div>Loading offices...</div> : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>City</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offices.map(off => (
                <tr key={off.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px 20px' }}>{off.id}</td>
                  <td style={{ padding: '15px 20px' }}>{off.name}</td>
                  <td style={{ padding: '15px 20px' }}>{off.city}</td>
                  <td style={{ padding: '15px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', background: off.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: off.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {off.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.9rem', display: 'flex', gap: '5px' }}
                      onClick={() => { setEditing(off); setFormData({name: off.name, city: off.city, address: off.address || '', status: off.status}); setShowModal(true); }}>
                      <Edit2 size={16} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {offices.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No offices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', padding: '30px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>{editing ? 'Edit Office' : 'Add Office'}</h3>
            <form onSubmit={handleCreateOrUpdate}>
              <div style={{ marginBottom: '15px' }}>
                <label className="label">Office Name</label>
                <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="label">City</label>
                <input required className="input-field" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="label">Address</label>
                <input className="input-field" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
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

export default AdminOffices;
