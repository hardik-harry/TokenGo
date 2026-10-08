import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Ticket, ExternalLink } from 'lucide-react';

const TrackRedirect = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await api.get('/tokens');
                const activeToken = res.data.find(t => t.status === 'WAITING' || t.status === 'CALLED');
                if (activeToken) {
                    navigate(`/token/${activeToken.id}`, { replace: true });
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchToken();
    }, [navigate]);

    if (loading) return (
        <div style={{minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-secondary)'}}>
            <h2>Locating active token...</h2>
        </div>
    );

    return (
        <div style={{minHeight: '100vh', background: 'var(--bg-secondary)', padding: "50px 20px", display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
           <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px auto' }}>
                  <Ticket size={32} />
              </div>
              <h2 style={{ marginBottom: '15px' }}>No Active Token Found</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>You don't have an active token right now. Please generate a new one to track your status live.</p>
              
              <button className="btn-primary" onClick={() => navigate('/')} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  Get New Token <ExternalLink size={18} />
              </button>
           </div>
        </div>
    );
};

export default TrackRedirect;
