import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import Home from './pages/Home';
import Login from './pages/Login';
import TokenLive from './pages/TokenLive';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Profile from './pages/Profile';
import Help from './pages/Help';
import TrackRedirect from './pages/TrackRedirect';
import TokenVerify from './pages/TokenVerify';
import CitizenRights from './pages/CitizenRights';
import RtoDirectory from './pages/RtoDirectory';
import Contact from './pages/Contact';
import Documents from './pages/Documents';
import MockTest from './pages/MockTest';

import AdminLayout from './pages/admin/AdminLayout';
import AdminOffices from './pages/admin/AdminOffices';
import AdminServices from './pages/admin/AdminServices';
import AdminCounters from './pages/admin/AdminCounters';
import AdminTokens from './pages/admin/AdminTokens';
import AdminQueue from './pages/admin/AdminQueue';
import AdminEmployees from './pages/admin/AdminEmployees';

import Register from './pages/Register';

// Layout Wrappers mapping UI consistently 
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
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
      <SettingsProvider>
        <Router>
          <Routes>
            {/* Public Citizen Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-token/:tokenReference" element={<TokenVerify />} />
            <Route path="/citizen-rights" element={<CitizenRights />} />
            <Route path="/rto-directory" element={<RtoDirectory />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/mock-test" element={<MockTest />} />
            
            {/* Since our Home.jsx elegantly wraps RTO selection and service mappings on-page, we natively fallback here! */}
            <Route path="/offices" element={<Navigate to="/" replace />} />
            <Route path="/offices/:officeId" element={<Navigate to="/" replace />} />
            <Route path="/offices/:officeId/services" element={<Navigate to="/" replace />} />
            
            <Route path="/help" element={<Help />} />
            
            {/* Protected Citizen Routes */}
            <Route path="/track" element={<ProtectedRoute><TrackRedirect /></ProtectedRoute>} />
            <Route path="/token/:tokenId" element={<ProtectedRoute><TokenLive /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            
            {/* Employee Routes */}
            <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/employee/queue" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><Placeholder title="Queue Management" /></ProtectedRoute>} />
            <Route path="/employee/counter" element={<ProtectedRoute allowedRoles={['employee', 'admin']}><Placeholder title="Counter Controller" /></ProtectedRoute>} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
            
            <Route path="/admin/offices" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminOffices /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/services" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminServices /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/counters" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminCounters /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/tokens" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminTokens /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/queue" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminQueue /></AdminLayout></ProtectedRoute>} />
            
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminEmployees /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/data" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><Placeholder title="Data Management" /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/model" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><Placeholder title="ML Model Diagnostics" /></AdminLayout></ProtectedRoute>} />
            <Route path="/admin/audit" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><Placeholder title="Audit Logs (Read Only)" /></AdminLayout></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
