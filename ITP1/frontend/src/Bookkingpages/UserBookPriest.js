
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import UserComponent from '../Component/Usercomponent';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';

const UserBookPriest = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // form state
  const [event, setEvent] = useState('');
  const [date, setDate] = useState('');
  const [availablePriests, setAvailablePriests] = useState([]);
  const [selectedPriest, setSelectedPriest] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  // 1) Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // 2) Set the Authorization header for all axios calls
  useEffect(() => {
    console.log(user);
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
      }
    }
  }, [user]);

  // Helpers to enforce 7–60 days range
  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };
  const getMaxDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().split('T')[0];
  };

  // Fetch priests available on `date`
  const fetchAvailablePriests = async () => {
    setError('');
    if (!date) {
      setError('Please select a date first!');
      return;
    }
    const selected = new Date(date);
    if (selected < new Date(getMinDate()) || selected > new Date(getMaxDate())) {
      setError('Date must be between 7 and 60 days from today.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/priests/available?date=${date}`);
      setAvailablePriests(res.data);
      setAvailabilityChecked(true);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch available priests.');
    } finally {
      setLoading(false);
    }
  };

  // Handle the booking submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!event || event.length <= 5) {
      setError('Event name must be more than 5 characters.');
      return;
    }
    if (!date || !selectedPriest) {
      setError('Please select a date and a priest.');
      return;
    }
    if (!user) {
      setError('You must be logged in to book.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/bookings', {
        priestId: selectedPriest,
        event,
        date,
      });
      // Navigate to the bookings list after success
      navigate('/user/booking-list');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <p>Loading...</p>;
  if (!user) return null; // Redirect in useEffect

  return (
    <div style={{ padding: '20px' }}>
      <UserComponent user={user} />

      <div
        className="user-book-priest-container"
        style={{
          backgroundColor: 'rgba(255, 250, 250, 0.8)',
          padding: '20px',
          borderRadius: '10px',
          maxWidth: '600px',
          margin: '40px auto',
        }}
      >
        <h2 style={{ textAlign: 'center', color: '#374495' }}>
          Book a Priest
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Event Select */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold' }}>Event:</label>
            <select
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              required
              style={{
                marginLeft: '10px',
                padding: '8px',
                borderRadius: '5px',
                border: '1px solid #ccc',
                width: '100%',
              }}
            >
              <option value="">-- Select an Event --</option>
              <option value="Wedding">Wedding</option>
              <option value="Housewarming (Griha Pravesh)">
                Housewarming (Griha Pravesh)
              </option>
              <option value="Ganesha Pooja">Ganesha Pooja</option>
              <option value="Sathyanarayana Pooja">Sathyanarayana Pooja</option>
              <option value="Durga Pooja">Durga Pooja</option>
              <option value="Naming Ceremony (Namakarana)">
                Naming Ceremony (Namakarana)
              </option>
              <option value="Thread Ceremony (Upanayana)">
                Thread Ceremony (Upanayana)
              </option>
              <option value="Shraddha Ceremony">Shraddha Ceremony</option>
              <option value="Annaprashana (First Rice Ceremony)">
                Annaprashana (First Rice Ceremony)
              </option>
              <option value="Karthigai Deepam">Karthigai Deepam</option>
              <option value="Ayudha Pooja">Ayudha Pooja</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Date Picker */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: 'bold' }}>Date:</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={getMinDate()}
              max={getMaxDate()}
              required
              style={{
                marginLeft: '10px',
                padding: '8px',
                borderRadius: '5px',
                border: '1px solid #ccc',
                width: '100%',
              }}
            />
          </div>

          {/* Check Availability */}
          <button
            type="button"
            onClick={fetchAvailablePriests}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginBottom: '20px',
            }}
          >
            {loading ? 'Checking…' : 'Check Availability'}
          </button>

          {availabilityChecked && availablePriests.length === 0 && (
            <p>No priests available on that date.</p>
          )}

          {/* Available Priests Table */}
          {availablePriests.length > 0 && (
            <>
              <h3>Available Priests</h3>
              <table style={{ width: '100%', marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Name</th>
                    <th>Daily Charge</th>
                    <th>Select</th>
                  </tr>
                </thead>
                <tbody>
                  {availablePriests.map((priest) => (
                    <tr key={priest._id}>
                      <td>
                        <img
                          src={`http://localhost:5000${priest.photo}`}
                          alt={priest.name}
                          width="50"
                        />
                      </td>
                      <td>{priest.name}</td>
                      <td>${priest.dailyCharge}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedPriest(priest._id)}
                          style={{
                            backgroundColor:
                              selectedPriest === priest._id ? '#28a745' : '',
                            color: 'white',
                            padding: '5px 10px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          {selectedPriest === priest._id
                            ? 'Selected'
                            : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Final Submit */}
              <button
                type="submit"
                disabled={loading || !selectedPriest}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: selectedPriest ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? 'Booking…' : 'Book Priest'}
              </button>
            </>
          )}
        </form>

        {error && (
          <p style={{ color: 'red', marginTop: '15px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Back to Home */}
        <button
          onClick={() => navigate('/user-home')}
          style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          ⬅ Back to Home
        </button>
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', marginTop: '40px' }}>
        <p>&copy; 2025 VK Aura. All rights reserved.</p>
        <div style={{ fontSize: '24px' }}>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><FaFacebook /></a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><FaTwitter /></a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><FaLinkedin /></a>
        </div>
      </footer>
    </div>
  );
};

export default UserBookPriest;
