import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Key, Mail, AlertTriangle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const decoded = await login(email, password);
      if (decoded.role === 'admin') navigate('/admin');
      else if (decoded.role === 'employee') navigate('/employee');
      else navigate('/offices');
    } catch (err) {
      let errorMsg = 'Invalid email or password.';
      if (err.response?.data?.detail) {
        errorMsg = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      }
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
            <LogIn size={32} color="var(--primary-color)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Sign in to continue to QueueLess</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger-color)', marginBottom: '20px' }}>
             <AlertTriangle size={20} />
             <span style={{ fontSize: '0.9rem' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '15px', left: '16px' }} />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="input-field" 
                style={{ paddingLeft: '45px' }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <div style={{ position: 'relative' }}>
              <Key size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '15px', left: '16px' }} />
              <input 
                type="password" 
                placeholder="Password" 
                className="input-field" 
                style={{ paddingLeft: '45px' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '10px', opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Authenticating...' : 'Secure Log In'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Don't have an account? <span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('/register')}>Sign up here</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
