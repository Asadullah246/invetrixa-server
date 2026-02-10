import { InternalServerErrorException } from '@nestjs/common';

export class Env {
  static get<T extends string | number | boolean>(
    key: string,
    defaultValue?: T,
  ): T {
    const raw = process.env[key];

    if (raw !== undefined) {
      if (typeof defaultValue === 'number') return Number(raw) as T;
      if (typeof defaultValue === 'boolean') return (raw === 'true') as T;
      return raw as T;
    }

    if (defaultValue !== undefined) return defaultValue;

    throw new InternalServerErrorException(`Missing env: ${key}`);
  }
}
