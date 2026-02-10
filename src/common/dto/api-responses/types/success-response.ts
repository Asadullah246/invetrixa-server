/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { HttpMethods } from './http-methods';
import { Type } from '@nestjs/common';

export interface SuccessProperties {
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
  message?: string;
  description?: string;
  method?: HttpMethods;
  path?: string;
  version?: number;
  meta?: unknown;
}
