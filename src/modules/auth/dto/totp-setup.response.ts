import { ApiProperty } from '@nestjs/swagger';

export class TotpSetupResponseDto {
  @ApiProperty({
    description: 'Base32 encoded secret used to seed the authenticator app.',
    example: 'JBSWY3DPEHPK3PXP',
  })
  readonly secret: string;

  @ApiProperty({
    description:
      'otpauth URI that can be encoded into a QR code for authenticator apps.',
    example:
      'otpauth://totp/PXLHUT%20SaaS:jane.doe%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=PXLHUT%20SaaS',
  })
  readonly otpauthUrl: string;
}
