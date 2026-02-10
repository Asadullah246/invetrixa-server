import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';
import { Theme } from 'generated/prisma/enums';
import {
  StringField,
  UrlField,
  EnumField,
  BooleanField,
} from '@/common/decorator/fields';

export class UserPreferenceDto {
  @UrlField('Profile Photo', {
    required: false,
    example: 'https://example.com/profile.jpg',
  })
  profilePhoto?: string;

  @StringField('Timezone', {
    required: false,
    example: 'Asia/Dhaka',
  })
  timezone?: string;

  @StringField('Language', {
    required: false,
    example: 'en',
  })
  language?: string;

  @EnumField('Theme', Theme, { required: false })
  theme?: Theme;

  @BooleanField('Email Notifications', { required: false, example: true })
  emailNotifications?: boolean;

  @BooleanField('SMS Notifications', { required: false, example: false })
  smsNotifications?: boolean;

  @BooleanField('Push Notifications', { required: false, example: true })
  pushNotifications?: boolean;

  @BooleanField('Weekly Report Emails', { required: false, example: true })
  weeklyReportEmails?: boolean;

  @BooleanField('Pxlhut Emails', { required: false, example: true })
  pxlhutEmails?: boolean;

  @ApiPropertyOptional({
    example: { customKey: 'customValue' },
    description: 'Additional user settings as JSON',
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
