import express from 
'express';
import authRouter from './routes/auth.routes.js';
import postRouter from './routes/post.routes.js';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import payment from './routes/payment.routes.js'


const app = express();


app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());
const allowedOrigins = [
  "http://localhost:5173",
  "https://instagram-frontend-462oyll3z-shaddyxx.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));


app.use("/api/auth", authRouter);
app.use('/api/posts', postRouter);

//* Available Route 
app.get('/payment', (req, res) => {
    res.send('Razorpay Payment Gateway Using React And Node Js')
});
app.use('/api/payment', payment);


export default app;
