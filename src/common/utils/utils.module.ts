import { Global, Module } from '@nestjs/common';
import ArgonModule from './argon/argon.module';
import { HeaderExtractorHelper } from './header-extractor.helper';
import { SlugService } from './slug.utils';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [ArgonModule, PrismaModule],
  providers: [HeaderExtractorHelper, SlugService],
  exports: [ArgonModule, HeaderExtractorHelper, SlugService],
})
export class UtilsModule {}
