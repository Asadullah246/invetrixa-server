import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  SESSION_LIST_DEFAULT_PAGE_SIZE,
  SESSION_LIST_MAX_PAGE_SIZE,
} from '../auth.constants';

export class ListSessionsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number to retrieve. Starts at 1.',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number;

  @ApiPropertyOptional({
    description: 'Number of sessions to return per page.',
    example: 10,
    minimum: 1,
    maximum: SESSION_LIST_MAX_PAGE_SIZE,
    default: SESSION_LIST_DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SESSION_LIST_MAX_PAGE_SIZE)
  readonly pageSize?: number;
}
