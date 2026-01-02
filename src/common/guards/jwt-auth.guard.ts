import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtUtils } from '../utils/jwt.utils';
import { Request } from 'express';

@Injectable()
export class JWTAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    try {
      const request = context.switchToHttp().getRequest<Request>();
      const authorizationHeader = request.headers.authorization;
      if (!authorizationHeader) {
        return false;
      }
      const token = JwtUtils.extractTokenFromHeader(authorizationHeader);

      if (!token) {
        return false;
      }

      if (JwtUtils.isTokenExpired(token)) {
        return false;
      }

      const payload = JwtUtils.verifyToken(token);
      (request as any).user = payload;
      return true;
    } catch {
      return false;
    }
  }
}
