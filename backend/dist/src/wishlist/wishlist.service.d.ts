import { PrismaService } from '../prisma/prisma.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
export declare class WishlistService {
    private prisma;
    constructor(prisma: PrismaService);
    getOrCreateWishlist(userId: string, companyId: string, merchantId: string): Promise<{
        items: {
            id: string;
            productId: string;
            variantId: string | null;
            productTitle: string;
            variantTitle: string | null;
            price: number;
            addedAt: Date;
            productImage: string | null;
            wishlistId: string;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        merchantId: string;
        companyId: string;
        companyUserId: string;
    }>;
    getWishlist(userId: string, companyId: string, merchantId: string): Promise<{
        id: string;
        productId: string;
        variantId: string | null;
        productTitle: string;
        variantTitle: string | null;
        price: number;
        addedAt: Date;
        productImage: string | null;
        wishlistId: string;
    }[]>;
    addToWishlist(userId: string, companyId: string, merchantId: string, dto: AddToWishlistDto): Promise<{
        id: string;
        productId: string;
        variantId: string | null;
        productTitle: string;
        variantTitle: string | null;
        price: number;
        addedAt: Date;
        productImage: string | null;
        wishlistId: string;
    }>;
    removeFromWishlist(userId: string, productId: string, merchantId: string): Promise<{
        id: string;
        productId: string;
        variantId: string | null;
        productTitle: string;
        variantTitle: string | null;
        price: number;
        addedAt: Date;
        productImage: string | null;
        wishlistId: string;
    }>;
    clearWishlist(userId: string, merchantId: string): Promise<import("@prisma/client").Prisma.BatchPayload | undefined>;
    isInWishlist(userId: string, productId: string, merchantId: string): Promise<boolean>;
    getWishlistCount(userId: string, merchantId: string): Promise<number>;
}
