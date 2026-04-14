import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '../services/supabaseClient';

interface Stats {
  totalUsers: number;
  totalOffers: number;
  totalTraffic: number;
  totalConversations: number;
  totalMessages: number;
  growth: number;
}

interface CategoryData {
  category: string;
  count: number;
}

interface StatusData {
  status: string;
  count: number;
}

interface TrafficPoint {
  date: string;
  visits: number;
  pageViews: number;
  uniqueUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
}

const COLORS = ['#1ab394', '#1c84c6', '#f8ac59', '#ed5565', '#23c6c8', '#ab47bc'];

const Statistics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Stats
        const [usersRes, offersRes, trafficRes, convsRes, msgsRes] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('offers').select('id', { count: 'exact', head: true }),
          supabase.from('traffic_data').select('visits'),
          supabase.from('conversations').select('id', { count: 'exact', head: true }),
          supabase.from('messages').select('id', { count: 'exact', head: true }),
        ]);
        const totalTraffic = (trafficRes.data || []).reduce((sum: number, d: any) => sum + d.visits, 0);
        const { data: allTraffic } = await supabase.from('traffic_data').select('date,visits').order('date', { ascending: true });
        let growth = 0;
        if (allTraffic && allTraffic.length >= 14) {
          const recent7 = allTraffic.slice(-7).reduce((s: number, d: any) => s + d.visits, 0);
          const prev7 = allTraffic.slice(-14, -7).reduce((s: number, d: any) => s + d.visits, 0);
          growth = prev7 > 0 ? Math.round(((recent7 - prev7) / prev7) * 1000) / 10 : 0;
        }
        setStats({
          totalUsers: usersRes.count || 0, totalOffers: offersRes.count || 0, totalTraffic,
          totalConversations: convsRes.count || 0, totalMessages: msgsRes.count || 0, growth,
        });

        // Categories
        const { data: allOffers } = await supabase.from('offers').select('category');
        const catMap: Record<string, number> = {};
        (allOffers || []).forEach((o: any) => { catMap[o.category] = (catMap[o.category] || 0) + 1; });
        setCategories(Object.entries(catMap).map(([category, count]) => ({ category, count })));

        // Status
        const { data: allOffersStatus } = await supabase.from('offers').select('status');
        const statusMap: Record<string, number> = {};
        (allOffersStatus || []).forEach((o: any) => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
        setStatusData(Object.entries(statusMap).map(([status, count]) => ({ status, count })));

        // Traffic chart
        const { data: trafficChart } = await supabase.from('traffic_data').select('*').order('date', { ascending: true });
        setTraffic((trafficChart || []).map((d: any) => ({
          date: d.date, visits: d.visits, pageViews: d.page_views,
          uniqueUsers: d.unique_users, bounceRate: d.bounce_rate, avgSessionDuration: d.avg_session_duration,
        })));
      } catch (err) {
        console.error('Error loading statistics:', err);
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
      {/* Stats Summary */}
      <div className="row">
        <div className="col-lg-3">
          <div className="ibox">
            <div className="ibox-content" style={{ textAlign: 'center' }}>
              <i className="fa fa-users" style={{ fontSize: '40px', color: '#1ab394' }}></i>
              <h1 className="no-margins m-t-sm">{stats?.totalUsers || 0}</h1>
              <small className="text-muted">Users</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="ibox">
            <div className="ibox-content" style={{ textAlign: 'center' }}>
              <i className="fa fa-tag" style={{ fontSize: '40px', color: '#1c84c6' }}></i>
              <h1 className="no-margins m-t-sm">{stats?.totalOffers || 0}</h1>
              <small className="text-muted">Offers</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="ibox">
            <div className="ibox-content" style={{ textAlign: 'center' }}>
              <i className="fa fa-eye" style={{ fontSize: '40px', color: '#f8ac59' }}></i>
              <h1 className="no-margins m-t-sm">{stats?.totalTraffic?.toLocaleString() || 0}</h1>
              <small className="text-muted">Total Visits</small>
            </div>
          </div>
        </div>
        <div className="col-lg-3">
          <div className="ibox">
            <div className="ibox-content" style={{ textAlign: 'center' }}>
              <i className="fa fa-line-chart" style={{ fontSize: '40px', color: '#ed5565' }}></i>
              <h1 className="no-margins m-t-sm text-navy">+{stats?.growth || 0}%</h1>
              <small className="text-muted">Growth</small>
            </div>
          </div>
        </div>
      </div>

      {/* Offers by Category (Bar) + Offers by Status (Pie) */}
      <div className="row">
        <div className="col-lg-6">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Offers by Category</h5>
            </div>
            <div className="ibox-content">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1ab394" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Offers by Status</h5>
            </div>
            <div className="ibox-content">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic: Visits + Unique Users Line Chart */}
      <div className="row">
        <div className="col-lg-12">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Traffic Overview</h5>
            </div>
            <div className="ibox-content">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={traffic}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="visits" stroke="#1ab394" strokeWidth={2} name="Visits" />
                  <Line type="monotone" dataKey="uniqueUsers" stroke="#1c84c6" strokeWidth={2} name="Unique Users" />
                  <Line type="monotone" dataKey="pageViews" stroke="#f8ac59" strokeWidth={2} name="Page Views" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Details Table */}
      <div className="row">
        <div className="col-lg-12">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Traffic Details</h5>
            </div>
            <div className="ibox-content">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Visits</th>
                    <th>Page Views</th>
                    <th>Unique Users</th>
                    <th>Bounce Rate</th>
                    <th>Avg. Session</th>
                  </tr>
                </thead>
                <tbody>
                  {traffic.map((t, i) => (
                    <tr key={i}>
                      <td>{t.date}</td>
                      <td>{t.visits.toLocaleString()}</td>
                      <td>{t.pageViews.toLocaleString()}</td>
                      <td>{t.uniqueUsers.toLocaleString()}</td>
                      <td>{(t.bounceRate * 100).toFixed(1)}%</td>
                      <td>{Math.round(t.avgSessionDuration / 60)}m {t.avgSessionDuration % 60}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
