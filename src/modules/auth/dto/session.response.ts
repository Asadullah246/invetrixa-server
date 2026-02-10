import { ApiProperty } from '@nestjs/swagger';

export class SessionSummaryDto {
  @ApiProperty({
    description: 'Identifier of the session stored in Redis.',
    example: 'x8d12fg9a',
  })
  readonly sessionId: string;

  @ApiProperty({
    description:
      'ISO 8601 timestamp for when the session will expire, if known.',
    example: '2025-03-01T12:30:00.000Z',
    nullable: true,
  })
  readonly expiresAt: string | null;

  @ApiProperty({
    description:
      'Seconds remaining before the session expires. Null when expiry is unknown.',
    example: 86399,
    nullable: true,
  })
  readonly idleSecondsRemaining: number | null;

  @ApiProperty({
    description: 'True when the session still requires a two-factor challenge.',
    example: false,
  })
  readonly requiresTwoFactor: boolean;

  @ApiProperty({
    description: 'True when the session has satisfied two-factor requirements.',
    example: true,
  })
  readonly twoFactorVerified: boolean;

  @ApiProperty({
    description: 'True if this session belongs to the current request.',
    example: true,
  })
  readonly isCurrent: boolean;

  @ApiProperty({
    description: 'Friendly device name supplied by the client, when available.',
    example: 'Jane’s MacBook Pro',
    nullable: true,
  })
  readonly deviceName: string | null;

  @ApiProperty({
    description: 'Operating system detected from the user agent string.',
    example: 'macOS',
    nullable: true,
  })
  readonly osName: string | null;

  @ApiProperty({
    description: 'Raw HTTP user agent string associated with the session.',
    example:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    nullable: true,
  })
  readonly userAgent: string | null;

  @ApiProperty({
    description: 'IP address captured when the session was created.',
    example: '203.0.113.42',
    nullable: true,
  })
  readonly ipAddress: string | null;

  @ApiProperty({
    description: 'Approximate location resolved for the session origin.',
    example: 'Dhaka, BD',
    nullable: true,
  })
  readonly location: string | null;

  @ApiProperty({
    description:
      'ISO 8601 timestamp when the session was last refreshed or created.',
    example: '2025-02-20T10:45:12.000Z',
    nullable: true,
  })
  readonly lastLoginAt: string | null;

  constructor(partial: SessionSummaryDto) {
    Object.assign(this, partial);
  }
}

export class SessionListMetaDto {
  @ApiProperty({
    description: 'Current page number, starting at 1.',
    example: 1,
  })
  readonly page: number;

  @ApiProperty({
    description: 'Number of sessions returned per page.',
    example: 10,
  })
  readonly limit: number;

  @ApiProperty({
    description: 'Number of sessions skipped based on the requested page.',
    example: 20,
  })
  readonly skip: number;

  @ApiProperty({
    description: 'Total number of pages available for the given page size.',
    example: 3,
  })
  readonly totalPages: number;

  @ApiProperty({
    description: 'Indicates if a subsequent page of sessions exists.',
    example: true,
  })
  readonly hasNextPage: boolean;

  @ApiProperty({
    description: 'Indicates if a previous page of sessions exists.',
    example: false,
  })
  readonly hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Total number of active sessions for the user.',
    example: 23,
  })
  readonly total: number;
}

export class SessionListResponseDto {
  @ApiProperty({
    description: 'Session entries returned for the requested page.',
    type: SessionSummaryDto,
    isArray: true,
  })
  readonly data: SessionSummaryDto[];

  @ApiProperty({
    description: 'Pagination metadata for the current session listing.',
    type: SessionListMetaDto,
  })
  readonly meta: SessionListMetaDto;
}
