import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, MonitorSmartphone, Clock, ArrowLeft } from 'lucide-react';
import Footer from '../components/Footer';

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

      <div className="container animate-fade-in" style={{ marginTop: '40px', maxWidth: '1000px', paddingBottom: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '16px' }}>How can we assist you?</h2>
          <p style={{ fontSize: '1.1rem', color: '#475569' }}>Find answers to frequently asked questions, office hours, and support contacts.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px' }}>
          
          {/* FAQs */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Frequently Asked Questions</h3>
            <div>
              <h5 style={{ fontWeight: 700, color: '#0f172a' }}>Do I need to print my token?</h5>
              <p style={{ fontSize: '0.95rem', color: '#475569', marginTop: '4px' }}>No, showing the live token track screen on your mobile device is sufficient.</p>
            </div>
            <div style={{ marginTop: '10px' }}>
              <h5 style={{ fontWeight: 700, color: '#0f172a' }}>What happens if I miss my turn?</h5>
              <p style={{ fontSize: '0.95rem', color: '#475569', marginTop: '4px' }}>Tokens that are skipped due to a no-show are automatically cancelled after 15 minutes.</p>
            </div>
          </div>

          {/* Cancellation Instructions */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Token Cancellation</h3>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>
              If you can no longer make your designated time:
              <br/><br/>
              1. Open your <strong>Dashboard</strong> or <strong>Track Token</strong> page.<br/>
              2. Locate the active token you wish to void.<br/>
              3. Click the red <strong>Cancel Reservation</strong> button.<br/>
              <br/>
              <em>Note: Tokens marked as 'Serving' or 'Completed' cannot be cancelled.</em>
            </p>
          </div>

          {/* Office Timings */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Standard Office Timings</h3>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: '1.8' }}>
              <li><strong>Monday - Friday:</strong> 10:00 AM - 6:00 PM</li>
              <li><strong>Saturday:</strong> 10:00 AM - 2:00 PM</li>
              <li><strong>Sunday & Public Holidays:</strong> Closed</li>
            </ul>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '10px' }}>* Specific RTO hours may vary. Please check your assigned branch.</p>
          </div>

          {/* Contact Info */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Contact Details</h3>
            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.6' }}>
              <strong>Support Email:</strong> support@tokengo.gov<br/>
              <strong>Toll-Free Helpline:</strong> 1800-111-2222<br/>
              <strong>Headquarters:</strong> Transport Bhavan, Phase 1, Neo City.
            </p>
          </div>
          
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Help;
