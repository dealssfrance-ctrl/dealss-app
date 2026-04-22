import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import { User } from '../types/index.js';
import crypto from 'crypto';

const router = Router();

// Get all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await db.getAllUsersSafe();
    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching users'
    });
  }
});

// Create user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    if (await db.userExists(email)) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const user: User = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      password: password || 'default123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.createUser(user);
    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while creating user' });
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = await db.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password, ...userWithoutPassword } = user;
    return res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user'
    });
  }
});

// Update user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, email } = req.body;

    const updates: Partial<User> = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();

    const updatedUser = await db.updateUser(id, updates);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { password, ...userWithoutPassword } = updatedUser;
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating user'
    });
  }
});

// Delete user
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const deleted = await db.deleteUser(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while deleting user'
    });
  }
});

export default router;