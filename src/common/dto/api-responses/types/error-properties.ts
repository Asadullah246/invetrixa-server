import { HttpMethods } from './http-methods';

export interface ErrorProperties<T = unknown> {
  error?: string;
  details?: T;
  message?: string;
  description?: string;
  method?: HttpMethods;
  path?: string;
  version?: number;
}
