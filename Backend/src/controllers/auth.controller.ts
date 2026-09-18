import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/Schema/user.model.js';

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if(!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
}
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/;


const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Missing Data'
      });
    }

   
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }

   
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters and contain uppercase, lowercase, number and special character'
      });
    }

  
    const userExists = await isUserExist(email);

    if (userExists) {
      return res.status(409).json({
        message: 'Email already exists'
      });
    }

  
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();

    return res.status(201).json({
      message: 'User registered successfully'
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Server error'
    });
  }
};

// const logout=async (req: Request, res: Response)=>{
     
// }

async function isUserExist(email: string): Promise<boolean> {
  const user = await User.findOne({ email });

  return !!user;
}


export { login, register };