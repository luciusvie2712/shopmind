import type { WishlistContract } from '@shopmind/contracts';
import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { AuthenticatedUser } from '../auth/services/access-token.service';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
@UseGuards(AccessTokenGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<WishlistContract> {
    return this.wishlistService.list(user.id);
  }

  @Put(':productId')
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Promise<WishlistContract> {
    return this.wishlistService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Promise<WishlistContract> {
    return this.wishlistService.remove(user.id, productId);
  }
}
