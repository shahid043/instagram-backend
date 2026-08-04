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
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
)


app.use("/api/auth", authRouter);
app.use('/api/posts', postRouter);

//* Available Route 
app.get('/payment', (req, res) => {
    res.send('Razorpay Payment Gateway Using React And Node Js')
});
app.use('/api/payment', payment);


export default app;