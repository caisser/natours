import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe(
  'pk_test_51LI1wiKUuPsYGSYSRI2to0S4TWNGYKIkvSsEocayJvePZpbYIli65fx27eSf8DySYpzAsuMi7v8bJkBs2vHWtpH100i4J63f6S'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/bookings/checkout-session/${tourId}`);
    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (error) {
    console.log(error);
    showAlert('error', error);
  }
};
