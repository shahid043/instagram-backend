import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import 'dotenv/config';
import Payment from '../models/Payment.js';
import config from '../config/config.js';

const router = express.Router();

const razorpayInstance = new Razorpay({
    key_id: config.key_id,
    key_secret: config.key_secret,
});

// ROUTE 1 : Create Order Api Using POST Method http://localhost:4000/api/payment/order
router.post('/order', (req, res) => {
    const { amount } = req.body;

    try {
        const options = {
            amount: Number(amount * 100),
            currency: "INR",
            receipt: crypto.randomBytes(10).toString("hex"),
        }
        
        razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: "Something Went Wrong!" });
            }
            res.status(200).json({ data: order });
            console.log(order)
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
        console.log(error);
    }
})

// ROUTE 2 : Create Verify Api Using POST Method http://localhost:4000/api/payment/verify
router.post('/verify', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // console.log("req.body", req.body);

    try {
        // Create Sign
        const sign = razorpay_order_id + "|" + razorpay_payment_id;

        // Create ExpectedSign
        const expectedSign = crypto.createHmac("sha256", config.key_id)
            .update(sign.toString())
            .digest("hex");

        // console.log(razorpay_signature === expectedSign);

        // Create isAuthentic
        const isAuthentic = expectedSign === razorpay_signature;

        // Condition 
        if (isAuthentic) {
            const payment = new Payment({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature
            });

            // Save Payment 
            await payment.save();

            // Send Message 
            res.json({
                message: "Payement Successfully"
            });
        }
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error!" });
        console.log(error);
    }
})

export default router