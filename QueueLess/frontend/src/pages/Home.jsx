import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatWaitDuration, calculateAverageWait } from '../utils/timeUtils';
import { 
  Building2, ChevronRight, User, LogIn, Clock, 
  MapPin, CheckCircle, Search, Monitor, ArrowRight 
} from 'lucide-react';
import Footer from '../components/Footer';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Widget States
  const [offices, setOffices] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState('');
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Load initial offices organically
  useEffect(() => {
    api.get('/offices').then(res => setOffices(res.data)).catch(console.error);
  }, []);

  // Map services organically whenever office changes
  useEffect(() => {
    if (!selectedOffice) {
      setServices([]);
      setSelectedService('');
      setPrediction(null);
      return;
    }
    api.get(`/offices/${selectedOffice}/services`)
      .then(res => setServices(res.data))
      .catch(console.error);
  }, [selectedOffice]);

  // Map predictions whenever BOTH office and service select
  useEffect(() => {
    if (selectedOffice && selectedService) {
      setIsLoading(true);
      api.post('/predictions/wait-time', {
         office_id: parseInt(selectedOffice),
         service_id: parseInt(selectedService)
      }).then(res => {
         let data = res.data;
         if (data.predicted_wait_minutes > 90 || data.predicted_wait_minutes < 0 || isNaN(data.predicted_wait_minutes)) {
             console.warn("Unexpected prediction value from backend:", data);
             data.predicted_wait_minutes = Math.max(5, Math.min(90, data.predicted_wait_minutes || 15));
             data.lower_bound_minutes = Math.max(1, Math.min(data.predicted_wait_minutes, data.lower_bound_minutes || 10));
             data.upper_bound_minutes = Math.min(90, Math.max(data.predicted_wait_minutes, data.upper_bound_minutes || 20));
         }
         setPrediction(data);
         setIsLoading(false);
      }).catch(() => {
         setPrediction(null);
         setIsLoading(false);
      });
    } else {
      setPrediction(null);
    }
  }, [selectedOffice, selectedService]);

  const generateToken = async () => {
      if (!user) {
         navigate('/login');
         return;
      }
      try {
         setGenerateError('');
         const res = await api.post('/tokens', {
            office_id: parseInt(selectedOffice),
            service_id: parseInt(selectedService)
         });
         navigate(`/token/${res.data.id}`);
      } catch (err) {
         setGenerateError(err.response?.data?.detail || "Failed to secure placement in queue.");
      }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* 1. Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <Building2 size={28} color="var(--primary-color)" />
          <h1 style={{ color: 'var(--primary-color)', fontSize: '1.4rem', fontWeight: 700 }}>Token<span style={{ color: 'var(--accent-color)' }}>Go</span></h1>
        </div>
        
        <div className="nav-links">
          <a href="/" className="nav-link" style={{ color: 'var(--primary-color)', fontWeight: 600 }} onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a>
          <a href="#services" className="nav-link" onClick={(e) => { 
            e.preventDefault(); 
            const el = document.getElementById('services');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate('/');
            }
          }}>How It Works</a>
          <a href="/track" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/track'); }}>Track Token</a>
          <a href="/help" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/help'); }}>Help</a>
          
          <div style={{ marginLeft: '16px', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            {!user ? (
              <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 16px', borderRadius: '6px', fontWeight: 600 }} onClick={() => navigate('/login')}>Login</button>
            ) : (
              <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', height: '38px', padding: '0 16px', borderRadius: '6px', fontWeight: 600 }} onClick={() => navigate(user.role === 'admin' ? '/admin' : '/profile')}>Dashboard</button>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Professional Hero Module */}
      <section className="hero-section">
        <div className="container hero-content animate-fade-in">
          
          <div style={{ flex: 1, paddingRight: '40px' }}>
            <div style={{ display: 'inline-block', background: 'var(--accent-color)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '20px' }}>
              OFFICIAL GOVERNMENT PORTAL
            </div>
            <h2 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-color)', lineHeight: 1.1, marginBottom: '24px' }}>
              Get your virtual token online. <br/>
              <span style={{ color: 'var(--text-primary)' }}>Skip the waiting room.</span>
            </h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '500px', lineHeight: 1.6 }}>
              Reserve your spot ahead of time securely and track real-time queue fluctuations driven by state-of-the-art predictive algorithms directly from your device.
            </p>
          </div>

          <div style={{ flex: '0 1 450px' }}>
            <div className="card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '24px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Monitor size={24} /> Token Generator Widget
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <label className="label"><MapPin size={16} style={{display:'inline', verticalAlign:'text-bottom'}}/> Select RTO Office</label>
                <select className="select-field" value={selectedOffice} onChange={e => setSelectedOffice(e.target.value)}>
                  <option value="">-- Choose an Office --</option>
                  {offices.map(o => (
                    <option key={o.id} value={o.id}>{o.name} ({o.city})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="label"><Search size={16} style={{display:'inline', verticalAlign:'text-bottom'}}/> Select Required Service</label>
                <select className="select-field" value={selectedService} onChange={e => setSelectedService(e.target.value)} disabled={!selectedOffice}>
                  <option value="">-- Choose a Service --</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {isLoading && (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Calculating wait bounds...</div>
              )}

              {!isLoading && prediction && (
                <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <div className="label">Estimated Wait</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-color)' }}>{formatWaitDuration(calculateAverageWait(prediction.lower_bound_minutes, prediction.upper_bound_minutes))}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="label">Recommended Arrival</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{prediction.recommended_arrival_time}</div>
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Bounds: {formatWaitDuration(prediction.lower_bound_minutes)} – {formatWaitDuration(prediction.upper_bound_minutes)}</span>
                    <span>Source: {prediction.prediction_source}</span>
                  </div>
                </div>
              )}

              {generateError && (
                 <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem' }}>
                    {generateError}
                 </div>
              )}

              <button 
                className="btn-accent" 
                style={{ width: '100%', fontSize: '1.1rem' }} 
                disabled={!prediction}
                onClick={generateToken}
              >
                Get Virtual Line Token <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How it Works / Popular Services */}
      <section className="container animate-fade-in" style={{ padding: '60px 24px' }} id="services">
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2.2rem', color: 'var(--primary-color)', fontWeight: 700, marginBottom: '16px' }}>How It Works</h2>
          <p style={{ color: 'var(--text-secondary)' }}>A seamless 4-step process utilizing predictive logic organically</p>
        </div>

        <div className="grid-steps" style={{ paddingTop: '0' }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(12, 59, 122, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
              <Building2 size={30} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>1. Locate RTO Center</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Choose your localized transport office from our real-time mapped selections.</p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(251, 146, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
              <CheckCircle size={30} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>2. Select Need</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Identify whether you are registering a permit or renewing a credential quickly.</p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(12, 59, 122, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
               <Monitor size={30} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>3. Reserve Spot</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Generate your virtual token completely tying into backend machine learning bounds.</p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '15px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(22, 163, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success-color)' }}>
               <Clock size={30} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700 }}>4. Arrive On-Time</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Walk right into the counter skipping hours of dead wait times organically.</p>
          </div>
          
        </div>
      </section>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;
