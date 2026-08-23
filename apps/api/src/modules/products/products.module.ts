import { Module } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductRepository, ProductsService],
  exports: [ProductRepository, ProductsService],
})
export class ProductsModule {}
