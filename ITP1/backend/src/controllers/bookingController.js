// controllers/bookingController.js
import Booking from '../models/Booking.js';
import Priest from '../models/Priest.js';

// POST /api/bookings
export const bookPriest = async (req, res) => {
  try {
    const { priestId, event, date } = req.body;
    const userId = req.user._id;        // ← real user ID

    const priest = await Priest.findById(priestId);
    if (!priest) return res.status(404).json({ message: 'Priest not found' });

    const eventDate = new Date(date);
    const now = new Date();
    const sevenDays = new Date(now);
    const twoMonths = new Date(now);
    sevenDays.setDate(now.getDate() + 7);
    twoMonths.setMonth(now.getMonth() + 2);

    if (eventDate < sevenDays)
      return res.status(400).json({ message: 'Must book ≥7 days in advance' });
    if (eventDate > twoMonths)
      return res.status(400).json({ message: 'Cannot book >2 months out' });

    const iso = eventDate.toISOString();
    if (priest.unavailableDates.some(d => new Date(d).toISOString() === iso)) {
      return res.status(400).json({ message: 'Priest unavailable on this date' });
    }

    const booking = new Booking({
      user: userId,
      priest: priestId,
      event,
      date: eventDate,
      status: 'Booked'
    });
    await booking.save();

    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT /api/bookings/:id/cancel
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // allow cancellation if owner OR admin
    const isOwner = booking.user.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }

    // your existing 7‑day cutoff logic
    const diffDays = (booking.date - new Date()) / (1000*60*60*24);
    if (diffDays < 7) {
      return res
        .status(400)
        .json({ message: 'Cancellations must be at least 7 days before the event' });
    }

    booking.status = 'Cancelled';
    await booking.save();
    res.json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/bookings/user
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking
      .find({ user: req.user._id })
      .populate('priest');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/bookings  (admin only)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate('priest user');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
