import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';

function getHeaderValue(req: Request, key: string): string | undefined {
  const value = req.headers[key.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

export default getHeaderValue;

export const getHeaderWithErrorThrow = (
  req: Request,
  key: string,
  errorMessage?: string,
): string => {
  const value = getHeaderValue(req, key);
  if (!value) {
    throw new NotFoundException(errorMessage || `Tenant not found`);
  }
  return value;
};
