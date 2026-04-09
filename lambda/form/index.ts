import { APIGatewayProxyHandler } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { DynamoDBBookingsRepository } from '../../src/repositories/bookings';
import { SecretsManagerCredentialsRepository } from '../../src/repositories/credentials';
import { BookingRequest } from '../../src/types';

const TABLE_NAME = process.env.BOOKINGS_TABLE ?? 'sports-bookings';
const SECRET_NAME = process.env.CREDENTIALS_SECRET ?? 'randarar/credentials';

function renderForm(credentialIds: string[], message?: string): string {
  const options = credentialIds.map(id => `<option value="${id}">${id}</option>`).join('\n');
  const messageHtml = message ? `<p class="message">${message}</p>` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sports Class Booking</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; }
    label { display: block; margin-top: 16px; font-weight: bold; }
    input, select { width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box; font-size: 1rem; }
    button { margin-top: 24px; padding: 10px 24px; font-size: 1rem; cursor: pointer; }
    .message { padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Book a Sports Class</h1>
  ${messageHtml}
  <form method="POST">
    <label for="url">Course URL</label>
    <input type="url" id="url" name="url" required placeholder="https://app.clubity.com/angebote/...">

    <label for="credentialId">Book as</label>
    <select id="credentialId" name="credentialId" required>
      ${options}
    </select>

    <button type="submit">Add Booking</button>
  </form>
</body>
</html>`;
}

function parseFormBody(body: string): Record<string, string> {
  return Object.fromEntries(
    body.split('&').map(pair => pair.split('=').map(decodeURIComponent))
  );
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const bookingsRepo = new DynamoDBBookingsRepository(TABLE_NAME);
  const credentialsRepo = new SecretsManagerCredentialsRepository(SECRET_NAME);

  let credentialIds: string[] = [];
  try {
    credentialIds = await credentialsRepo.listIds();
  } catch (err) {
    console.error('Failed to load credentials:', err);
  }

  if (event.httpMethod === 'POST') {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body ?? '', 'base64').toString()
      : event.body ?? '';

    const fields = parseFormBody(body);
    const { url, credentialId } = fields;

    if (!url || !credentialId) {
      return { statusCode: 400, headers: { 'Content-Type': 'text/html' }, body: renderForm(credentialIds, 'Missing url or credentialId') };
    }

    const booking: BookingRequest = {
      id: randomUUID(),
      url,
      credentialId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await bookingsRepo.save(booking);
    console.log('Saved booking:', booking.id);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: renderForm(credentialIds, `Booking added! ID: ${booking.id} — the scheduler will try every hour.`),
    };
  }

  // GET
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: renderForm(credentialIds),
  };
};
