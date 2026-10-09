import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Activity } from 'lucide-react';
import { formatWaitDuration } from '../../utils/timeUtils';

const AdminQueue = () => {
  const [analytics, setAnalytics] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected'

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, tokenRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/tokens')
      ]);
      setAnalytics(analyticsRes.data);
      setTokens(tokenRes.data.filter(t => t.status.toLowerCase() === 'waiting' || t.status.toLowerCase() === 'called'));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Polling Fallback
    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    let ws = null;
    if (token) {
      const wsUrl = `ws://localhost:8000/api/v1/ws/queue/0/0?auth_token=${token}`;
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsStatus('connected');
      ws.onmessage = () => {
        // Any message on admin channel means data changed
        fetchData();
      };
      ws.onclose = () => setWsStatus('disconnected');
    }
    return () => {
      if (ws) ws.close();
    };
  }, [fetchData]);

  // Group tokens by Office + Service
  const groupedTokens = tokens.reduce((acc, tk) => {
    const key = `${tk.office_name}::${tk.service_name}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tk);
    return acc;
  }, {});

  return (
    <div style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Live Queue Monitor</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Real-time overview of active waiting queues.</p>
        </div>
        <div style={{ fontSize: '0.9rem', color: wsStatus === 'connected' ? 'var(--success-color)' : 'var(--danger-color)' }}>
          {wsStatus === 'connected' ? 'Live updates connected' : 'Live updates disconnected'}
        </div>
      </div>

      {isLoading ? <div>Loading monitor...</div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="card">
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Overall Waiting</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning-color)' }}>
                {analytics?.kpis?.waiting_tokens ?? 0}
              </div>
            </div>
             <div className="card">
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Median Wait Time</span>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {analytics?.kpis?.median_wait_minutes ? formatWaitDuration(analytics.kpis.median_wait_minutes) : '0 min'}
              </div>
            </div>
            <div className="card">
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Counter Utilization</span>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                {analytics?.kpis?.counter_utilization ?? 0}%
              </div>
            </div>
          </div>
          
          <h3 style={{ marginBottom: '15px' }}>Waiting Tokens Feed</h3>
          
          {Object.keys(groupedTokens).length === 0 ? (
            <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No tokens are currently waiting.
            </div>
          ) : (
            Object.entries(groupedTokens).map(([key, groupTokens]) => {
              const [office, service] = key.split('::');
              return (
                <div key={key} className="card" style={{ marginBottom: '20px', padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '15px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>{office}</h4>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{service}</span>
                    </div>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '5px 10px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                      Waiting: {groupTokens.length}
                    </div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Token</th>
                        <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Position</th>
                        <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Wait Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupTokens.map(tk => {
                        const waitMinutes = Math.floor((new Date() - new Date(tk.created_at)) / 60000);
                        return (
                          <tr key={tk.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px 20px', fontWeight: 'bold' }}>{tk.token_number}</td>
                            <td style={{ padding: '12px 20px' }}>#{tk.position || '-'}</td>
                            <td style={{ padding: '12px 20px' }}>
                              <span style={{ color: waitMinutes > 30 ? 'var(--danger-color)' : 'inherit', fontWeight: 500 }}>
                                {formatWaitDuration(waitMinutes)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
};
export default AdminQueue;
