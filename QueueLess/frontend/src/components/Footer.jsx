import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0', flexWrap: 'wrap', gap: '20px' }}>
         <div>
           <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px' }}>TokenGo Platform</h2>
           <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>© 2026 Official Virtual Queuing Transport Portal. <br/>All Rights Reserved.</p>
         </div>
         
         <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <strong style={{ marginBottom: '5px' }}>Gov Services</strong>
             <Link to="/citizen-rights" style={{ color: 'white', opacity: 0.8, textDecoration: 'none', fontSize: '0.9rem', outline: 'none' }} onFocus={(e) => e.target.style.opacity = 1} onBlur={(e) => e.target.style.opacity = 0.8} onMouseOver={(e) => e.target.style.opacity = 1} onMouseOut={(e) => e.target.style.opacity = 0.8}>Citizen Rights</Link>
             <Link to="/rto-directory" style={{ color: 'white', opacity: 0.8, textDecoration: 'none', fontSize: '0.9rem', outline: 'none' }} onFocus={(e) => e.target.style.opacity = 1} onBlur={(e) => e.target.style.opacity = 0.8} onMouseOver={(e) => e.target.style.opacity = 1} onMouseOut={(e) => e.target.style.opacity = 0.8}>RTO Directory</Link>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <strong style={{ marginBottom: '5px' }}>Support</strong>
             <Link to="/help" style={{ color: 'white', opacity: 0.8, textDecoration: 'none', fontSize: '0.9rem', outline: 'none' }} onFocus={(e) => e.target.style.opacity = 1} onBlur={(e) => e.target.style.opacity = 0.8} onMouseOver={(e) => e.target.style.opacity = 1} onMouseOut={(e) => e.target.style.opacity = 0.8}>Platform Help</Link>
             <Link to="/contact" style={{ color: 'white', opacity: 0.8, textDecoration: 'none', fontSize: '0.9rem', outline: 'none' }} onFocus={(e) => e.target.style.opacity = 1} onBlur={(e) => e.target.style.opacity = 0.8} onMouseOver={(e) => e.target.style.opacity = 1} onMouseOut={(e) => e.target.style.opacity = 0.8}>Contact Department</Link>
           </div>
         </div>
      </div>
    </footer>
  );
};

export default Footer;
