import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import TokenLive from './pages/TokenLive';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Profile from './pages/Profile';
import Help from './pages/Help';

import Register from './pages/Register';

// Layout Wrappers mapping UI consistently 
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

// Placeholder mapping to prevent React router from crashing natively if components aren't generated yet
const Placeholder = ({ title }) => (
  <div className="container animate-fade-in" style={{ textAlign: 'center', marginTop: '20vh' }}>
    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>{title}</h1>
    <p style={{ color: 'var(--text-secondary)' }}>This module is currently being constructed.</p>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Citizen Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Since our Home.jsx elegantly wraps RTO selection and service mappings on-page, we natively fallback here! */}
          <Route path="/offices" element={<Navigate to="/" replace />} />
          <Route path="/offices/:officeId" element={<Navigate to="/" replace />} />
          <Route path="/offices/:officeId/services" element={<Navigate to="/" replace />} />
          
          <Route path="/help" element={<Help />} />
          
          {/* Protected Citizen Routes */}
          <Route path="/token/:tokenId" element={<ProtectedRoute><TokenLive /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          
          {/* Employee Routes */}
          <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/employee/queue" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><Placeholder title="Queue Management" /></ProtectedRoute>} />
          <Route path="/employee/counter" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><Placeholder title="Counter Controller" /></ProtectedRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          
          <Route path="/admin/offices" element={<ProtectedRoute allowedRoles={['admin']}><Placeholder title="Office Management" /></ProtectedRoute>} />
          <Route path="/admin/services" element={<ProtectedRoute allowedRoles={['admin']}><Placeholder title="Service Configurations" /></ProtectedRoute>} />
          <Route path="/admin/counters" element={<ProtectedRoute allowedRoles={['admin']}><Placeholder title="Counter Configurations" /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><Placeholder title="User & Staff Database" /></ProtectedRoute>} />
          <Route path="/admin/data" element={<ProtectedRoute allowedRoles={['admin']}><Placeholder title="Data Management" /></ProtectedRoute>} />
          
          <Route path="/admin/model" element={<ProtectedRoute allowedRoles={['admin']}><Placeholder title="ML Model Diagnostics" /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['admin']}><Placeholder title="Audit Logs (Read Only)" /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
