import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { SearchModule } from '../search/search.module';
import { WishlistModule } from '../wishlist/wishlist.module';
import { AiRateLimitModule } from '../../common/rate-limit/ai-rate-limit.module';
import { AiRequestLogRepository } from './ai-request-log.repository';
import { AiRequestLogService } from './ai-request-log.service';
import { AiSearchService } from './ai-search.service';
import { AiController } from './ai.controller';
import { AssistantService } from './assistant.service';
import { CompareService } from './compare.service';
import { ConversationRepository } from './conversation.repository';
import { ConversationService } from './conversation.service';
import { EmbeddingModule } from './embedding/embedding.module';
import { ProductComparisonFactsService } from './product-comparison-facts.service';
import { AI_SEARCH_PROVIDER } from './provider/ai-provider';
import { GeminiAiProvider } from './provider/gemini-ai.provider';
import { AiToolRegistry } from './tools/tool-registry';
import { CompareProductsTool } from './tools/compare-products.tool';
import { GetCategoriesTool } from './tools/get-categories.tool';
import { GetProductTool } from './tools/get-product.tool';
import { GetUserPreferencesTool } from './tools/get-user-preferences.tool';
import { GetWishlistTool } from './tools/get-wishlist.tool';
import { SearchProductsTool } from './tools/search-products.tool';

@Module({
  imports: [
    AuthModule,
    AiRateLimitModule,
    CategoriesModule,
    EmbeddingModule,
    ProductsModule,
    SearchModule,
    WishlistModule,
  ],
  controllers: [AiController],
  providers: [
    AiRequestLogRepository,
    AiRequestLogService,
    AiSearchService,
    AssistantService,
    CompareService,
    ConversationRepository,
    ConversationService,
    ProductComparisonFactsService,
    SearchProductsTool,
    GetProductTool,
    CompareProductsTool,
    GetCategoriesTool,
    GetUserPreferencesTool,
    GetWishlistTool,
    AiToolRegistry,
    GeminiAiProvider,
    { provide: AI_SEARCH_PROVIDER, useExisting: GeminiAiProvider },
  ],
  exports: [AI_SEARCH_PROVIDER],
})
export class AiModule {}
