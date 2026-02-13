/**
 * Pagination Interfaces and Helpers
 * Standard pagination for all list endpoints
 */

/**
 * Pagination Query Parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Response
 */
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

/**
 * Parse pagination params from query string
 */
export function parsePaginationParams(query: Record<string, any>): PaginationParams {
  return {
    page: Math.max(1, parseInt(query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20)),
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<never>['pagination'] {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Build Prisma skip/take from pagination params
 */
export function buildPrismaSkipTake(params: PaginationParams): { skip: number; take: number } {
  const page = params.page || 1;
  const limit = params.limit || 20;
  
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Build Prisma orderBy from pagination params
 */
export function buildPrismaOrderBy(
  params: PaginationParams,
  allowedFields: string[] = ['createdAt', 'updatedAt', 'name'],
): Record<string, 'asc' | 'desc'> {
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder || 'desc';
  
  // Only allow specified fields to prevent SQL injection
  if (!allowedFields.includes(sortBy)) {
    return { createdAt: 'desc' };
  }
  
  return { [sortBy]: sortOrder };
}

/**
 * Create paginated response helper
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResponse<T> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  
  return {
    data,
    pagination: calculatePagination(total, page, limit),
  };
}
