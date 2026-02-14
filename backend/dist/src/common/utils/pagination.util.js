"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePaginationParams = parsePaginationParams;
exports.calculatePagination = calculatePagination;
exports.buildPrismaSkipTake = buildPrismaSkipTake;
exports.buildPrismaOrderBy = buildPrismaOrderBy;
exports.createPaginatedResponse = createPaginatedResponse;
function parsePaginationParams(query) {
    return {
        page: Math.max(1, parseInt(query.page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20)),
        sortBy: query.sortBy || 'createdAt',
        sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
    };
}
function calculatePagination(total, page, limit) {
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
function buildPrismaSkipTake(params) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
        skip: (page - 1) * limit,
        take: limit,
    };
}
function buildPrismaOrderBy(params, allowedFields = ['createdAt', 'updatedAt', 'name']) {
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    if (!allowedFields.includes(sortBy)) {
        return { createdAt: 'desc' };
    }
    return { [sortBy]: sortOrder };
}
function createPaginatedResponse(data, total, params) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    return {
        data,
        pagination: calculatePagination(total, page, limit),
    };
}
//# sourceMappingURL=pagination.util.js.map