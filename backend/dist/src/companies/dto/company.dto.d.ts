export declare enum CompanyStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    SUSPENDED = "suspended"
}
export declare class CreateCompanyDto {
    name: string;
    email: string;
    phone?: string;
    taxId?: string;
    website?: string;
    notes?: string;
    priceTierId?: string;
}
export declare class UpdateCompanyDto {
    name?: string;
    email?: string;
    phone?: string;
    taxId?: string;
    website?: string;
    notes?: string;
    status?: CompanyStatus;
    priceTierId?: string;
    isActive?: boolean;
}
export declare class RejectCompanyDto {
    reason?: string;
}
export declare class InviteUserDto {
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
}
export declare class GetCompaniesQueryDto {
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
}
