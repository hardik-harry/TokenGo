import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle, SkipForward, Play,
  XCircle, UserPlus, LogOut, Monitor
} from 'lucide-react';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();

  // ── Assignment state ──────────────────────────────────────────
  const [assignedInfo, setAssignedInfo]     = useState(null);
  const [needsAssignment, setNeedsAssignment] = useState(false);
  const [offices, setOffices]               = useState([]);
  const [counters, setCounters]             = useState([]);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedCounter, setSelectedCounter] = useState('');
  const [assignLoading, setAssignLoading]   = useState(false);

  // ── Stats (always from DB) ─────────────────────────────────────
  const [metrics, setMetrics] = useState({ completed: 0, no_show: 0, skipped: 0 });

  // ── Active / serving token ─────────────────────────────────────
  const [servingToken, setServingToken] = useState(null); // null = no active token
  const [actionLoading, setActionLoading] = useState(false);

  // ── Elapsed timer ──────────────────────────────────────────────
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timerRef = useRef(null);

  const startTimer = (startIso) => {
    clearInterval(timerRef.current);
    const startMs = new Date(startIso).getTime();
    timerRef.current = setInterval(() => {
      setElapsedSecs(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    setElapsedSecs(0);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const fmtElapsed = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

  // ── assignedInfoRef so syncDashboard always has latest ─────────
  const assignedInfoRef = useRef(null);
  useEffect(() => { assignedInfoRef.current = assignedInfo; }, [assignedInfo]);

  // ── Sync dashboard from backend ────────────────────────────────
  const syncDashboard = useCallback(async () => {
    const ai = assignedInfoRef.current;
    if (!ai) return;
    try {
      const res = await api.get('/employee/dashboard', {
        params: {
          office_id:  ai.assigned_office_id,
          counter_id: ai.assigned_counter_id,
        },
      });
      const data = res.data;

      // Stats come directly as integer counts from DB — employee-specific, today-only
      setMetrics({
        completed: data.completed_count ?? 0,
        no_show:   data.no_show_count   ?? 0,
        skipped:   data.skipped_count   ?? 0,
      });

      // Sync active token from server (source of truth)
      if (data.current_token) {
        setServingToken(prev => {
          // If it's the same token already running, don't restart timer
          if (prev && prev.id === data.current_token.id) return prev;
          if (data.current_token.start_time) startTimer(data.current_token.start_time);
          return data.current_token;
        });
      } else {
        // No active token on server → clear local state
        setServingToken(prev => { if (prev) stopTimer(); return null; });
      }
    } catch (e) {
      console.error('Dashboard sync error:', e);
    }
  }, []);

  // ── On mount: load assignment ──────────────────────────────────
  useEffect(() => {
    api.get('/employee/assigned-info')
      .then(res => {
        if (res.data) {
          setAssignedInfo(res.data);
        } else {
          setNeedsAssignment(true);
          api.get('/offices').then(r => setOffices(r.data));
        }
      })
      .catch(e => console.error('Assignment check failed:', e));
  }, []);

  // ── Polling: every 8 seconds once assigned ─────────────────────
  useEffect(() => {
    if (!assignedInfo) return;
    syncDashboard();
    const inv = setInterval(syncDashboard, 8000);
    return () => clearInterval(inv);
  }, [assignedInfo, syncDashboard]);

  // ── Load counters when office selected ────────────────────────
  useEffect(() => {
    if (needsAssignment && selectedOffice) {
      api.get(`/offices/${selectedOffice}/counters`).then(r => setCounters(r.data));
    } else {
      setCounters([]);
    }
  }, [selectedOffice, needsAssignment]);

  const confirmAssignment = async () => {
    if (!selectedOffice || !selectedCounter) return;
    setAssignLoading(true);
    try {
      await api.post('/employee/assign', {
        office_id:  parseInt(selectedOffice),
        counter_id: parseInt(selectedCounter),
      });
      const res = await api.get('/employee/assigned-info');
      setAssignedInfo(res.data);
      setNeedsAssignment(false);
    } catch {
      alert('Failed to confirm assignment. Contact administrator.');
    } finally {
      setAssignLoading(false);
    }
  };

  // ── CALL NEXT TOKEN ────────────────────────────────────────────
  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      // 1. Pull next token from queue → status = CALLED
      const callRes = await api.post('/employee/call-next', {
        office_id:  assignedInfo.assigned_office_id,
        service_id: assignedInfo.assigned_service_id,
      });
      const token = callRes.data;

      // 2. Immediately mark as SERVING (In Progress)
      await api.post(`/employee/tokens/${token.id}/start`, {
        status:     'SERVING',
        counter_id: assignedInfo.assigned_counter_id,
      });

      const startTime = new Date().toISOString();
      setServingToken({
        id:          token.id,
        number:      token.token_number || token.number,
        status:      'SERVING',
        client_name: token.client_name || null,
        start_time:  startTime,
      });
      startTimer(startTime);

      // Refresh stats (does NOT count In Progress as Completed)
      await syncDashboard();
    } catch (err) {
      alert(err.response?.data?.detail || 'No tokens are currently waiting.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── COMPLETE / SKIP / NO-SHOW ──────────────────────────────────
  const handleAction = async (status) => {
    if (!servingToken) return;
    setActionLoading(true);
    const endpointMap = {
      COMPLETED: 'complete',
      SKIPPED:   'skip',
      NO_SHOW:   'no-show',
    };
    try {
      await api.post(`/employee/tokens/${servingToken.id}/${endpointMap[status]}`, {
        status,
        counter_id: assignedInfo.assigned_counter_id,
      });
      // Clear active token immediately — don't wait for poll
      stopTimer();
      setServingToken(null);
      // Refresh stats from DB so counts update right away
      await syncDashboard();
    } catch (e) {
      console.error('Action error:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // ── NEEDS ASSIGNMENT screen ────────────────────────────────────
  if (needsAssignment) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
        <div style={{ background: 'var(--primary-color)', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Monitor size={20} /> LIVE COUNTER</h2>
          <button className="btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={logout}>
            <LogOut size={16} /> SIGN OUT
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '480px', padding: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--primary-color)' }}>Select Workstation</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '28px' }}>Your administrator has assigned you a locked counter. Please confirm your workstation below.</p>

            <div style={{ marginBottom: '18px' }}>
              <label className="label">RTO Office</label>
              <select className="select-field" value={selectedOffice} onChange={e => { setSelectedOffice(e.target.value); setSelectedCounter(''); }}>
                <option value="">-- Select Office --</option>
                {offices.map(o => <option key={o.id} value={o.id}>{o.name} ({o.city})</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label className="label">Counter Terminal</label>
              <select className="select-field" value={selectedCounter} onChange={e => setSelectedCounter(e.target.value)} disabled={!selectedOffice}>
                <option value="">-- Select Counter --</option>
                {counters.map(c => <option key={c.id} value={c.id}>{c.counter_name}</option>)}
              </select>
            </div>

            <button className="btn-primary" style={{ width: '100%' }} onClick={confirmAssignment} disabled={!selectedCounter || assignLoading}>
              {assignLoading ? 'Securing...' : 'Confirm Counter & Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!assignedInfo) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Validating credentials...</div>;
  }

  // ── MAIN DASHBOARD ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: '60px' }}>

      {/* ── Header ── */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Monitor size={20} /> LIVE COUNTER
          </h2>
          <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            {assignedInfo.counter_name} &nbsp;·&nbsp; {assignedInfo.office_name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            Officer: <strong>{user?.name}</strong>
          </span>
          <button
            className="btn-outline"
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={logout}
          >
            <LogOut size={16} /> SIGN OUT
          </button>
        </div>
      </div>

      <div className="container" style={{ marginTop: '30px', maxWidth: '900px' }}>

        {/* ── 3 Live Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
          <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--success-color)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>
              <CheckCircle size={18} /> COMPLETED TODAY
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--success-color)', lineHeight: 1 }}>{metrics.completed}</div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--danger-color)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>
              <XCircle size={18} /> NO-SHOWS
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--danger-color)', lineHeight: 1 }}>{metrics.no_show}</div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', color: 'var(--warning-color)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '10px' }}>
              <SkipForward size={18} /> SKIPPED
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--warning-color)', lineHeight: 1 }}>{metrics.skipped}</div>
          </div>
        </div>

        {/* ── Live Counter Console ── */}
        <div className="card" style={{ borderTop: '4px solid var(--primary-color)', minHeight: '340px', display: 'flex', flexDirection: 'column', padding: '32px' }}>

          {!servingToken ? (
            /* ── NO ACTIVE TOKEN ── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(12,59,122,0.07)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <UserPlus size={44} color="var(--primary-color)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>No Active Token</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Click below to pull the next client from the queue.</p>
              </div>
              <button
                className="btn-primary"
                style={{ padding: '16px 48px', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '12px' }}
                onClick={handleCallNext}
                disabled={actionLoading}
              >
                <Play size={24} />
                {actionLoading ? 'Loading...' : 'CALL NEXT TOKEN'}
              </button>
            </div>

          ) : (
            /* ── ACTIVE TOKEN / IN PROGRESS ── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Token info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>IN PROGRESS</div>
                  <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary-color)', lineHeight: 1.1 }}>{servingToken.number}</div>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    <span><strong>Client:</strong> {servingToken.client_name || 'Walk-in / Guest'}</span>
                    <span>
                      <strong>Elapsed:</strong>{' '}
                      <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>{fmtElapsed(elapsedSecs)}</span>
                    </span>
                  </div>
                </div>
                <span style={{
                  background: 'rgba(59,130,246,0.12)', color: '#2563eb',
                  padding: '6px 18px', borderRadius: '20px',
                  fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em'
                }}>
                  SERVING
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '14px', marginTop: 'auto' }}>
                <button
                  className="btn-primary"
                  style={{ flex: 2, padding: '16px', fontSize: '1.05rem', background: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  onClick={() => handleAction('COMPLETED')}
                  disabled={actionLoading}
                >
                  <CheckCircle size={20} /> COMPLETE
                </button>

                <button
                  style={{ flex: 1, padding: '16px', fontSize: '1rem', background: 'rgba(245,158,11,0.1)', color: 'var(--warning-color)', border: '1.5px solid var(--warning-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, fontWeight: 600 }}
                  onClick={() => handleAction('SKIPPED')}
                  disabled={actionLoading}
                >
                  <SkipForward size={18} /> SKIP
                </button>

                <button
                  style={{ flex: 1, padding: '16px', fontSize: '1rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-color)', border: '1.5px solid var(--danger-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, fontWeight: 600 }}
                  onClick={() => handleAction('NO_SHOW')}
                  disabled={actionLoading}
                >
                  <XCircle size={18} /> NO-SHOW
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
