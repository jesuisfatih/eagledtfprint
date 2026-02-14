export declare enum AddressType {
    SHIPPING = "shipping",
    BILLING = "billing",
    BOTH = "both"
}
export declare class CreateAddressDto {
    label: string;
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province?: string;
    provinceCode?: string;
    country: string;
    countryCode?: string;
    zip: string;
    phone?: string;
    type?: AddressType;
    isDefault?: boolean;
}
export declare class UpdateAddressDto {
    label?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    provinceCode?: string;
    country?: string;
    countryCode?: string;
    zip?: string;
    phone?: string;
    type?: AddressType;
    isDefault?: boolean;
}
