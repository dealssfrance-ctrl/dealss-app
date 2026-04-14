import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface Offer {
  id: string;
  storeName: string;
  discount: string;
  description: string;
  category: string;
  imageUrl: string;
  status: string;
  userId: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

const Offers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    storeName: '',
    discount: '',
    description: '',
    category: '',
    imageUrl: '',
    status: 'active' as string
  });
  const [error, setError] = useState('');

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setOffers((data || []).map((r: any) => ({
        id: r.id, storeName: r.store_name, discount: r.discount, description: r.description,
        category: r.category, imageUrl: r.image_url, status: r.status, userId: r.user_id,
        userName: r.user_name, createdAt: r.created_at, updatedAt: r.updated_at,
      })));
    } catch (err) {
      console.error('Error fetching offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('offers').select('category');
      const cats = Array.from(new Set((data || []).map((r: any) => r.category))).sort() as string[];
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchOffers();
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingOffer(null);
    setForm({ storeName: '', discount: '', description: '', category: '', imageUrl: '', status: 'active' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setForm({
      storeName: offer.storeName,
      discount: offer.discount,
      description: offer.description,
      category: offer.category,
      imageUrl: offer.imageUrl,
      status: offer.status
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.storeName || !form.discount || !form.description || !form.category) {
      setError('Store name, discount, description, and category are required');
      return;
    }
    try {
      if (editingOffer) {
        await supabase.from('offers').update({
          store_name: form.storeName, discount: form.discount, description: form.description,
          category: form.category, image_url: form.imageUrl, status: form.status,
          updated_at: new Date().toISOString(),
        }).eq('id', editingOffer.id);
      } else {
        const id = `offer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const now = new Date().toISOString();
        await supabase.from('offers').insert({
          id, store_name: form.storeName, discount: form.discount, description: form.description,
          category: form.category, image_url: form.imageUrl, status: form.status || 'active',
          user_id: '1', user_name: 'Admin', created_at: now, updated_at: now,
        });
      }
      setShowModal(false);
      fetchOffers();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    try {
      await supabase.from('offers').delete().eq('id', id);
      fetchOffers();
    } catch (err) {
      console.error('Error deleting offer:', err);
    }
  };

  const toggleStatus = async (offer: Offer) => {
    const newStatus = offer.status === 'active' ? 'inactive' : 'active';
    try {
      await supabase.from('offers').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', offer.id);
      fetchOffers();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'label-primary';
      case 'inactive': return 'label-warning';
      case 'pending': return 'label-danger';
      default: return 'label-primary';
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
              <h5>Offers Management</h5>
              <div className="ibox-tools">
                <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                  <i className="fa fa-plus"></i> Add Offer
                </button>
              </div>
            </div>
            <div className="ibox-content">
              <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th>Discount</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map(offer => (
                    <tr key={offer.id}>
                      <td><strong>{offer.storeName}</strong><br /><small className="text-muted">{offer.description}</small></td>
                      <td><span className="text-navy font-bold">{offer.discount}</span></td>
                      <td>{offer.category}</td>
                      <td>
                        <span className={`label ${getStatusLabel(offer.status)}`} onClick={() => toggleStatus(offer)} style={{ cursor: 'pointer' }}>
                          {offer.status}
                        </span>
                      </td>
                      <td>{new Date(offer.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-white btn-xs" onClick={() => openEditModal(offer)} style={{ marginRight: '5px' }}>
                          <i className="fa fa-pencil"></i> Edit
                        </button>
                        <button className="btn btn-white btn-xs" onClick={() => handleDelete(offer.id)} style={{ color: '#ed5565' }}>
                          <i className="fa fa-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {offers.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center' }} className="text-muted">No offers found</td></tr>
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
          <div style={{ backgroundColor: '#fff', borderRadius: '4px', padding: '25px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600 }}>
              {editingOffer ? 'Edit Offer' : 'Add New Offer'}
            </h3>
            {error && <div className="alert alert-danger">{error}</div>}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Store Name</label>
              <input type="text" value={form.storeName} onChange={e => setForm({ ...form, storeName: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Discount</label>
              <input type="text" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })}
                placeholder="-20%" style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3} style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px', resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px' }}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="Fashion">Fashion</option>
                <option value="Food">Food</option>
                <option value="Sports">Sports</option>
                <option value="Electronics">Electronics</option>
                <option value="Beauty">Beauty</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Image URL</label>
              <input type="text" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px' }} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #e5e6e7', borderRadius: '3px' }}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-white" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {editingOffer ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Offers;
