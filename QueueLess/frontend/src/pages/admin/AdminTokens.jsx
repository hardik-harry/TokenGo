import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const AdminTokens = () => {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadTokens(); }, []);

  const loadTokens = () => {
    setIsLoading(true);
    api.get('/admin/tokens')
      .then(res => setTokens(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };
  
  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if(s === 'completed') return 'var(--success-color)';
    if(s === 'waiting' || s === 'pending') return 'var(--warning-color)';
    if(s === 'cancelled' || s === 'no_show') return 'var(--danger-color)';
    return 'var(--primary-color)';
  }

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Token Registry</h2>
        <p style={{ color: 'var(--text-secondary)' }}>View recent tokens globally.</p>
      </div>

      {isLoading ? <div>Loading tokens...</div> : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Token Number</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Office</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Service</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Time</th>
                <th style={{ padding: '15px 20px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map(tk => (
                <tr key={tk.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px 20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{tk.token_number}</td>
                  <td style={{ padding: '15px 20px' }}>{tk.office_name}</td>
                  <td style={{ padding: '15px 20px' }}>{tk.service_name}</td>
                  <td style={{ padding: '15px 20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(tk.created_at).toLocaleString()}</td>
                  <td style={{ padding: '15px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', background: getStatusColor(tk.status)+'20', color: getStatusColor(tk.status) }}>
                      {tk.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {tokens.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No tokens generated.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminTokens;
