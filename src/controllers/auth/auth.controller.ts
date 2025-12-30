import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { LoginInput } from '../../schemas/auth/auth.schema';
import { pool } from '../../db/config/db';
import { env } from '../../db/config/env';
import { AppError } from '../../utils/errors';


export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req?.body;

    const result = await pool.query(
      'SELECT id, email, password, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError(401, 'Email ou mot de passe incorrect');
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError(401, 'Email ou mot de passe incorrect');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRE as string } as SignOptions
    );

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};