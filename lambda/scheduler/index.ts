import { ScheduledHandler } from 'aws-lambda';
import { DynamoDBBookingsRepository } from '../../src/repositories/bookings';
import { SecretsManagerCredentialsRepository } from '../../src/repositories/credentials';
import { runScheduler } from '../../src/core/booking';

const TABLE_NAME = process.env.BOOKINGS_TABLE ?? 'sports-bookings';
const SECRET_NAME = process.env.CREDENTIALS_SECRET ?? 'randarar/credentials';

export const handler: ScheduledHandler = async () => {
  const bookingsRepo = new DynamoDBBookingsRepository(TABLE_NAME);
  const credentialsRepo = new SecretsManagerCredentialsRepository(SECRET_NAME);

  await runScheduler(bookingsRepo, credentialsRepo);
};
