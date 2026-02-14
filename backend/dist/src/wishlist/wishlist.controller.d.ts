import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
export declare class WishlistController {
    private wishlistService;
    constructor(wishlistService: WishlistService);
    getWishlist(id: string, currentUserId: string, companyId: string, merchantId: string): Promise<{
        id: string;
        productId: string;
        variantId: string | null;
        productTitle: string;
        variantTitle: string | null;
        price: number;
        productImage: string | null;
        wishlistId: string;
        addedAt: Date;
    }[]>;
    addToWishlist(id: string, currentUserId: string, companyId: string, merchantId: string, dto: AddToWishlistDto): Promise<{
        id: string;
        productId: string;
        variantId: string | null;
        productTitle: string;
        variantTitle: string | null;
        price: number;
        productImage: string | null;
        wishlistId: string;
        addedAt: Date;
    }>;
    removeFromWishlist(id: string, productId: string, currentUserId: string, merchantId: string): Promise<{
        success: boolean;
    }>;
    clearWishlist(id: string, currentUserId: string, merchantId: string): Promise<{
        success: boolean;
    }>;
    checkWishlist(id: string, productId: string, currentUserId: string, merchantId: string): Promise<{
        isInWishlist: boolean;
    }>;
    getWishlistCount(id: string, currentUserId: string, merchantId: string): Promise<{
        count: number;
    }>;
}
