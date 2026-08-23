import type { CartContract } from '@shopmind/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../auth/services/access-token.service';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(AccessTokenGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<CartContract> {
    return this.cartService.get(user.id);
  }

  @Post('items')
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: AddCartItemDto,
  ): Promise<CartContract> {
    return this.cartService.add(user.id, input.productId, input.quantity);
  }

  @Patch('items/:productId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Body() input: UpdateCartItemDto,
  ): Promise<CartContract> {
    return this.cartService.update(user.id, productId, input.quantity);
  }

  @Delete('items/:productId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Promise<CartContract> {
    return this.cartService.remove(user.id, productId);
  }
}
