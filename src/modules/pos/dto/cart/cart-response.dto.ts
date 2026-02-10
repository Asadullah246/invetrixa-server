import { SaleStatus } from 'generated/prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  lineTotal: number;
}

export class CartResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  saleNumber: string;

  @ApiProperty({ enum: SaleStatus })
  status: SaleStatus;

  @ApiProperty()
  locationId: string;

  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];
}
