import { UUIDField } from '@/common/decorator/fields';

export class UserIdParams {
  @UUIDField('User ID', { required: true })
  id: string;
}
