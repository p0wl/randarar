import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BookingRequest, BookingStatus } from '../types';

export interface BookingsRepository {
  listPending(): Promise<BookingRequest[]>;
  save(booking: BookingRequest): Promise<void>;
  updateStatus(id: string, status: BookingStatus, extra?: { bookedAt?: string; error?: string }): Promise<void>;
}

export class DynamoDBBookingsRepository implements BookingsRepository {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName: string, region = process.env.AWS_REGION ?? 'eu-central-1') {
    this.tableName = tableName;
    this.client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  }

  async listPending(): Promise<BookingRequest[]> {
    const result = await this.client.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#s = :pending',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':pending': 'pending' },
    }));
    return (result.Items ?? []) as BookingRequest[];
  }

  async save(booking: BookingRequest): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: booking,
    }));
  }

  async updateStatus(id: string, status: BookingStatus, extra?: { bookedAt?: string; error?: string }): Promise<void> {
    const updates: string[] = ['#s = :status'];
    const names: Record<string, string> = { '#s': 'status' };
    const values: Record<string, string> = { ':status': status };

    if (extra?.bookedAt) {
      updates.push('bookedAt = :bookedAt');
      values[':bookedAt'] = extra.bookedAt;
    }
    if (extra?.error) {
      updates.push('#e = :error');
      names['#e'] = 'error';
      values[':error'] = extra.error;
    }

    await this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: 'SET ' + updates.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }));
  }
}
