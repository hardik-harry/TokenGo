import React, { useState } from 'react';
import { ArrowLeft, Mail, Phone, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

const Contact = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
      {/* Top Banner */}
      <div style={{ background: 'var(--primary-color)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} /> 
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600 }}>Contact Department</h1>
        </div>
      </div>

      <div className="container animate-fade-in" style={{ flex: 1, padding: '40px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
             <h2 style={{ fontSize: '2rem', color: 'var(--primary-color)', marginBottom: '20px' }}>Get in Touch</h2>
             <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Our support team is available to assist you with any inquiries regarding the virtual token system.</p>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mail size={20} color="var(--primary-color)" />
                  <span>support@tokengo.gov</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Phone size={20} color="var(--primary-color)" />
                  <span>1800-111-2222 (Toll-Free)</span>
               </div>
             </div>
          </div>

          <div className="card" style={{ flex: 1, minWidth: '300px' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--success-color)' }}>
                <MessageSquare size={48} style={{ margin: '0 auto 20px' }} />
                <h3>Message Sent Successfully!</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>We will revert back to you shortly natively.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ marginBottom: '10px' }}>Send us a message</h3>
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" className="input-field" required />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" className="input-field" required />
                </div>
                <div>
                  <label className="label">Message</label>
                  <textarea className="input-field" rows="4" required></textarea>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Submit Form</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
