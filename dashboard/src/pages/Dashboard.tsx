import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../services/supabaseClient';

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
          totalUsers: usersRes.count || 0,
          totalOffers: offersRes.count || 0,
          totalTraffic,
          totalConversations: convsRes.count || 0,
          totalMessages: msgsRes.count || 0,
          growth,
        });

        // Traffic chart
        const { data: trafficChart } = await supabase.from('traffic_data').select('date,visits,page_views,unique_users').order('date', { ascending: true });
        setTraffic((trafficChart || []).map((d: any) => ({ date: d.date, visits: d.visits, pageViews: d.page_views, uniqueUsers: d.unique_users })));

        // Recent activity
        const { data: recentOffers } = await supabase.from('offers').select('id,store_name,user_name,created_at').order('created_at', { ascending: false }).limit(5);
        const { data: recentUsers } = await supabase.from('users').select('id,name,created_at').order('created_at', { ascending: false }).limit(5);
        const activityItems: Activity[] = [
          ...(recentOffers || []).map((o: any) => ({ type: 'offer', id: o.id, message: `New offer: ${o.store_name}`, date: o.created_at, user: o.user_name || 'Unknown' })),
          ...(recentUsers || []).map((u: any) => ({ type: 'user', id: u.id, message: `New user: ${u.name}`, date: u.created_at, user: u.name })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
        setActivity(activityItems);

        // Categories
        const { data: allOffers } = await supabase.from('offers').select('category');
        const catMap: Record<string, number> = {};
        (allOffers || []).forEach((o: any) => { catMap[o.category] = (catMap[o.category] || 0) + 1; });
        setCategories(Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));
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
