import process from 'node:process';
import { Server } from 'socket.io';
import connectDB from './DB/connection.js';
import cors from 'cors'; // ✅ أضف هذا

import { globalErrorHandling } from './middlewares/ErrorHandling.js';
import courseRouter from './routes/course.routes.js';
import careeerResourceRouter from './routes/careerResource.routes.js';
import careeerResourceCategoriesRouter from './routes/careerResourceCategories.routes.js';
import degreeRouter from './routes/degree.routes.js';
import instructorRouter from './routes/instructor.routes.js';
import successStoryRouter from './routes/successStory.routes.js';
import notificationRouter from './routes/notification.routes.js';
// import paymentRoutes from './routes/payment.routes.js'
import reviewRouter from './routes/review.routes.js';
import userRouter from './routes/user.routes.js';

let io;

export const initApp = (app, express) => {
  // ✅ تفعيل CORS في البداية
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }));


  // Convert Buffer Data
  app.use(express.json({}));

  // Setup API Routing
  app.use(`/user`, userRouter);
  app.use(`/course`, courseRouter);
  app.use(`/review`, reviewRouter);
  app.use(`/careeerResource`, careeerResourceRouter);
  app.use(`/careeerResourceCategories`, careeerResourceCategoriesRouter);
  app.use(`/degree`, degreeRouter);
  app.use(`/instructor`, instructorRouter);
  // app.use(`/successStory`, successStoryRouter);
  app.use(`/notifications`, notificationRouter);
  // app.use('/payment', paymentRoutes);

  // Handle Invalid Routes
  app.use('*', (req, res) => {
    console.warn(`Invalid Route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      error: 'Invalid Routing',
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  });
  // Global Error Handling Middleware
  app.use(globalErrorHandling);

  // Connect to Database
  connectDB();
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};


