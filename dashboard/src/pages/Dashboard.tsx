import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Stats {
  totalUsers: number;
  totalOffers: number;
  totalTraffic: number;
  totalConversations: number;
  totalMessages: number;
  growth: number;
}

interface TrafficPoint {
  date: string;
  visits: number;
  pageViews: number;
  uniqueUsers: number;
}

interface Activity {
  type: string;
  id: string;
  message: string;
  date: string;
  user: string;
}

interface CategoryData {
  category: string;
  count: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, trafficRes, activityRes, catRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/dashboard/traffic-chart`),
          axios.get(`${API}/dashboard/recent-activity`),
          axios.get(`${API}/dashboard/offers-by-category`)
        ]);
        setStats(statsRes.data.data);
        setTraffic(trafficRes.data.data);
        setActivity(activityRes.data.data);
        setCategories(catRes.data.data);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="sk-spinner-wave">
        <div className="sk-rect1"></div>
        <div className="sk-rect2"></div>
        <div className="sk-rect3"></div>
        <div className="sk-rect4"></div>
        <div className="sk-rect5"></div>
      </div>
    );
  }

  return (
    <div className="animated fadeInRight">
      {/* Stats Row */}
      <div className="row">
        <div className="col-lg-3">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Total Users</h5>
            </div>
            <div className="ibox-content">
              <h1 className="no-margins">{stats?.totalUsers || 0}</h1>
              <small className="text-muted">Registered users</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Total Offers</h5>
            </div>
            <div className="ibox-content">
              <h1 className="no-margins">{stats?.totalOffers || 0}</h1>
              <small className="text-muted">Published offers</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Total Traffic</h5>
            </div>
            <div className="ibox-content">
              <h1 className="no-margins">{stats?.totalTraffic?.toLocaleString() || 0}</h1>
              <small className="text-muted">Total visits</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Growth</h5>
            </div>
            <div className="ibox-content">
              <h1 className="no-margins text-navy">+{stats?.growth || 0}%</h1>
              <small className="text-muted">This month</small>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Chart */}
      <div className="row">
        <div className="col-lg-12">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Site Traffic</h5>
            </div>
            <div className="ibox-content">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={traffic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="visits" stroke="#1ab394" fill="#1ab394" fillOpacity={0.3} name="Visits" />
                  <Area type="monotone" dataKey="pageViews" stroke="#1c84c6" fill="#1c84c6" fillOpacity={0.2} name="Page Views" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Categories + Activity */}
      <div className="row">
        <div className="col-lg-6">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Offers by Category</h5>
            </div>
            <div className="ibox-content">
              <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Offers</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, i) => (
                    <tr key={i}>
                      <td>{cat.category}</td>
                      <td><span className="label label-primary">{cat.count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Recent Activity</h5>
            </div>
            <div className="ibox-content">
              {activity.length === 0 ? (
                <p className="text-muted">No recent activity</p>
              ) : (
                <div>
                  {activity.map((item, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < activity.length - 1 ? '1px solid #e7eaec' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className={`fa ${item.type === 'offer' ? 'fa-tag text-navy' : 'fa-user text-primary'}`}></i>
                        <div>
                          <strong>{item.message}</strong>
                          <br />
                          <small className="text-muted">
                            by {item.user} - {new Date(item.date).toLocaleDateString()}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
