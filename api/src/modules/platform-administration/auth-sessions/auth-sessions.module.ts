import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthSession, AuthSessionSchema } from './schemas/auth-session.schema.js';
import { AuthSessionsRepository } from './auth-sessions.repository.js';
import { AuthSessionsService } from './auth-sessions.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: AuthSession.name, schema: AuthSessionSchema }])],
  providers: [AuthSessionsRepository, AuthSessionsService],
  exports: [AuthSessionsService],
})
export class AuthSessionsModule {}
