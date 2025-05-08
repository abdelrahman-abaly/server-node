import dotenv from 'dotenv';
dotenv.config(); 

import process from 'node:process';
import mongoose from 'mongoose';


const connectDB = async () => {
  return await mongoose
    .connect(process.env.MONGODB_URI)
    .then((_res) => {
      console.log(`DB Connected Successfully........`);
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
    });
};

export default connectDB;
