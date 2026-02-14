export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
export declare function parsePaginationParams(query: Record<string, any>): PaginationParams;
export declare function calculatePagination(total: number, page: number, limit: number): PaginatedResponse<never>['pagination'];
export declare function buildPrismaSkipTake(params: PaginationParams): {
    skip: number;
    take: number;
};
export declare function buildPrismaOrderBy(params: PaginationParams, allowedFields?: string[]): Record<string, 'asc' | 'desc'>;
export declare function createPaginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T>;
