import { Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * Helper service for extracting and processing HTTP headers.
 */
@Injectable()
export class HeaderExtractorHelper {
  /**
   * Extracts a single header value from the request.
   * If the header has multiple values, returns the first one.
   * @param req - Express request object
   * @param key - Header key (case-insensitive)
   * @returns Header value or undefined if not found
   */
  getHeaderValue(req: Request, key: string): string | undefined {
    const value = req.headers[key.toLowerCase()];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  /**
   * Extracts all values for a header that may have multiple values.
   * @param req - Express request object
   * @param key - Header key (case-insensitive)
   * @returns Array of header values or empty array if not found
   */
  getHeaderValues(req: Request, key: string): string[] {
    const value = req.headers[key.toLowerCase()];
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  /**
   * Extracts bearer token from Authorization header.
   * @param req - Express request object
   * @returns Token string or undefined if not found
   */
  getBearerToken(req: Request): string | undefined {
    const authHeader = this.getHeaderValue(req, 'authorization');
    if (!authHeader) return undefined;

    const [type, token] = authHeader.split(' ');
    if (type?.toLowerCase() === 'bearer' && token) {
      return token;
    }
    return undefined;
  }

  /**
   * Extracts client IP address from request headers or connection.
   * Checks X-Forwarded-For, X-Real-IP, and falls back to connection IP.
   * @param req - Express request object
   * @returns IP address or undefined
   */
  getClientIp(req: Request): string | undefined {
    const forwardedFor = this.getHeaderValue(req, 'x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = this.getHeaderValue(req, 'x-real-ip');
    if (realIp) return realIp;

    return req.socket.remoteAddress;
  }

  /**
   * Extracts user agent from request headers.
   * @param req - Express request object
   * @returns User agent string or undefined
   */
  getUserAgent(req: Request): string | undefined {
    return this.getHeaderValue(req, 'user-agent');
  }
}
