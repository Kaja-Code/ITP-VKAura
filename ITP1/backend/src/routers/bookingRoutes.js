// routes/bookingRoutes.js
import express from 'express';
import {
  bookPriest,
  cancelBooking,
  getUserBookings,
  getAllBookings,       // ← admin-only
} from '../controllers/bookingController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// every booking route now requires a valid token
router.use(protect);

// user routes
router.post('/', bookPriest);
router.put('/:id/cancel', cancelBooking);
router.get('/user', getUserBookings);

// admin-only: list all bookings
router.get('/', adminOnly, getAllBookings);

export default router;
