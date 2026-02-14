import { CheckoutService } from './checkout.service';
export declare class CheckoutController {
    private checkoutService;
    constructor(checkoutService: CheckoutService);
    createCheckout(userId: string, body: {
        cartId: string;
    }): Promise<{
        checkoutUrl: string;
        discountCode: string | undefined;
        total: number;
        savings: number;
        ssoUrl: string | undefined;
        userData: {
            email: any;
            firstName: any;
            lastName: any;
            phone: any;
        } | null;
    }>;
}
