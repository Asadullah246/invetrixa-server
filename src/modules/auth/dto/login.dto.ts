import { RegisterResponseDto } from './register.dto';
import { EmailField, PasswordField } from '@/common/decorator/fields';

export class LoginDto {
  @EmailField('Email', { required: true })
  readonly email: string;

  @PasswordField('Password', { required: true })
  readonly password: string;
}

export class LoginResponseDto extends RegisterResponseDto {}
