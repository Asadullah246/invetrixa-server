import { UUIDField } from '@/common/decorator/fields';

export class RemoveUserAssignmentDto {
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

  @UUIDField('Location ID', {
    required: false,
    example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  })
  locationId?: string;
}
