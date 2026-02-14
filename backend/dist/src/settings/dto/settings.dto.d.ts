export declare class UpdateMerchantSettingsDto {
    shopDomain?: string;
    storeName?: string;
    currency?: string;
    timezone?: string;
    supportEmail?: string;
    logoUrl?: string;
    snippetEnabled?: boolean;
}
export declare class UpdateCompanySettingsDto {
    notificationsEnabled?: boolean;
    quoteNotifications?: boolean;
    orderNotifications?: boolean;
    netTermsDays?: number;
    preferredPaymentMethod?: string;
}
export declare class UpdateSsoSettingsDto {
    mode: string;
    multipassSecret?: string;
    storefrontToken?: string;
}
export declare class ToggleSnippetDto {
    enabled: boolean;
}
