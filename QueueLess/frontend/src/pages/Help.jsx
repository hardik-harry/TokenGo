import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, MonitorSmartphone, Clock, ArrowLeft } from 'lucide-react';

const Help = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: '60px' }}>
      
      {/* Top Banner */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} /> 
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Help Center</h1>
        </div>
      </div>

      <div className="container animate-fade-in" style={{ marginTop: '40px', maxWidth: '1000px' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '16px' }}>How to use QueueLess</h2>
          <p style={{ fontSize: '1.1rem', color: '#475569' }}>Follow these simple steps to successfully retrieve your virtual line token and track it in real-time.</p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '30px' 
        }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px', padding: '40px 30px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a' }}>
              <Building2 size={32} />
            </div>
            <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>1. Select a Government Office</h4>
            <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: '1.6' }}>On the home page, log in to your account and locate the Token Generator Widget. Use the first dropdown to select the RTO office closest to you.</p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px', padding: '40px 30px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
              <CheckCircle size={32} />
            </div>
            <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>2. Select your Service</h4>
            <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: '1.6' }}>Use the second dropdown to tell us what you need help with today (e.g., Driving Licence Renewal, Learner's Test, Registration). The machine learning algorithm will immediately predict your wait time based on your selections.</p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px', padding: '40px 30px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a' }}>
               <MonitorSmartphone size={32} />
            </div>
            <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>3. Get your Virtual Line Token</h4>
            <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: '1.6' }}>Click the large orange "Get Virtual Line Token" button. Your spot in line is instantly reserved and linked directly to your secure account.</p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px', padding: '40px 30px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
               <Clock size={32} />
            </div>
            <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>4. Track Token Wait Time</h4>
            <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: '1.6' }}>Wait from the comfort of your home. You can always click "Track Token" or "Dashboard" in the navigation bar to see exactly how many people are ahead of you. We will alert you (via desktop push notifications) when your turn approaches!</p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Help;
