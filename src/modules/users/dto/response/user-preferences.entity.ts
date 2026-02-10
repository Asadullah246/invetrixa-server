import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from 'generated/prisma/client';
import { Theme } from 'generated/prisma/enums';

export class UserPreferencesEntity {
  @ApiProperty({
    description: 'Unique identifier for the user preferences',
    example: '94ac78a0-5cca-4ae9-b0f6-ab749b0b61ea',
  })
  id: string;

  @ApiProperty({
    description: 'User ID associated with these preferences',
    example: '94ac78a0-5cca-4ae9-b0f6-ab749b0b61ea',
  })
  userId: string;

  @ApiProperty({
    description: 'User timezone',
    example: 'UTC',
    maxLength: 50,
    default: 'UTC',
  })
  timezone: string;

  @ApiProperty({
    description: 'User preferred language',
    example: 'en',
    maxLength: 10,
    default: 'en',
  })
  language: string;

  @ApiProperty({
    description: 'User preferred theme',
    enum: Theme,
    example: Theme.LIGHT,
    default: Theme.LIGHT,
  })
  theme: Theme;

  @ApiPropertyOptional({
    description: 'Additional user settings as JSON',
    example: { notifications: { sound: true } },
    nullable: true,
  })
  settings: Prisma.JsonValue | null;

  @ApiProperty({
    description: 'Whether email notifications are enabled',
    example: true,
    default: true,
  })
  emailNotifications: boolean;

  @ApiProperty({
    description: 'Whether SMS notifications are enabled',
    example: false,
    default: false,
  })
  smsNotifications: boolean;

  @ApiProperty({
    description: 'Whether push notifications are enabled',
    example: true,
    default: true,
  })
  pushNotifications: boolean;

  @ApiProperty({
    description: 'Whether weekly report emails are enabled',
    example: true,
    default: true,
  })
  weeklyReportEmails: boolean;

  @ApiProperty({
    description: 'Whether pxlhut emails are enabled',
    example: true,
    default: true,
  })
  pxlhutEmails: boolean;

  @ApiProperty({
    description: 'Timestamp when the preferences were created',
    example: '2025-11-19T07:32:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the preferences were last updated',
    example: '2025-11-19T07:32:00.000Z',
  })
  updatedAt: Date;
}
