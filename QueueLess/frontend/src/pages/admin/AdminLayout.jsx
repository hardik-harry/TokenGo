import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ActivitySquare, LayoutDashboard, Building2, Server, 
  MapPin, CheckCircle, Bell, Settings, LogOut, Monitor
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  
  const navItems = [
    { path: '/admin', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/admin/offices', name: 'Offices', icon: <Building2 size={20} /> },
    { path: '/admin/services', name: 'Services', icon: <Server size={20} /> },
    { path: '/admin/counters', name: 'Counters', icon: <MapPin size={20} /> },
    { path: '/admin/tokens', name: 'Tokens', icon: <CheckCircle size={20} /> },
    { path: '/admin/queue', name: 'Queue Monitor', icon: <Monitor size={20} /> }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <div style={{ width: '250px', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ActivitySquare size={24} color="var(--accent-color)" /> TokenGo
          </h2>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>Admin Portal</div>
        </div>
        
        <div style={{ padding: '10px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {navItems.map(item => (
            <div 
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px',
                background: location.pathname === item.path ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: location.pathname === item.path ? 'var(--accent-color)' : '#cbd5e1',
                borderLeft: location.pathname === item.path ? '3px solid var(--accent-color)' : '3px solid transparent'
              }}
            >
              {item.icon} <span style={{ fontWeight: 500 }}>{item.name}</span>
            </div>
          ))}
        </div>
        
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div 
            onClick={() => { logout(); navigate('/login'); }}
            style={{ padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#f87171' }}
          >
            <LogOut size={20} /> Logout
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
         {children}
      </div>
    </div>
  );
};

export default AdminLayout;
