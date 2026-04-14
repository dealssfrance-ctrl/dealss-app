import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '../services/supabaseClient';
import './Traffic.css';

interface TrafficData {
  id: string;
  date: string;
  visits: number;
  pageViews: number;
  uniqueUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
}

const Traffic = () => {
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrafficData();
  }, []);

  const fetchTrafficData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('traffic_data').select('*').order('date', { ascending: true });
      if (error) throw error;
      setTrafficData((data || []).map((r: any) => ({
        id: r.id, date: r.date, visits: r.visits, pageViews: r.page_views,
        uniqueUsers: r.unique_users, bounceRate: r.bounce_rate, avgSessionDuration: r.avg_session_duration,
      })));
    } catch (error) {
      console.error('Error fetching traffic data:', error);
      setError('Failed to fetch traffic data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="text-center">
      <div className="sk-spinner sk-spinner-wave">
        <div className="sk-rect1"></div>
        <div className="sk-rect2"></div>
        <div className="sk-rect3"></div>
        <div className="sk-rect4"></div>
        <div className="sk-rect5"></div>
      </div>
      <p>Loading traffic data...</p>
    </div>
  );

  if (error) return (
    <div className="alert alert-danger">
      <i className="fa fa-exclamation-triangle"></i> {error}
    </div>
  );

  return (
    <div className="wrapper wrapper-content animated fadeInRight">
      <div className="row">
        <div className="col-lg-12">
          <h1>Traffic Analytics</h1>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-6">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Visits Over Time</h5>
            </div>
            <div className="ibox-content">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trafficData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="visits" stroke="#1ab394" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Page Views vs Unique Users</h5>
            </div>
            <div className="ibox-content">
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trafficData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="pageViews" fill="#1ab394" />
                    <Bar dataKey="uniqueUsers" fill="#23c6c8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-lg-12">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Traffic Summary</h5>
            </div>
            <div className="ibox-content">
              <div className="table-responsive">
                <table className="table table-striped table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Visits</th>
                      <th>Page Views</th>
                      <th>Unique Users</th>
                      <th>Bounce Rate</th>
                      <th>Avg Session Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trafficData.map(data => (
                      <tr key={data.id}>
                        <td>{new Date(data.date).toLocaleDateString()}</td>
                        <td>{data.visits}</td>
                        <td>{data.pageViews}</td>
                        <td>{data.uniqueUsers}</td>
                        <td>{(data.bounceRate * 100).toFixed(1)}%</td>
                        <td>{Math.floor(data.avgSessionDuration / 60)}m {data.avgSessionDuration % 60}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Traffic;