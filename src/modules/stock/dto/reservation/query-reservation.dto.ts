import { ReservationStatus } from 'generated/prisma/client';
import { PaginationQueryDto } from '@/common/dto/query/pagination';
import { EnumField, StringField, UUIDField } from '@/common/decorator/fields';

export class QueryReservationDto extends PaginationQueryDto {
  @UUIDField('Product ID', { required: false })
  productId?: string;

  @UUIDField('Location ID', { required: false })
  locationId?: string;

  @EnumField('Reservation Status', ReservationStatus, { required: false })
  status?: ReservationStatus;

  @StringField('Reference Type', { required: false, max: 50 })
  referenceType?: string;
}
