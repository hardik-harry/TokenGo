import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      
      // Look for new unseen ones to trigger OS Notification mapping
      const newItems = res.data.filter(n => !n.is_read);
      
      if (newItems.length > 0 && Notification.permission === "granted") {
         // Grab ones we haven't already locally alerted for
         const existingIds = notifications.map(x => x.id);
         const brandNew = newItems.filter(n => !existingIds.includes(n.id));
         
         brandNew.forEach(n => {
            new window.Notification("QueueLess Alert", {
               body: n.message,
               icon: '/vite.svg'
            });
         });
      }
      
      setNotifications(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    requestBrowserPermission();
    fetchNotifications();
    
    // Poll for notifications organically every 10s
    const inv = setInterval(fetchNotifications, 10000);
    return () => clearInterval(inv);
  }, [user]); // Re-bind on user identity shift

  const markAsRead = async (id) => {
    try {
       await api.post(`/notifications/${id}/read`);
       fetchNotifications();
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
       await api.post('/notifications/read-all');
       fetchNotifications();
       setIsOpen(false);
    } catch (e) { console.error(e); }
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}
      >
        <Bell size={22} color="var(--primary-color)" />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: '0px', right: '0px',
            background: 'var(--danger-color)', color: 'white',
            borderRadius: '50%', width: '18px', height: '18px',
            fontSize: '0.7rem', display: 'flex', justifyContent: 'center', alignItems: 'center',
            fontWeight: 800
          }}>
            {unreadCount}
          </div>
        )}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: '0', 
          width: '320px', background: 'white', 
          border: '1px solid var(--border-color)', borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100,
          maxHeight: '400px', overflowY: 'auto'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
             <strong style={{ color: 'var(--primary-color)' }}>Notifications</strong>
             {unreadCount > 0 && (
               <button onClick={markAllRead} style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Mark All Read</button>
             )}
          </div>
          
          {notifications.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No notifications securely traced.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notifications.map(n => (
                 <div 
                   key={n.id} 
                   onClick={() => markAsRead(n.id)}
                   style={{ 
                     padding: '12px 16px', 
                     borderBottom: '1px solid var(--border-color)',
                     background: n.is_read ? 'white' : 'rgba(59, 130, 246, 0.05)',
                     cursor: n.is_read ? 'default' : 'pointer'
                   }}
                 >
                    <p style={{ fontSize: '0.9rem', color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)', margin: 0, fontWeight: n.is_read ? 400 : 500 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                      {new Date(n.created_at + 'Z').toLocaleString()}
                    </span>
                 </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
