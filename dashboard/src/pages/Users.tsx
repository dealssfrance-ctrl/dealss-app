import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('id,email,name,created_at,updated_at');
      if (error) throw error;
      setUsers((data || []).map((r: any) => ({ id: r.id, name: r.name, email: r.email, createdAt: r.created_at, updatedAt: r.updated_at })));
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', password: '' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '' });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email) {
      setError('Name and email are required');
      return;
    }
    try {
      if (editingUser) {
        await supabase.from('users').update({ name: form.name, email: form.email, updated_at: new Date().toISOString() }).eq('id', editingUser.id);
      } else {
        const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const now = new Date().toISOString();
        await supabase.from('users').insert({ id, name: form.name, email: form.email, password: form.password || 'default123', created_at: now, updated_at: now });
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await supabase.from('users').delete().eq('id', id);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  if (loading) {
    return (
      <div className="sk-spinner-wave">
        <div className="sk-rect1"></div><div className="sk-rect2"></div><div className="sk-rect3"></div>
        <div className="sk-rect4"></div><div className="sk-rect5"></div>
      </div>
    );
  }

  return (
    <div className="animated fadeInRight">
      <div className="row">
        <div className="col-lg-12">
          <div className="ibox">
            <div className="ibox-title">
              <h5>Users Management</h5>
              <div className="ibox-tools">
                <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                  <i className="fa fa-plus"></i> Add User
                </button>
              </div>
            </div>
            <div className="ibox-content">
              <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-white btn-xs" onClick={() => openEditModal(user)} style={{ marginRight: '5px' }}>
                          <i className="fa fa-pencil"></i> Edit
                        </button>
                        <button className="btn btn-white btn-xs" onClick={() => handleDelete(user.id)} style={{ color: '#ed5565' }}>
                          <i className="fa fa-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center' }} className="text-muted">No users found</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '4px', padding: '25px', width: '450px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            {error && <div className="alert alert-danger">{error}</div>}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Name</label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Email</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px' }}
              />
            </div>
            {!editingUser && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="default123"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-white" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {editingUser ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
