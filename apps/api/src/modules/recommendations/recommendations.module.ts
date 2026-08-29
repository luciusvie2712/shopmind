import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsRepository } from './recommendations.repository';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [AuthModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsRepository, RecommendationsService],
})
export class RecommendationsModule {}
