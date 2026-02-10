import { ApiProperty } from '@nestjs/swagger';

export class BackupCodesResponseDto {
  @ApiProperty({
    description: 'Newly generated backup codes. Each code can be used once.',
    type: [String],
    example: ['ABCD-EFGH-IJKL', 'MNOP-QRST-UVWX'],
  })
  readonly codes: string[];

  constructor(codes: string[]) {
    this.codes = codes;
  }
}
