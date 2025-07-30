// src/pages/AdminBookingList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Adminnaviagtion from '../Component/Adminnavigation';

const AdminBookingList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriest, setSelectedPriest] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  // 1) Redirect non‑admins
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (!user.isAdmin) {
        navigate('/login');
      }
    }
  }, [authLoading, user, navigate]);

  // 2) Attach token to all axios requests
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }
  }, [user]);

  // 3) Fetch all bookings (admin)
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/bookings');
      setBookings(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchBookings();
    }
  }, [user]);

  // 4) Filter & sort whenever inputs or raw bookings change
  useEffect(() => {
    let f = [...bookings];

    // only future bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    f = f.filter(b => new Date(b.date) > today);

    if (searchQuery) {
      f = f.filter(b =>
        b.priest?.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }

    if (selectedPriest) {
      f = f.filter(b => b.priest?._id === selectedPriest);
    }

    if (selectedDate) {
      const target = new Date(selectedDate).toLocaleDateString();
      f = f.filter(
        b => new Date(b.date).toLocaleDateString() === target
      );
    }

    f.sort((a, b) => new Date(a.date) - new Date(b.date));
    setFilteredBookings(f);
  }, [bookings, searchQuery, selectedPriest, selectedDate]);

  // 5) Unique priest list for dropdown
  const priestOptions = bookings
    .map(b => b.priest)
    .filter(p => p != null)
    .reduce((acc, p) => {
      if (!acc.some(x => x._id === p._id)) acc.push(p);
      return acc;
    }, []);

  // 6) Cancel booking (admin or owner)
  const handleCancel = async id => {
    try {
      await axios.put(
        `http://localhost:5000/api/bookings/${id}/cancel`
      );
      alert('Booking cancelled');
      fetchBookings();
    } catch (err) {
      console.error(err);
      alert(err.response?.data.message || 'Error cancelling');
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#fff',
        minHeight: '100vh',
        color: '#000',
        marginLeft: '150px',
      }}
    >
      <Adminnaviagtion />
      <div style={{ padding: '40px 20px', maxWidth: '1000px' }}>
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#374495',
            textAlign: 'center',
            marginBottom: '30px',
          }}
        >
          Admin — Booking Details
        </h1>

        <div
          style={{
            display: 'flex',
            gap: '20px',
            flexWrap: 'wrap',
            marginBottom: '30px',
          }}
        >
          <div style={{ flex: '1 1 30%' }}>
            <label style={{ fontWeight: 'bold' }}>
              Search Priest by Name:
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Enter priest name"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
            />
          </div>

          <div style={{ flex: '1 1 30%' }}>
            <label style={{ fontWeight: 'bold' }}>
              Select Priest:
            </label>
            <select
              value={selectedPriest}
              onChange={e => setSelectedPriest(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
            >
              <option value="">-- All Priests --</option>
              {priestOptions.map(p => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 30%' }}>
            <label style={{ fontWeight: 'bold' }}>
              Select Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ccc',
              }}
            />
          </div>
        </div>

        {loading && <p>Loading bookings...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {filteredBookings.length === 0 && !loading ? (
          <p>No bookings match these filters.</p>
        ) : (
          filteredBookings.map(b => (
            <div
              key={b._id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f9f9f9',
                minHeight: '150px',
              }}
            >
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 10px' }}>{b.event}</h4>
                <p>
                  <strong>Date:</strong>{' '}
                  {new Date(b.date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Priest:</strong> {b.priest?.name || 'N/A'}
                </p>
                <p>
                  <strong>User:</strong>{' '}
                  {b.user?.name
                    ? `${b.user.name} (${b.user.email})`
                    : 'N/A'}
                </p>
                <p>
                  <strong>Status:</strong> {b.status}
                </p>
              </div>
              <div>
                {b.status === 'Booked' && (
                  <button
                    onClick={() => handleCancel(b._id)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      padding: '10px 15px',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminBookingList;
