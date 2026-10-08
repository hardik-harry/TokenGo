import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Ticket, MapPin, Monitor, Clock, Users, ArrowLeft, 
  WifiOff, Wifi, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { formatWaitDuration, calculateAverageWait } from '../utils/timeUtils';

const TokenLive = () => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  
  const [token, setToken] = useState(null);
  const [officeName, setOfficeName] = useState('Loading Office...');
  const [serviceName, setServiceName] = useState('Loading Service...');
  
  // formatTime is safely removed since we utilize centralized formatWaitDuration
  
  // Realtime Socket Payload Fields
  const [liveData, setLiveData] = useState({
    current_serving_token: '-',
    queue_length: 0,
    people_waiting: 0,
    user_token_position: 0,
    predicted_wait_minutes: 0,
    lower_bound_minutes: 0,
    upper_bound_minutes: 0,
    recommended_arrival_time: '--:--',
    prediction_source: 'INITIALIZING'
  });

  const [wsConnected, setWsConnected] = useState(false);
  const [isApproaching, setIsApproaching] = useState(false);
  const wsRef = useRef(null);
  const pollRef = useRef(null);

  // 1. Fetch Structural Ground-Truth Data
  const fetchBaseTokenData = async () => {
    try {
      const res = await api.get(`/tokens/${tokenId}`);
      setToken(res.data);
      
      // Map names directly via independent API calls for RESTful separation
      const officeRes = await api.get(`/offices/${res.data.office_id}`);
      setOfficeName(officeRes.data.name);
      
      const servicesRes = await api.get(`/offices/${res.data.office_id}/services`);
      const matched = servicesRes.data.find(s => s.id === res.data.service_id);
      if (matched) setServiceName(matched.name);

      return res.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // 2. The REST Polling Fallback protocol!
  const executePollingFallback = async (baseToken) => {
    try {
      // Refresh token stats
      const currentToken = await api.get(`/tokens/${tokenId}`);
      setToken(currentToken.data);
      
      // Calculate prediction manually since socket is dead
      const predRes = await api.post('/predictions/wait-time', {
        office_id: baseToken.office_id,
        service_id: baseToken.service_id,
        token_id: parseInt(tokenId)
      });
      
      // Structuring mock payload exactly mimicking the Socket Blast
      setLiveData({
        current_serving_token: 'N/A (Polling)',
        queue_length: currentToken.data.current_queue_length,
        people_waiting: currentToken.data.people_ahead,
        user_token_position: currentToken.data.queue_position,
        predicted_wait_minutes: predRes.data.predicted_wait_minutes,
        lower_bound_minutes: predRes.data.lower_bound_minutes,
        upper_bound_minutes: predRes.data.upper_bound_minutes,
        recommended_arrival_time: predRes.data.recommended_arrival_time,
        prediction_source: predRes.data.prediction_source + ' [Polled]'
      });

    } catch (e) {
      console.error("Polling Engine Trapped Error", e);
    }
  };

  useEffect(() => {
    let activeToken = null;

    const initialize = async () => {
      activeToken = await fetchBaseTokenData();
      if (!activeToken) return;

      const connectWebSocket = () => {
        const tokenJWT = localStorage.getItem('token');
        const wsUrl = `ws://localhost:8000/api/v1/ws/queue/${activeToken.office_id}/${activeToken.service_id}?token_id=${tokenId}&auth_token=${tokenJWT}`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          setWsConnected(true);
          if (pollRef.current) clearInterval(pollRef.current);
        };

        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          setLiveData(data);
          
          if (data.people_waiting <= 2 && activeToken.status !== 'COMPLETED') {
             setIsApproaching(true);
          } else {
             setIsApproaching(false);
          }
        };

        wsRef.current.onclose = () => {
          setWsConnected(false);
          // Graceful Polling Fallback if WS violently crashes!
          pollRef.current = setInterval(() => {
             executePollingFallback(activeToken);
          }, 15000); // 15s checks
        };
      };

      connectWebSocket();
    };

    initialize();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tokenId]);

  if (!token) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h2>Loading Live Environment...</h2>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: '60px' }}>
      
      {/* Structural Top Banner */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => navigate('/offices')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} /> 
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Virtual Token Live Tracker</h1>
          <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Secure Government Issue Gateway</p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '30px' }}>
        
        {/* Dynamic Warning Notification */}
        {isApproaching && (
          <div className="animate-fade-in" style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#b45309', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <AlertTriangle size={24} color="#f59e0b" />
            <div>
              <strong style={{ display: 'block', fontSize: '1.1rem' }}>It's almost your turn!</strong>
              <span style={{ fontSize: '0.95rem' }}>Please head towards the counter area gracefully. There are 2 or less people ahead of you.</span>
            </div>
          </div>
        )}

        {/* Network Sync Feedback */}
        {!wsConnected && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '12px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }}>
             <WifiOff size={18} />
             Real-time socket offline. Utilizing graceful data polling natively.
          </div>
        )}
        {wsConnected && (
          <div style={{ background: 'rgba(22, 163, 74, 0.1)', color: 'var(--success-color)', padding: '12px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }}>
             <Wifi size={18} />
             Live Sync Active across Government WebSocket Hub.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Main Identifier Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderTop: '4px solid var(--primary-color)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Token</h3>
            <div style={{ fontSize: '4.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '15px 0' }}>
              {token.token_number}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
               <span className={`badge ${token.status === 'WAITING' ? 'badge-warning' : (token.status === 'CALLED' ? 'badge-active' : 'badge-danger')}`} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
                 {token.status}
               </span>
            </div>
            
            {(token.status === 'WAITING' || token.status === 'CALLED') && (
              <button 
                className="btn-outline" 
                style={{ marginTop: '15px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)', padding: '6px 20px', fontSize: '0.9rem' }}
                onClick={async () => {
                   try {
                       await api.post(`/tokens/${tokenId}/cancel`);
                       // Refetch locally safely bypassing WebSockets lag intentionally
                       const res = await api.get(`/tokens/${tokenId}`);
                       setToken(res.data);
                   } catch (err) {
                       alert("Failed to cancel token. It might already be processing.");
                   }
                }}
              >
                Cancel Reservation
              </button>
            )}
            
            <hr style={{ width: '100%', border: 'none', borderTop: '1px solid var(--border-color)', margin: '25px 0' }} />
            
            <div style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <MapPin size={20} color="var(--primary-color)" />
                 <div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Offical RTO Branch</div>
                   <div style={{ fontWeight: 600 }}>{officeName}</div>
                 </div>
               </div>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <Ticket size={20} color="var(--primary-color)" />
                 <div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Designated Service</div>
                   <div style={{ fontWeight: 600 }}>{serviceName}</div>
                 </div>
               </div>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <Monitor size={20} color="var(--primary-color)" />
                 <div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Currently Serving Active Token</div>
                   <div style={{ fontWeight: 800, color: 'var(--accent-color)', fontSize: '1.2rem' }}>{liveData.current_serving_token}</div>
                 </div>
               </div>
            </div>
          </div>

          {/* AI Metrics Panel */}
          <div className="card" style={{ borderTop: '4px solid var(--accent-color)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary-color)' }}>
              <Clock size={22} /> Predictive Analytics
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
               
               <div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Estimated Wait</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-color)', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    {formatWaitDuration(calculateAverageWait(liveData.lower_bound_minutes, liveData.upper_bound_minutes))}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Prediction Range: {formatWaitDuration(liveData.lower_bound_minutes)} – {formatWaitDuration(liveData.upper_bound_minutes)}
                  </div>
               </div>

               <div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Recommended Arrival</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {liveData.recommended_arrival_time}
                  </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 <div style={{ display: 'flex', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', justifyContent: 'space-between' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <MapPin size={18} color="var(--text-secondary)" />
                     <span style={{ fontWeight: 600 }}>Queue Position</span>
                   </div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>#{liveData.user_token_position}</div>
                 </div>

                 <div style={{ display: 'flex', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', justifyContent: 'space-between' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <Users size={18} color="var(--text-secondary)" />
                     <span style={{ fontWeight: 600 }}>People Ahead</span>
                   </div>
                   <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{liveData.people_waiting}</div>
                 </div>
               </div>

               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                 <CheckCircle size={14} color="var(--success-color)" /> Prediction Engine: <strong>{liveData.prediction_source}</strong>
               </div>
               
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TokenLive;
