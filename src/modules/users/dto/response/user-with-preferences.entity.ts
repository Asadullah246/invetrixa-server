import { UserEntity } from './user.entity';
import { UserPreferencesEntity } from './user-preferences.entity';

export class UserWithPreferences extends UserEntity {
  declare preferences: UserPreferencesEntity;
}
