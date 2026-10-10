import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Key, Mail, User, AlertTriangle, Phone, Eye, EyeOff, Check, X } from 'lucide-react';
import api from '../services/api';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobileNumber) && !/^\+91\d{10}$/.test(mobileNumber)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[@#$%!&]/.test(password)) {
      setError("Password does not meet all security requirements.");
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/auth/register', { name, email, mobile_number: mobileNumber, password });
      navigate('/login');
    } catch (err) {
      let errorMsg = 'Failed to register. Please try again.';
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
            <UserPlus size={32} color="var(--primary-color)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 600 }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Join TokenGo today</p>
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
              <User size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '15px', left: '16px' }} />
              <input 
                type="text" 
                placeholder="Full Name" 
                className="input-field" 
                style={{ paddingLeft: '45px' }}
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>
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
              <Phone size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '15px', left: '16px' }} />
              <input 
                type="tel" 
                placeholder="Mobile Number" 
                className="input-field" 
                style={{ paddingLeft: '45px' }}
                value={mobileNumber}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 10) {
                    setMobileNumber(val);
                  }
                }}
                maxLength={10}
                required
              />
            </div>
          </div>
          <div>
            <div style={{ position: 'relative' }}>
              <Key size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '15px', left: '16px' }} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                className="input-field" 
                style={{ paddingLeft: '45px', paddingRight: '45px' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', top: '13px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: password.length >= 8 ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                {password.length >= 8 ? <Check size={14} /> : <X size={14} />} At least 8 characters
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: /[A-Z]/.test(password) ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                {/[A-Z]/.test(password) ? <Check size={14} /> : <X size={14} />} One uppercase letter
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: /[a-z]/.test(password) ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                {/[a-z]/.test(password) ? <Check size={14} /> : <X size={14} />} One lowercase letter
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: /\d/.test(password) ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                {/\d/.test(password) ? <Check size={14} /> : <X size={14} />} One number
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: /[@#$%!&]/.test(password) ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                {/[@#$%!&]/.test(password) ? <Check size={14} /> : <X size={14} />} One special character (@, #, $)
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ marginTop: '10px', opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Registering...' : 'Sign Up securely'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have an account? <span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('/login')}>Log in</span>
        </p>
      </div>
    </div>
  );
};

export default Register;
