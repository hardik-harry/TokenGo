import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Ticket, MapPin, Monitor, Clock, Users, ArrowLeft, 
  WifiOff, CheckCircle 
} from 'lucide-react';
import { formatWaitDuration, calculateAverageWait } from '../utils/timeUtils';

const TokenVerify = () => {
  const { tokenReference } = useParams();
  const navigate = useNavigate();
  
  const [token, setToken] = useState(null);
  const [officeName, setOfficeName] = useState('Loading Office...');
  const [serviceName, setServiceName] = useState('Loading Service...');
  const [error, setError] = useState(null);
  
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

  const pollRef = useRef(null);

  const fetchBaseTokenData = async () => {
    try {
      const res = await api.get(`/tokens/verify/${tokenReference}`);
      setToken(res.data);
      
      const officeRes = await api.get(`/offices/${res.data.office_id}`);
      setOfficeName(officeRes.data.name);
      
      const servicesRes = await api.get(`/offices/${res.data.office_id}/services`);
      const matched = servicesRes.data.find(s => s.id === res.data.service_id);
      if (matched) setServiceName(matched.name);

      return res.data;
    } catch (err) {
      console.error(err);
      setError('Token not found or invalid.');
      return null;
    }
  };

  const executePollingFallback = async (baseToken) => {
    try {
      const currentToken = await api.get(`/tokens/verify/${tokenReference}`);
      setToken(currentToken.data);
      
      const predRes = await api.post('/predictions/wait-time', {
        office_id: baseToken.office_id,
        service_id: baseToken.service_id,
        token_id: currentToken.data.id
      });
      
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
      console.error("Polling Engine Error", e);
    }
  };

  useEffect(() => {
    let activeToken = null;

    const initialize = async () => {
      activeToken = await fetchBaseTokenData();
      if (!activeToken) return;

      executePollingFallback(activeToken);
      pollRef.current = setInterval(() => {
         executePollingFallback(activeToken);
      }, 15000); // 15s checks
    };

    initialize();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tokenReference]);

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: 'var(--danger-color)' }}>{error}</h2>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: '20px' }}>Return Home</button>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <h2>Verifying Token...</h2>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: '60px' }}>
      
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} /> 
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Verified Token Details</h1>
          <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Official Read-Only View</p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '30px' }}>
        
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '12px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 500 }}>
             <CheckCircle size={18} />
             This token is officially verified. (Read-Only)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderTop: '4px solid var(--primary-color)' }}>
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Token Number</h3>
            <div style={{ fontSize: '4.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '15px 0' }}>
              {token.token_number}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
               <span className={`badge ${token.status === 'WAITING' ? 'badge-warning' : (token.status === 'CALLED' ? 'badge-active' : (token.status === 'COMPLETED' ? 'badge-success' : 'badge-danger'))}`} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
                 {token.status}
               </span>
            </div>
            
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
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <Clock size={20} color="var(--primary-color)" />
                 <div>
                   <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Last Updated</div>
                   <div style={{ fontWeight: 600 }}>{new Date().toLocaleTimeString()}</div>
                 </div>
               </div>
            </div>
          </div>

          <div className="card" style={{ borderTop: '4px solid var(--accent-color)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary-color)' }}>
              <Clock size={22} /> Queue Analytics
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenVerify;
