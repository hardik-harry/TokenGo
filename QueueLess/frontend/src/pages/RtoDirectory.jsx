import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Footer from '../components/Footer';

const RtoDirectory = () => {
  const navigate = useNavigate();
  const [offices, setOffices] = useState([]);

  useEffect(() => {
    api.get('/offices').then(res => setOffices(res.data)).catch(console.error);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      {/* Top Banner */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} /> 
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>RTO Directory</h1>
        </div>
      </div>

      <div className="container animate-fade-in" style={{ flex: 1, padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {offices.map(o => (
            <div key={o.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <MapPin size={24} color="var(--primary-color)" />
                 <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>{o.name}</h3>
               </div>
               <p style={{ color: 'var(--text-secondary)' }}><strong>City:</strong> {o.city}</p>
               <p style={{ color: 'var(--text-secondary)' }}><strong>Address:</strong> {o.address || 'Standard local jurisdiction.'}</p>
               <p style={{ color: 'var(--text-secondary)' }}><strong>Hours:</strong> {o.opening_time} - {o.closing_time}</p>
            </div>
          ))}
          {offices.length === 0 && <p>Loading RTOs...</p>}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RtoDirectory;
