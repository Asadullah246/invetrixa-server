import { UUIDField, EnumField } from '@/common/decorator/fields';
import { AccessScope } from '../entity/user-assignment.entity';
import { ValidateIf } from 'class-validator';

export class CreateUserAssignmentDto {
  @UUIDField('Role ID', {
    required: true,
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  roleId: string;

  @UUIDField('User ID', {
    required: true,
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  userId: string;

  @EnumField('Access Scope', AccessScope, {
    required: true,
  })
  accessScope: AccessScope;

  @ValidateIf(
    (o: CreateUserAssignmentDto) => o.accessScope === AccessScope.LOCATION,
  )
  @UUIDField('Location ID', {
    required: false,
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  locationId?: string;
}
