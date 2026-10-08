import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Activity, CheckCircle, SkipForward,
  Play, Pause, RefreshCw, XCircle, UserPlus, HeartPulse 
} from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Employee Context Stats
  const [assignedInfo, setAssignedInfo] = useState(null);
  const [needsAssignment, setNeedsAssignment] = useState(false);
  const [offices, setOffices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedCounter, setSelectedCounter] = useState('');
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  
  const [queueHealth, setQueueHealth] = useState("Excellent");
  const [activeCounterStatus, setActiveCounterStatus] = useState("loading");

  // Core Metrics
  const [metrics, setMetrics] = useState({
    waiting: 0,
    completed: 0,
    skipped: 0,
    active_counters: 1,
    active_counters: 1,
    avg_duration: 15
  });
  const [waitingTokens, setWaitingTokens] = useState([]);

  // Current Handling State
  const [servingToken, setServingToken] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Poll for UI updates (usually this is tied to the WebSocket, but we can poll for dashboard sync uniquely)
  const syncDashboard = async () => {
    try {
      if (!assignedInfo) return;
      
      const oId = assignedInfo.assigned_office_id;
      const sId = assignedInfo.assigned_service_id;
      
      // Query Real Live Analytics Endpoint securely
      const res = await api.get('/employee/dashboard', {
        params: {
          office_id: oId,
          service_id: sId,
          counter_id: assignedInfo.assigned_counter_id
        }
      });
      
      const data = res.data;
      
      setMetrics({
        waiting: data.waiting_tokens.length,
        completed: data.completed_tokens.length,
        skipped: data.skipped_tokens.length,
        no_show: data.no_show_tokens.length,
        active_counters: activeCounterStatus === "active" ? 1 : 0, 
        avg_duration: 15
      });
      setWaitingTokens(data.waiting_tokens || []);
      
      if (data.current_token) {
         setServingToken(data.current_token);
      }
      
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // 1. Fetch authorized assignment natively
    api.get('/employee/assigned-info').then(res => {
      if (res.data) {
        setAssignedInfo(res.data);
        setActiveCounterStatus("active");
      } else {
        setNeedsAssignment(true);
        api.get('/offices').then(oRes => setOffices(oRes.data));
      }
    }).catch(e => {
      console.error("Assignment Error:", e);
    });
  }, []);

  useEffect(() => {
    if (needsAssignment && selectedOffice) {
        api.get(`/offices/${selectedOffice}/counters`).then(res => setCounters(res.data));
    } else {
        setCounters([]);
    }
  }, [selectedOffice, needsAssignment]);

  const confirmAssignment = async () => {
     if (!selectedOffice || !selectedCounter) return;
     setAssignmentLoading(true);
     try {
       await api.post('/employee/assign', {
          office_id: parseInt(selectedOffice),
          counter_id: parseInt(selectedCounter)
       });
       // Re-fetch info
       const res = await api.get('/employee/assigned-info');
       setAssignedInfo(res.data);
       setActiveCounterStatus("active");
       setNeedsAssignment(false);
     } catch (e) {
       alert("Failed to confirm assignment.");
     } finally {
       setAssignmentLoading(false);
     }
  };

  useEffect(() => {
    // Sync loop
    if (assignedInfo) syncDashboard();
    const inv = setInterval(syncDashboard, 15000);
    return () => clearInterval(inv);
  }, [assignedInfo, activeCounterStatus]);
  
  // Handlers
  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const res = await api.post('/employee/call-next', {
        office_id: assignedInfo.assigned_office_id,
        service_id: assignedInfo.assigned_service_id
      });
      setServingToken(res.data);
      setQueueHealth("Stable");
      syncDashboard();
    } catch (err) {
      alert(err.response?.data?.detail || "No tokens waiting.");
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = async (status) => {
    if (!servingToken) return;
    setActionLoading(true);
    try {
      let endpoint = '';
      if (status === 'SERVING') endpoint = 'start';
      else if (status === 'COMPLETED') endpoint = 'complete';
      else if (status === 'SKIPPED') endpoint = 'skip';
      else if (status === 'NO_SHOW') endpoint = 'no-show';

      await api.post(`/employee/tokens/${servingToken.id}/${endpoint}`, {
        status: status,
        counter_id: assignedInfo.assigned_counter_id
      });
      if (status === 'COMPLETED' || status === 'SKIPPED' || status === 'NO_SHOW') {
         setServingToken(null);
      } else {
         setServingToken({...servingToken, status});
      }
      syncDashboard();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCounter = async () => {
    try {
      const target = activeCounterStatus === "active" ? "paused" : "active";
      await api.post(`/employee/counters/${assignedInfo.assigned_counter_id}/status?status=${target}`);
      setActiveCounterStatus(target);
    } catch (e) {
      console.error(e);
    }
  };

  if (needsAssignment) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
         <div style={{ background: 'var(--primary-color)', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>TokenGo Employee Console</h2>
            <span>Officer: <strong>{user?.name}</strong></span>
         </div>
         <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '40px' }}>
               <h2 style={{ fontSize: '1.5rem', marginBottom: '10px', color: 'var(--primary-color)' }}>Select Workstation</h2>
               <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Please assign yourself to a specific physical counter to begin processing the queue organically.</p>
               
               <div style={{ marginBottom: '20px' }}>
                  <label className="label">1. RTO Office</label>
                  <select className="select-field" value={selectedOffice} onChange={e => { setSelectedOffice(e.target.value); setSelectedCounter(''); }}>
                     <option value="">-- Select Office --</option>
                     {offices.map(o => <option key={o.id} value={o.id}>{o.name} ({o.city})</option>)}
                  </select>
               </div>
               
               <div style={{ marginBottom: '30px' }}>
                  <label className="label">2. Counter Terminal</label>
                  <select className="select-field" value={selectedCounter} onChange={e => setSelectedCounter(e.target.value)} disabled={!selectedOffice}>
                     <option value="">-- Select Counter --</option>
                     {counters.map(c => <option key={c.id} value={c.id}>{c.counter_name}</option>)}
                  </select>
               </div>
               
               <button className="btn-primary" style={{ width: '100%' }} onClick={confirmAssignment} disabled={!selectedCounter || assignmentLoading}>
                  {assignmentLoading ? "Securing Assignment..." : "Confirm Counter & Login"}
               </button>
            </div>
         </div>
      </div>
    );
  }

  if (!assignedInfo) return <div style={{ padding: '60px', textAlign: 'center' }}>Validating Employee Credentials...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: '40px' }}>
      
      {/* Top Bar */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>TokenGo Employee Console</h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span>Officer: <strong>{user?.name}</strong></span>
          <button className="btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', padding: '6px 12px' }} onClick={() => navigate('/')}>Exit Console</button>
        </div>
      </div>

      <div className="container" style={{ marginTop: '30px' }}>
        
        {/* Quick Assignment Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>{assignedInfo.counter_name} Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Operating collaboratively at {assignedInfo.office_name}</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ padding: '10px 16px', background: activeCounterStatus === 'active' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: activeCounterStatus === 'active' ? 'var(--success-color)' : 'var(--warning-color)', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} /> Counter is {activeCounterStatus.toUpperCase()}
            </div>
            <button 
               className={activeCounterStatus === 'active' ? 'btn-outline' : 'btn-primary'} 
               onClick={toggleCounter}
            >
              {activeCounterStatus === 'active' ? <><Pause size={18} /> PAUSE COUNTER</> : <><Play size={18} /> RESUME COUNTER</>}
            </button>
          </div>
        </div>

        {/* Global Analytics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
           <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}><Users size={16} /> WAIT POOL</span>
             <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-color)' }}>{metrics.waiting}</span>
           </div>
           <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <span style={{ color: 'var(--success-color)', fontSize: '0.9rem', fontWeight: 600 }}><CheckCircle size={16} /> COMPLETED TODAY</span>
             <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.completed}</span>
           </div>
           <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <span style={{ color: 'var(--danger-color)', fontSize: '0.9rem', fontWeight: 600 }}><XCircle size={16} /> NO-SHOWS</span>
             <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.no_show}</span>
           </div>
           <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <span style={{ color: 'var(--warning-color)', fontSize: '0.9rem', fontWeight: 600 }}><SkipForward size={16} /> SKIPPED</span>
             <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{metrics.skipped}</span>
           </div>
           <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}><HeartPulse size={16} /> QUEUE HEALTH</span>
             <span style={{ fontSize: '1.4rem', fontWeight: 800, color: queueHealth === 'Excellent' ? 'var(--success-color)' : 'var(--warning-color)' }}>{queueHealth}</span>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg Time: {metrics.avg_duration}m</span>
           </div>
        </div>

        {/* Action Controller */}
        <div className="card" style={{ borderTop: '4px solid var(--primary-color)', minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
           
           {!servingToken ? (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
               <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(12,59,122,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                 <UserPlus size={40} color="var(--primary-color)" />
               </div>
               <h3 style={{ fontSize: '1.4rem', color: 'var(--text-secondary)' }}>No Active Token Assigned</h3>
               
               <button 
                 className="btn-primary" 
                 style={{ padding: '16px 40px', fontSize: '1.2rem', gap: '12px' }} 
                 onClick={handleCallNext}
                 disabled={actionLoading || activeCounterStatus !== 'active'}
               >
                 <Play size={24} /> 
                 {actionLoading ? "Processing..." : "CALL NEXT TOKEN"}
               </button>
             </div>
           ) : (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                 <div>
                   <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CURRENTLY HANDLING</span>
                   <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary-color)' }}>{servingToken.token_number}</h2>
                   <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                     <span className="badge badge-warning" style={{ fontSize: '1rem', padding: '6px 16px' }}>{servingToken.status}</span>
                   </div>
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {servingToken.status === 'CALLED' && (
                      <button className="btn-accent" style={{ padding: '16px 30px', fontSize: '1.1rem' }} onClick={() => updateStatus('SERVING')} disabled={actionLoading || activeCounterStatus !== 'active'}>
                         <Play size={20} /> START SERVICE
                      </button>
                    )}
                 </div>
               </div>
               
               <div style={{ display: 'flex', gap: '20px', marginTop: 'auto' }}>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 2, background: 'var(--success-color)', padding: '16px', fontSize: '1.1rem' }}
                    onClick={() => updateStatus('COMPLETED')}
                    disabled={actionLoading}
                  >
                    <CheckCircle size={20} /> COMPLETE SESSION
                  </button>
                  
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)' }}
                    onClick={() => updateStatus('NO_SHOW')}
                    disabled={actionLoading}
                  >
                    <XCircle size={18} /> NO SHOW
                  </button>
                  
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)', border: '1px solid var(--warning-color)' }}
                    onClick={() => updateStatus('SKIPPED')}
                    disabled={actionLoading}
                  >
                    <SkipForward size={18} /> SKIP TOKEN
                  </button>
               </div>

             </div>
           )}

        </div>


         {/* Live Waiting Queue Table */}
         <div className="card" style={{ marginTop: '30px' }}>
             <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Waiting Tokens Queue</h3>
             {waitingTokens.length === 0 ? (
                 <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No tokens are currently waiting.</div>
             ) : (
                 <div style={{ overflowX: 'auto' }}>
                     <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                         <thead>
                             <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                 <th style={{ padding: '12px' }}>Token</th>
                                 <th style={{ padding: '12px' }}>Service</th>
                                 <th style={{ padding: '12px' }}>Position</th>
                                 <th style={{ padding: '12px' }}>Ahead</th>
                                 <th style={{ padding: '12px' }}>Created</th>
                                 <th style={{ padding: '12px' }}>Est. Wait</th>
                                 <th style={{ padding: '12px' }}>Status</th>
                             </tr>
                         </thead>
                         <tbody>
                             {waitingTokens.map(t => (
                                 <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                     <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.number}</td>
                                     <td style={{ padding: '12px' }}>{t.service}</td>
                                     <td style={{ padding: '12px' }}>#{t.position}</td>
                                     <td style={{ padding: '12px' }}>{t.people_ahead}</td>
                                     <td style={{ padding: '12px' }}>{t.created_at}</td>
                                     <td style={{ padding: '12px', color: 'var(--accent-color)', fontWeight: 600 }}>~{Math.round(t.base_wait_mins)} min</td>
                                     <td style={{ padding: '12px' }}><span className="badge badge-warning" style={{ fontSize: '0.8rem', padding: '4px 8px' }}>WAITING</span></td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
