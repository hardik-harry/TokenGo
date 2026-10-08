import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2 } from 'lucide-react';

const AdminCounters = () => {
  const [counters, setCounters] = useState([]);
  const [offices, setOffices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const [formData, setFormData] = useState({ office_id: '', counter_name: '', status: 'active' });

  useEffect(() => { loadInitData(); }, []);

  const loadInitData = async () => {
    setIsLoading(true);
    try {
      const [ctrRes, offRes] = await Promise.all([
        api.get('/admin/counters'),
        api.get('/admin/offices')
      ]);
      setCounters(ctrRes.data);
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
        await api.put(`/admin/counters/${editing.id}`, formData);
      } else {
        await api.post('/admin/counters', formData);
      }
      setShowModal(false);
      loadInitData();
    } catch (err) {
      console.error(err);
      alert('Error saving counter');
    }
  };

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Counter Management</h2>
        <button className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => { setEditing(null); setFormData({ office_id: offices.length>0?offices[0].id:'', counter_name: '', status: 'active'}); setShowModal(true); }}>
          <Plus size={18} /> Add Counter
        </button>
      </div>

      {isLoading ? <div>Loading counters...</div> : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>ID</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Counter Name</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Office</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {counters.map(ctr => (
                <tr key={ctr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px 20px' }}>{ctr.id}</td>
                  <td style={{ padding: '15px 20px', fontWeight: 'bold' }}>{ctr.counter_name}</td>
                  <td style={{ padding: '15px 20px' }}>{ctr.office_name}</td>
                  <td style={{ padding: '15px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', background: ctr.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: ctr.status === 'active' ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      {ctr.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px' }}>
                    <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.9rem', display: 'flex', gap: '5px' }}
                      onClick={() => { setEditing(ctr); setFormData({office_id: ctr.office_id, counter_name: ctr.counter_name, status: ctr.status}); setShowModal(true); }}>
                      <Edit2 size={16} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {counters.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No counters found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '400px', padding: '30px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 700 }}>{editing ? 'Edit Counter' : 'Add Counter'}</h3>
            <form onSubmit={handleCreateOrUpdate}>
              <div style={{ marginBottom: '15px' }}>
                <label className="label">Office</label>
                <select required className="select-field" value={formData.office_id} onChange={e => setFormData({...formData, office_id: e.target.value})}>
                  <option value="">-- Select Office --</option>
                  {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label className="label">Counter Name</label>
                <input required className="input-field" value={formData.counter_name} onChange={e => setFormData({...formData, counter_name: e.target.value})} placeholder="e.g. Counter 1" />
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
export default AdminCounters;
