import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Activity } from 'lucide-react';
import { formatWaitDuration } from '../../utils/timeUtils';

const AdminQueue = () => {
  const [analytics, setAnalytics] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics'),
      api.get('/admin/tokens')
    ]).then(([analyticsRes, tokenRes]) => {
      setAnalytics(analyticsRes.data);
      setTokens(tokenRes.data.filter(t => t.status.toLowerCase() === 'waiting' || t.status.toLowerCase() === 'pending'));
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Live Queue Monitor</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Real-time overview of active waiting queues.</p>
      </div>

      {isLoading ? <div>Loading monitor...</div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="card">
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Overall Waiting</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning-color)' }}>{analytics?.kpis.waiting_tokens}</div>
            </div>
             <div className="card">
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Median Wait Time</span>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{analytics ? formatWaitDuration(analytics.kpis.median_wait_minutes) : '-'}</div>
            </div>
            <div className="card">
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Counter Utilization</span>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{analytics?.kpis.counter_utilization}%</div>
            </div>
          </div>
          
          <h3 style={{ marginBottom: '15px' }}>Waiting Tokens Feed</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <tr>
                  <th style={{ padding: '15px 20px', fontWeight: 600 }}>Token</th>
                  <th style={{ padding: '15px 20px', fontWeight: 600 }}>Office</th>
                  <th style={{ padding: '15px 20px', fontWeight: 600 }}>Service</th>
                  <th style={{ padding: '15px 20px', fontWeight: 600 }}>Wait Duration</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map(tk => {
                  const waitMinutes = (new Date() - new Date(tk.created_at)) / 60000;
                  return (
                  <tr key={tk.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '15px 20px', fontWeight: 'bold' }}>{tk.token_number}</td>
                    <td style={{ padding: '15px 20px' }}>{tk.office_name}</td>
                    <td style={{ padding: '15px 20px' }}>{tk.service_name}</td>
                    <td style={{ padding: '15px 20px' }}>
                      <span style={{ color: waitMinutes > 30 ? 'var(--danger-color)' : 'inherit' }}>
                        {formatWaitDuration(waitMinutes)}
                      </span>
                    </td>
                  </tr>
                )})}
                {tokens.length === 0 && (
                  <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>No tokens are currently waiting.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
export default AdminQueue;
