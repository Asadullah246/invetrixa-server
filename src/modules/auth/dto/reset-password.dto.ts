import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from 'class-validator';
import { StringField } from '@/common/decorator/fields/string-field.decorator';

export class ResetPasswordDto {
  @StringField('Reset Token', {
    required: true,
    min: 1,
    max: 128,
    example: '97f7c0c5e9a84f1f9f0d10f1b3a9e0c1',
  })
  readonly token: string;

  @ApiProperty({
    description:
      'New password that satisfies minimum complexity: 8 characters, including upper and lower case letters, numbers, and symbols.',
    example: 'N3wP@ssw0rd!',
  })
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  readonly password: string;
}
