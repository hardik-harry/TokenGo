import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const CitizenRights = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      {/* Top Banner */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} /> 
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Citizen Rights</h1>
        </div>
      </div>

      <div className="container animate-fade-in" style={{ flex: 1, padding: '40px 24px' }}>
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
             <div style={{ background: 'rgba(22, 163, 74, 0.1)', padding: '12px', borderRadius: '50%' }}>
                <ShieldCheck size={32} color="var(--success-color)" />
             </div>
             <h2 style={{ fontSize: '1.8rem', color: 'var(--primary-color)' }}>Your Rights & Guarantees</h2>
          </div>
          
          <div style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
            <p style={{ marginBottom: '15px' }}>As a citizen utilizing the TokenGo platform, you are guaranteed the following rights:</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><strong>Equal Access:</strong> No preferential treatment is given; tokens are served strictly in predictive sequential order.</li>
              <li><strong>Data Privacy:</strong> Your registration details and government identity are encrypted natively.</li>
              <li><strong>Transparency:</strong> Wait times and queue positions are visible publicly and live-streamed continuously.</li>
              <li><strong>Service Guarantee:</strong> If a queue is paused, your token preserves its exact spot until service resumes.</li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CitizenRights;
