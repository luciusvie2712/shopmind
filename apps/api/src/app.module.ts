import { Module } from '@nestjs/common';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthModule } from './modules/health/health.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { SearchModule } from './modules/search/search.module';
import { UsersModule } from './modules/users/users.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';

@Module({
  imports: [
    AiModule,
    AuthModule,
    CartModule,
    CategoriesModule,
    HealthModule,
    IngestionModule,
    OrdersModule,
    ProductsModule,
    SearchModule,
    UsersModule,
    WishlistModule,
  ],
})
export class AppModule {}
