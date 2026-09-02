import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LocalizedText, LocalizedTextSchema } from './localized-text.schema.js';
import {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
} from '../../../test/utils/mongo-memory-server.js';

@Schema()
class TestDoc {
  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;
}
const TestDocSchema = SchemaFactory.createForClass(TestDoc);

describe('LocalizedText', () => {
  let server: MongoMemoryServer;
  let model: Model<TestDoc>;

  beforeAll(async () => {
    server = await connectTestDatabase();
    model = mongoose.model<TestDoc>('LocalizedTextTestDoc', TestDocSchema);
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase(server);
  });

  it('accepts a document with both en and ar', async () => {
    const created = await model.create({ label: { en: 'Hello', ar: 'مرحبا' } });

    expect(created.label.en).toBe('Hello');
    expect(created.label.ar).toBe('مرحبا');
  });

  it('rejects a document missing en', async () => {
    await expect(model.create({ label: { ar: 'مرحبا' } })).rejects.toThrow();
  });

  it('rejects a document missing ar', async () => {
    await expect(model.create({ label: { en: 'Hello' } })).rejects.toThrow();
  });
});
