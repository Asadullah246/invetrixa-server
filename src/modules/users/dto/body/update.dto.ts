import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserPreferenceDto } from '@/modules/auth/dto/user-preference.dto';
import { StringField, UrlField, PhoneField } from '@/common/decorator/fields';

/**
 * DTO for updating current user's own profile
 * Only includes fields that account owner can update themselves
 */
export class UpdateMeDto {
  @StringField('First Name', {
    required: false,
    max: 50,
    example: 'John',
  })
  firstName?: string;

  @StringField('Last Name', {
    required: false,
    max: 50,
    example: 'Doe',
  })
  lastName?: string;

  @UrlField('Profile Photo', {
    required: false,
    max: 255,
    example: 'https://example.com/avatar.png',
  })
  profilePhoto?: string;

  @PhoneField('Phone Number', {
    required: false,
    max: 20,
    example: '+14155552671',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'User preferences (timezone, language, theme, notifications).',
    type: UserPreferenceDto,
  })
  @ValidateNested()
  @Type(() => UserPreferenceDto)
  @IsOptional()
  preferences?: UserPreferenceDto;
}
