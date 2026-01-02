import * as jwt from 'jsonwebtoken';
import {
  AuthenticationError,
  ServiceUnavailableError,
} from '../errors/application.errors';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name?: string;
}

export class JwtUtils {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new ServiceUnavailableError(
        'JWT',
        'JWT_SECRET is not defined in environment variables',
      );
    }
    return secret;
  }

  private static getJwtExpiration(): string | number {
    const expiration = process.env.JWT_EXPIRATION;
    if (!expiration) {
      return '24h'; // default to 24 hours
    }

    // Parse numeric expiration (in seconds)
    if (/^\d+$/.test(expiration)) {
      return parseInt(expiration, 10);
    }

    return expiration; // string like '1d', '2h', etc.
  }

  static generateToken(payload: JwtPayload): string {
    try {
      const secret = this.getJwtSecret();
      const expiresIn = this.getJwtExpiration();

      return jwt.sign(payload, secret, {
        expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ServiceUnavailableError('JWT', 'Failed to generate token');
    }
  }

  static verifyToken(token: string): JwtPayload {
    try {
      const secret = this.getJwtSecret();
      return jwt.verify(token, secret) as JwtPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      }
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new AuthenticationError('Token verification failed');
    }
  }

  static extractTokenFromHeader(
    authorization: string | undefined,
  ): string | null {
    if (!authorization) return null;

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }

  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return null;
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  static getRemainingTokenTime(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return null;
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp - currentTime;
    } catch {
      return null;
    }
  }
}
