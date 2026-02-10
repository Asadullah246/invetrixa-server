import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const OutOfBandChannels = ['EMAIL'] as const;
export type OutOfBandChannel = (typeof OutOfBandChannels)[number];

export class SendChallengeDto {
  @ApiProperty({
    description: 'Channel to deliver the one-time password.',
    enum: OutOfBandChannels,
    example: 'EMAIL',
  })
  @IsIn(OutOfBandChannels)
  readonly channel: OutOfBandChannel;
}
