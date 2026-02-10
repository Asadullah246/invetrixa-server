import { Module } from '@nestjs/common';
import { PASSWORD_HASHING_OPTIONS } from '@/common/constants';
import { ARGON_OPTIONS, ArgonHelper } from './argon.helper';

@Module({
  providers: [
    {
      provide: ARGON_OPTIONS,
      useValue: PASSWORD_HASHING_OPTIONS,
    },
    ArgonHelper,
  ],
  exports: [ArgonHelper],
})
export default class ArgonModule {}
