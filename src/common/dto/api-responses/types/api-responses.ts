/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { HttpMethods } from './http-methods';
import { Type } from '@nestjs/common';

export type ResponseConfig = {
  statusCode: 200 | 201 | 203 | 204 | 400 | 401 | 403 | 404 | 409 | 500;
  message?: string;
  error?: string;
  description?: string;
  type?:
    | string
    | number
    | boolean
    | Function
    | Type<unknown>
    | [Function]
    | Array<unknown>
    | null
    | Record<string, any>
    | undefined;
  details?: unknown;
  meta?: unknown;
};

export interface IApiResponses {
  summary?: string;
  method: HttpMethods;
  path: string;
  version?: number;
  message?: string;
  type?:
    | string
    | number
    | boolean
    | Function
    | Type<unknown>
    | [Function]
    | Array<unknown>
    | null
    | Record<string, any>
    | undefined;
  statusCode?: 200 | 201 | 203 | 204 | 400 | 401 | 403 | 404 | 409 | 500;
  description?: string;
  responses?: ResponseConfig[];
  skipDefaultResponse?: boolean;
  meta?: unknown;
  requiredAuth?: boolean;
}
