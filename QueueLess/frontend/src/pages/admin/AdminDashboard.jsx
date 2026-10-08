import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatWaitDuration } from '../../utils/timeUtils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area
} from 'recharts';
import { 
  Activity, Users, CheckCircle, TrendingUp, 
  MapPin, BrainCircuit, ActivitySquare, AlertTriangle, Clock 
} from 'lucide-react';

const COLORS = ['#0c3b7a', '#fb923c', '#10b981', '#3b82f6', '#8b5cf6'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [mlMetrics, setMlMetrics] = useState(null);
  
  useEffect(() => {
    // Parallel fetching for high-performance dashboards
    Promise.all([
      api.get('/admin/analytics'),
      api.get('/admin/model-metrics')
    ]).then(([analyticsRes, mlRes]) => {
      setAnalytics(analyticsRes.data);
      setMlMetrics(mlRes.data);
    }).catch(console.error);
  }, []);

  if (!analytics || !mlMetrics) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading Admin Algorithms...</div>;
  }

  const { kpis, charts } = analytics;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)', paddingBottom: '60px' }}>
      
      {/* Top Bar */}
      <div style={{ background: '#0f172a', color: 'white', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ActivitySquare size={20} color="var(--accent-color)" /> TokenGo Global Command Center
        </h1>
        <button className="btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => navigate('/')}>Exit Admin</button>
      </div>

      <div className="container" style={{ marginTop: '30px' }}>
        
        {/* ML Prediction Band */}
        <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginBottom: '30px', display: 'flex', gap: '40px', alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingRight: '40px', borderRight: '1px solid var(--border-color)' }}>
              <div style={{ width: '50px', height: '50px', background: 'rgba(12, 59, 122, 0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                 <BrainCircuit size={28} color="var(--primary-color)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>AI Prediction Architecture</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--success-color)' }}>Random Forest Regressor Online</span>
              </div>
           </div>
           
           <div style={{ display: 'flex', gap: '30px', flex: 1, justifyContent: 'space-around' }}>
             <div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mean Absolute Error (MAE)</div>
               <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{mlMetrics.MAE} <span style={{fontSize:'0.9rem', color: 'var(--text-secondary)', fontWeight: 400}}>min</span></div>
             </div>
             <div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>RMSE Constraint</div>
               <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{mlMetrics.RMSE} <span style={{fontSize:'0.9rem', color: 'var(--text-secondary)', fontWeight: 400}}>min</span></div>
             </div>
             <div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>R² Correlation Score</div>
               <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-color)' }}>{mlMetrics.R2_Score}</div>
             </div>
           </div>
        </div>

        {/* Primary KPIs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          
          <div className="card">
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL TOKENS GENERATED</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>{kpis.total_tokens}</div>
          </div>
          
          <div className="card">
            <span style={{ fontSize: '0.9rem', color: 'var(--warning-color)', fontWeight: 600 }}>CURRENTLY WAITING</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>{kpis.waiting_tokens}</div>
          </div>
          
          <div className="card">
            <span style={{ fontSize: '0.9rem', color: 'var(--success-color)', fontWeight: 600 }}>COMPLETED TRANSACTIONS</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>{kpis.completed_tokens}</div>
          </div>
          
          <div className="card">
            <span style={{ fontSize: '0.9rem', color: 'var(--danger-color)', fontWeight: 600 }}>ABANDONMENT RATE</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>{kpis.no_show_rate}%</div>
          </div>

        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
           <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <Clock size={32} color="var(--primary-color)" />
             <div>
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Avg Wait Time</div>
               <strong style={{ fontSize: '1.3rem' }}>{formatWaitDuration(kpis.avg_wait_minutes)}</strong>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Median: {formatWaitDuration(kpis.median_wait_minutes)} | P95: {formatWaitDuration(kpis.p95_wait_minutes)}</div>
             </div>
           </div>
           
           <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <Activity size={32} color="var(--primary-color)" />
             <div>
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Avg Service Duration</div>
               <strong style={{ fontSize: '1.3rem' }}>{formatWaitDuration(kpis.avg_service_minutes)}</strong>
             </div>
           </div>
           
           <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <TrendingUp size={32} color="var(--success-color)" />
             <div>
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Queue Throughput</div>
               <strong style={{ fontSize: '1.3rem' }}>{kpis.throughput_per_hour} / hr</strong>
             </div>
           </div>
           
           <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <MapPin size={32} color="var(--warning-color)" />
             <div>
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Peak Utilization Hour</div>
               <strong style={{ fontSize: '1.3rem' }}>{kpis.peak_hour}</strong>
             </div>
           </div>
           
           <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <Users size={32} color="var(--accent-color)" />
             <div>
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Counter Utilization</div>
               <strong style={{ fontSize: '1.3rem' }}>{kpis.counter_utilization}%</strong>
             </div>
           </div>
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          
          {/* Daily Trend Dual Line */}
          <div className="card" style={{ gridColumn: '1 / -1', height: '400px' }}>
             <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Queue Volume vs Machine Predicted Wait Times</h3>
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={charts.daily_trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" orientation="left" stroke="var(--primary-color)" />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--accent-color)" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="tokens" name="Total Volume" stroke="var(--primary-color)" fillOpacity={1} fill="url(#colorTokens)" />
                  <Line yAxisId="right" type="monotone" dataKey="avg_wait" name="Average Wait (mins)" stroke="var(--accent-color)" strokeWidth={3} />
                </ComposedChart>
             </ResponsiveContainer>
          </div>

          <div className="card" style={{ height: '350px' }}>
             <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Office Load Distribution</h3>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={charts.office_volume} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey="name" />
                 <YAxis />
                 <Tooltip />
                 <Bar dataKey="value" name="Total Tokens" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>

          <div className="card" style={{ height: '350px' }}>
             <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>Service Demand Splitting</h3>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={charts.service_volume}
                   cx="50%"
                   cy="50%"
                   labelLine={false}
                   outerRadius={100}
                   fill="#8884d8"
                   dataKey="value"
                   label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                 >
                   {charts.service_volume.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
