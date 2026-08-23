import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { isEmail } from 'class-validator';
import { AppModule } from './app.module';
import { StructuredLogger } from './common/logging/structured-logger';
import {
  AdminProvisioningError,
  AdminProvisioningService,
} from './modules/users/admin-provisioning.service';

function readEmailArgument(arguments_: readonly string[]): string {
  const optionIndex = arguments_.indexOf('--email');
  const email = optionIndex === -1 ? undefined : arguments_[optionIndex + 1];
  if (email === undefined || !isEmail(email.trim())) {
    throw new Error('Usage: admin:grant -- --email operator@example.com');
  }
  return email;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof AdminProvisioningError) return error.message;
  if (error instanceof Error && error.message.startsWith('Usage:')) {
    return error.message;
  }
  return 'Admin provisioning failed';
}

async function bootstrap(): Promise<void> {
  const logger = new StructuredLogger();
  let application: INestApplicationContext | undefined;

  try {
    const email = readEmailArgument(process.argv.slice(2));
    application = await NestFactory.createApplicationContext(AppModule, {
      logger,
    });
    const result = await application
      .get(AdminProvisioningService)
      .grantByEmail(email);
    logger.log({ operation: 'grant_admin_role', ...result });
  } catch (error) {
    logger.error({
      operation: 'grant_admin_role',
      status: 'failure',
      errorType: error instanceof Error ? error.name : 'UnknownError',
      message: safeErrorMessage(error),
    });
    process.exitCode = 1;
  } finally {
    await application?.close();
  }
}

void bootstrap();
