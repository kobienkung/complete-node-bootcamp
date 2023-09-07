/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  const stripe = Stripe(
    'pk_test_51NmAGuL6zyjmHBvBKipfQajxwVXVrlbXHDKbIwRQQBGF8thg8bjhOf63ywyQzRk5mXNLLzQ8UOlskJmT53wgq2lI00BPbYVPTy',
  ); // Stripe got from script(src='https://js.stripe.com/v3/') (base.pug) and use public key

  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
    );
    console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
    // res.redirect(303, session.url);
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
