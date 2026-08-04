import Razorpay from 'razorpay';
import config from './config.js';

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_TEST_API_KEY,
  key_secret: config.RAZORPAY_TEST_SECRET_KEY,
});


export default razorpay;
