import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, Mail, Phone, Shield, Calendar, Bell, Key, Moon, Save, X, ActivitySquare, Ticket, LogOut } from 'lucide-react';


const Profile = () => {
    const { user, setUser, logout } = useAuth();
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState(null);
    const [tokens, setTokens] = useState([]);
    const [mockTests, setMockTests] = useState([]);
    const [offices, setOffices] = useState({});
    
    // Account Settings States
    const [notifications, setNotifications] = useState(localStorage.getItem('notifications') !== 'false');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'Light');
    
    // Change Password States
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // Edit Profile State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', mobile_number: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchData();
        const inv = setInterval(fetchData, 10000);
        return () => clearInterval(inv);
    }, [user, navigate]);

    const fetchData = async () => {
        try {
            const [profileRes, tokensRes, officesRes, mockTestRes] = await Promise.all([
                api.get('/auth/me'),
                api.get('/tokens'),
                api.get('/offices'),
                api.get('/mock-test/history').catch(() => ({ data: [] }))
            ]);
            setProfile(profileRes.data);
            setEditForm({ name: profileRes.data.name, mobile_number: profileRes.data.mobile_number || '' });
            setTokens(tokensRes.data);
            setMockTests(mockTestRes.data || []);
            
            // Map offices by ID for display
            const officeMap = {};
            officesRes.data.forEach(o => { officeMap[o.id] = o; });
            setOffices(officeMap);
            
        } catch (err) {
            console.error(err);
        }
    };

    // Synchronize settings with LocalStorage
    useEffect(() => {
        localStorage.setItem('notifications', notifications.toString());
        localStorage.setItem('theme', theme);
        
        if (theme === 'Dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, [notifications, theme]);

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        
        if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
            setPasswordError('All fields are required.');
            return;
        }
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordError('New passwords do not match.');
            return;
        }
        
        setIsSavingPassword(true);
        try {
            await api.put('/auth/me/password', {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password
            });
            setPasswordSuccess('Password changed successfully!');
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => {
                setIsPasswordModalOpen(false);
                setPasswordSuccess('');
            }, 2000);
        } catch (err) {
            setPasswordError(err.response?.data?.detail || 'Failed to change password.');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const handleSave = async () => {
        setError('');
        setMessage('');
        
        if (!editForm.name.trim()) {
            setError('Full name cannot be empty.');
            return;
        }
        
        if (editForm.mobile_number && editForm.mobile_number.replace(/\D/g, '').length !== 10) {
            setError('Mobile number must be exactly 10 digits.');
            return;
        }

        setIsSaving(true);
        try {
            const res = await api.put('/auth/me', editForm);
            setProfile(res.data);
            setUser({ ...user, name: res.data.name }); // Sync global context if needed
            setMessage('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!profile) return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-secondary)' }}>
            Loading Profile...
        </div>
    );

    // Status grouping organically
    const pendingTokens = tokens.filter(t => ['waiting', 'called'].includes(t.status.toLowerCase()));
    const inProgressTokens = tokens.filter(t => t.status.toLowerCase() === 'serving');
    const completedTokensList = tokens.filter(t => t.status.toLowerCase() === 'completed');

    const activeTokenStr = inProgressTokens.length > 0 
        ? inProgressTokens[0].token_number 
        : (pendingTokens.length > 0 ? pendingTokens[0].token_number : '--');

    let totalWaitMins = 0;
    let waitCount = 0;
    completedTokensList.forEach(tk => {
        if (tk.started_at && tk.created_at) {
            const startStr = tk.started_at + (!tk.started_at.endsWith('Z') ? 'Z' : '');
            const createStr = tk.created_at + (!tk.created_at.endsWith('Z') ? 'Z' : '');
            const start = new Date(startStr);
            const created = new Date(createStr);
            if (!isNaN(start) && !isNaN(created) && start >= created) {
                totalWaitMins += (start - created) / 60000;
                waitCount++;
            }
        }
    });
    const avgWaitStr = waitCount > 0 ? `${Math.round(totalWaitMins / waitCount)} min` : '--';

    const getServiceTimeDisplay = (tk) => {
        if (!tk.started_at) return '-';
        const startStr = tk.started_at + (!tk.started_at.endsWith('Z') ? 'Z' : '');
        const start = new Date(startStr);
        if (isNaN(start)) return '-';

        if (tk.status.toLowerCase() === 'completed' && tk.completed_at) {
            const endStr = tk.completed_at + (!tk.completed_at.endsWith('Z') ? 'Z' : '');
            const end = new Date(endStr);
            const m = Math.floor((end - start) / 60000);
            return m < 1 ? '<1 min' : `${m} min`;
        } else if (tk.status.toLowerCase() === 'serving') {
            const end = new Date();
            const m = Math.floor((end - start) / 60000);
            return m < 1 ? 'Just started' : `${m} min (Active)`;
        }
        return '-';
    };
    
    // Status Badge Color Map
    const getBadgeStyle = (status) => {
        const s = status.toLowerCase();
        if (s === 'completed') return { bg: '#dcfce7', color: '#16a34a' };
        if (s === 'called') return { bg: '#fef08a', color: '#854d0e' };
        if (s === 'serving') return { bg: '#cffafe', color: '#0891b2' };
        if (s === 'cancelled') return { bg: '#fee2e2', color: '#dc2626' };
        return { bg: '#f1f5f9', color: '#475569' }; // waiting/pending
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: '60px' }}>
            
            {/* Navigation Header */}
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <ActivitySquare size={24} color="var(--accent-color)" /> 
                    <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>TokenGo</span>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <button className="btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={logout}>
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>

            <div className="container animate-fade-in" style={{ marginTop: '40px', maxWidth: '1000px' }}>
                
                {/* Page Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '10px' }}>My Profile</h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Manage your account and personal information</p>
                </div>

                <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    
                    {/* Left Column (Profile & Settings) */}
                    <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    
                        {/* Profile Card */}
                        <div className="card" style={{ padding: '30px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '25px', marginBottom: '25px' }}>
                                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(12, 59, 122, 0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px' }}>
                                    <UserIcon size={40} color="var(--primary-color)" />
                                </div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{profile.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', margin: '5px 0 15px 0' }}>{profile.email}</p>
                                
                                {!isEditing ? (
                                    <button className="btn-outline" style={{ width: '100%' }} onClick={() => setIsEditing(true)}>Edit Profile</button>
                                ) : (
                                    <div style={{ width: '100%', display: 'flex', gap: '10px' }}>
                                        <button className="btn-accent" style={{ flex: 1, display: 'flex', justifyContent: 'center' }} onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? 'Saving...' : <><Save size={16} /> Save</>}
                                        </button>
                                        <button className="btn-outline" style={{ display: 'flex', justifyContent: 'center' }} onClick={() => { setIsEditing(false); setError(''); }}>
                                            <X size={16} /> Cancel
                                        </button>
                                    </div>
                                )}
                                
                                {error && <div style={{ width: '100%', marginTop: '15px', color: 'var(--danger-color)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
                                {message && <div style={{ width: '100%', marginTop: '15px', color: 'var(--success-color)', fontSize: '0.9rem', textAlign: 'center' }}>{message}</div>}
                            </div>

                            <div>
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div>
                                            <label className="label">Full Name</label>
                                            <input type="text" className="input-field" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} disabled={isSaving} />
                                        </div>
                                        <div>
                                            <label className="label">Mobile Number</label>
                                            <input 
                                                type="text" 
                                                className="input-field" 
                                                value={editForm.mobile_number} 
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    if(val.length <= 10) setEditForm({...editForm, mobile_number: val});
                                                }} 
                                                maxLength={10}
                                                placeholder="e.g. 9876543210" 
                                                disabled={isSaving} 
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Email Address <span style={{fontSize:'0.8rem', color:'var(--text-secondary)'}}>(Read-only)</span></label>
                                            <input type="email" className="input-field" value={profile.email} disabled style={{ background: '#f8fafc', color: '#94a3b8' }} />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <UserIcon size={18} color="var(--text-secondary)" />
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Full Name</div>
                                                <div style={{ fontWeight: 500 }}>{profile.name}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <Mail size={18} color="var(--text-secondary)" />
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email Address</div>
                                                <div style={{ fontWeight: 500 }}>{profile.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <Phone size={18} color="var(--text-secondary)" />
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mobile Number</div>
                                                <div style={{ fontWeight: 500 }}>{profile.mobile_number || 'Not provided'}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <Shield size={18} color="var(--text-secondary)" />
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account Type</div>
                                                <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{profile.role}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <Calendar size={18} color="var(--text-secondary)" />
                                            <div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Member Since</div>
                                                <div style={{ fontWeight: 500 }}>{new Date(profile.created_at + 'Z').toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Account Settings */}
                        <div className="card" style={{ padding: '30px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', color: 'var(--primary-color)' }}>Account Settings</h3>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={() => setNotifications(!notifications)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, color: '#1e293b' }}><Bell size={20} color="var(--primary-color)" /> Notifications</div>
                                    <div style={{ width: '44px', height: '24px', background: notifications ? '#16a34a' : '#cbd5e1', borderRadius: '12px', position: 'relative', transition: 'background 0.3s' }}>
                                        <div style={{ position: 'absolute', width: '20px', height: '20px', background: 'white', borderRadius: '50%', right: notifications ? '2px' : 'auto', left: notifications ? 'auto' : '2px', top: '2px', transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={() => setIsPasswordModalOpen(true)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, color: '#1e293b' }}><Key size={20} color="var(--primary-color)" /> Change Password</div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, color: '#1e293b' }}><Moon size={20} color="var(--primary-color)" /> Theme</div>
                                    <select style={{ border: 'none', background: 'transparent', fontSize: '1rem', color: 'var(--text-secondary)', outline: 'none', cursor: 'pointer', textAlign: 'right', fontWeight: 500 }} value={theme} onChange={e => setTheme(e.target.value)}>
                                        <option value="Light">Light</option>
                                        <option value="Dark">Dark</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Activity & History) */}
                    <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        {/* My Queue Activity */}
                        <div className="card" style={{ padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--primary-color)' }}>My Queue Activity</h3>
                                <a href="#history" style={{ fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'none' }}>View Token History →</a>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '20px' }}>
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-secondary)' }}>{pendingTokens.length}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pending</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-color)' }}>{inProgressTokens.length}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>In Progress / Active</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success-color)' }}>{completedTokensList.length}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Completed</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning-color)' }}>{activeTokenStr}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Current Token</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-color)' }}>{avgWaitStr}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Avg Wait Time</div>
                                </div>
                            </div>
                        </div>

                        {/* Token History */}
                        <div className="card" id="history" style={{ padding: '30px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', color: 'var(--primary-color)' }}>Token History</h3>
                            
                            {tokens.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', background: '#f8fafc', borderRadius: '12px' }}>
                                    <Ticket size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                                    No tokens found in your history.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.9rem' }}>
                                                <th style={{ padding: '12px 15px', borderRadius: '8px 0 0 8px' }}>Token Number</th>
                                                <th style={{ padding: '12px 15px' }}>Office</th>
                                                <th style={{ padding: '12px 15px' }}>Service Time</th>
                                                <th style={{ padding: '12px 15px', borderRadius: '0 8px 8px 0' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tokens.map(tk => {
                                                const off = offices[tk.office_id];
                                                const syle = getBadgeStyle(tk.status);
                                                return (
                                                    <tr key={tk.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                        <td style={{ padding: '16px 15px', fontWeight: 700, color: 'var(--primary-color)' }}>{tk.token_number}</td>
                                                        <td style={{ padding: '16px 15px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{off ? off.name : `Office #${tk.office_id}`}</td>
                                                        <td style={{ padding: '16px 15px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{getServiceTimeDisplay(tk)}</td>
                                                        <td style={{ padding: '16px 15px' }}>
                                                            <span style={{ 
                                                                background: syle.bg, color: syle.color, 
                                                                padding: '4px 10px', borderRadius: '12px', 
                                                                fontSize: '0.8rem', fontWeight: 700, display: 'inline-block',
                                                                textTransform: 'capitalize'
                                                            }}>{tk.status}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Mock Test History */}
                        <div className="card" id="mock-test-history" style={{ padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--primary-color)' }}>Mock Test History</h3>
                                <button className="btn-accent" style={{ padding: '8px 16px', fontSize: '0.9rem' }} onClick={() => navigate('/mock-test')}>
                                    Take New Test
                                </button>
                            </div>
                            
                            {mockTests.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', background: '#f8fafc', borderRadius: '12px' }}>
                                    <Shield size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                                    No mock tests taken yet. Start practicing today!
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.9rem' }}>
                                                <th style={{ padding: '12px 15px', borderRadius: '8px 0 0 8px' }}>Date</th>
                                                <th style={{ padding: '12px 15px' }}>Score</th>
                                                <th style={{ padding: '12px 15px' }}>Percentage</th>
                                                <th style={{ padding: '12px 15px', borderRadius: '0 8px 8px 0' }}>Result</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mockTests.map(test => {
                                                const date = new Date(test.created_at + 'Z').toLocaleDateString();
                                                return (
                                                    <tr key={test.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                        <td style={{ padding: '16px 15px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{date}</td>
                                                        <td style={{ padding: '16px 15px', fontWeight: 600 }}>{test.score} / {test.total_questions}</td>
                                                        <td style={{ padding: '16px 15px', color: 'var(--text-secondary)' }}>{test.percentage.toFixed(0)}%</td>
                                                        <td style={{ padding: '16px 15px' }}>
                                                            <span style={{ 
                                                                background: test.passed ? '#dcfce7' : '#fee2e2', 
                                                                color: test.passed ? '#16a34a' : '#dc2626', 
                                                                padding: '4px 10px', borderRadius: '12px', 
                                                                fontSize: '0.8rem', fontWeight: 700, display: 'inline-block'
                                                            }}>{test.passed ? 'Passed' : 'Needs Practice'}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {isPasswordModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div className="card animate-fade-in" style={{ padding: '30px', width: '100%', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--primary-color)' }}>Change Password</h3>
                            <X size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => !isSavingPassword && setIsPasswordModalOpen(false)} />
                        </div>
                        
                        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label className="label">Current Password</label>
                                <input type="password" required className="input-field" value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} disabled={isSavingPassword} />
                            </div>
                            <div>
                                <label className="label">New Password</label>
                                <input type="password" required className="input-field" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} disabled={isSavingPassword} />
                            </div>
                            <div>
                                <label className="label">Confirm New Password</label>
                                <input type="password" required className="input-field" value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} disabled={isSavingPassword} />
                            </div>
                            
                            {passwordError && <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center' }}>{passwordError}</div>}
                            {passwordSuccess && <div style={{ padding: '10px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)', borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center' }}>{passwordSuccess}</div>}
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setIsPasswordModalOpen(false)} disabled={isSavingPassword}>Cancel</button>
                                <button type="submit" className="btn-accent" style={{ flex: 1 }} disabled={isSavingPassword}>{isSavingPassword ? 'Verifying...' : 'Update Password'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
