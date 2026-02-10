import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiCookieAuth,
  ApiResponse,
  ApiResponseOptions,
  ApiProperty,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

interface CrudDecoratorOptions {
  /** Response DTO type for Swagger documentation (will be wrapped in standard response) */
  type?: Type<unknown>;
  /** Custom description (overrides default) */
  description?: string;
  /** Additional response status codes to include */
  additionalResponses?: Array<{
    status: number;
    description: string;
    type?: Type<unknown>;
  }>;
  /** Whether authentication is required (default: true) */
  requiresAuth?: boolean;
  /** Skip wrapping the response (default: false) */
  skipWrapper?: boolean;
}

/**
 * Pagination metadata DTO for Swagger
 */
class PaginationMetaSchema {
  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage: boolean;
}

/**
 * Helper to build ApiResponse options with standard wrapper
 */
function buildApiResponse(
  status: number,
  description: string,
  type?: Type<unknown>,
  wrapResponse = true,
): ApiResponseOptions {
  const options: ApiResponseOptions = { status, description };

  if (type && wrapResponse) {
    // Use content with schema for wrapped response
    options.content = {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: status },
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: { $ref: getSchemaPath(type) },
          },
        },
      },
    };
  } else if (type) {
    options.type = type;
  }

  return options;
}

/**
 * Helper to build paginated response schema
 */
function buildPaginatedApiResponse(
  status: number,
  description: string,
  itemType?: Type<unknown>,
): ApiResponseOptions {
  const options: ApiResponseOptions = { status, description };

  if (itemType) {
    options.content = {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: status },
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Success' },
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(itemType) },
            },
            meta: { $ref: getSchemaPath(PaginationMetaSchema) },
          },
        },
      },
    };
  }

  return options;
}

// ============================================================
// STANDARD CRUD DECORATORS
// ============================================================

/**
 * Decorator for CREATE (POST) endpoints
 * Default responses: 201 (Created), 400 (Bad Request), 401 (Unauthorized)
 *
 * @example
 * @ApiCreate('Create a new category', { type: CategoryResponseDto })
 * @Post()
 * create() { ... }
 */
export function ApiCreate(summary: string, options?: CrudDecoratorOptions) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiOperation({ summary }),
  ];

  // Add extra models if type is provided
  if (options?.type) {
    decorators.push(ApiExtraModels(options.type));
  }

  decorators.push(
    ApiResponse(
      buildApiResponse(
        201,
        options?.description ?? 'Created successfully',
        options?.type,
        !options?.skipWrapper,
      ),
    ),
    ApiResponse(buildApiResponse(400, 'Validation error')),
    ApiResponse(buildApiResponse(401, 'Unauthorized')),
  );

  options?.additionalResponses?.forEach((r) => {
    decorators.push(ApiResponse(buildApiResponse(r.status, r.description)));
  });

  if (options?.requiresAuth !== false) {
    decorators.push(ApiCookieAuth());
  }

  return applyDecorators(...decorators);
}

/**
 * Decorator for GET ALL (list) endpoints with pagination
 * Response is wrapped with statusCode, success, message, data[], and meta
 *
 * @example
 * @ApiGetAll('Get all categories', { type: CategoryWithCountResponseDto })
 * @Get()
 * findAll() { ... }
 */
export function ApiGetAll(summary: string, options?: CrudDecoratorOptions) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiOperation({ summary }),
  ];

  // Add extra models
  if (options?.type) {
    decorators.push(ApiExtraModels(options.type, PaginationMetaSchema));
  }

  decorators.push(
    ApiResponse(
      buildPaginatedApiResponse(
        200,
        options?.description ?? 'List retrieved successfully',
        options?.type,
      ),
    ),
    ApiResponse(buildApiResponse(400, 'Invalid query parameters')),
    ApiResponse(buildApiResponse(401, 'Unauthorized')),
  );

  options?.additionalResponses?.forEach((r) => {
    decorators.push(ApiResponse(buildApiResponse(r.status, r.description)));
  });

  if (options?.requiresAuth !== false) {
    decorators.push(ApiCookieAuth());
  }

  return applyDecorators(...decorators);
}

/**
 * Decorator for GET ONE (single resource) endpoints
 * Response is wrapped with statusCode, success, message, data
 *
 * @example
 * @ApiGetOne('Get category by ID or slug', { type: CategoryDetailResponseDto })
 * @Get(':identifier')
 * findOne() { ... }
 */
export function ApiGetOne(summary: string, options?: CrudDecoratorOptions) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiOperation({ summary }),
  ];

  if (options?.type) {
    decorators.push(ApiExtraModels(options.type));
  }

  decorators.push(
    ApiResponse(
      buildApiResponse(
        200,
        options?.description ?? 'Retrieved successfully',
        options?.type,
        !options?.skipWrapper,
      ),
    ),
    ApiResponse(buildApiResponse(401, 'Unauthorized')),
    ApiResponse(buildApiResponse(404, 'Not found')),
  );

  options?.additionalResponses?.forEach((r) => {
    decorators.push(ApiResponse(buildApiResponse(r.status, r.description)));
  });

  if (options?.requiresAuth !== false) {
    decorators.push(ApiCookieAuth());
  }

  return applyDecorators(...decorators);
}

/**
 * Decorator for UPDATE (PATCH/PUT) endpoints
 * Response is wrapped with statusCode, success, message, data
 *
 * @example
 * @ApiUpdate('Update a category', { type: CategoryResponseDto })
 * @Patch(':id')
 * update() { ... }
 */
export function ApiUpdate(summary: string, options?: CrudDecoratorOptions) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiOperation({ summary }),
  ];

  if (options?.type) {
    decorators.push(ApiExtraModels(options.type));
  }

  decorators.push(
    ApiResponse(
      buildApiResponse(
        200,
        options?.description ?? 'Updated successfully',
        options?.type,
        !options?.skipWrapper,
      ),
    ),
    ApiResponse(buildApiResponse(400, 'Validation error')),
    ApiResponse(buildApiResponse(401, 'Unauthorized')),
    ApiResponse(buildApiResponse(404, 'Not found')),
  );

  options?.additionalResponses?.forEach((r) => {
    decorators.push(ApiResponse(buildApiResponse(r.status, r.description)));
  });

  if (options?.requiresAuth !== false) {
    decorators.push(ApiCookieAuth());
  }

  return applyDecorators(...decorators);
}

/**
 * Decorator for DELETE endpoints
 * Default responses: 204 (No Content), 401 (Unauthorized), 404 (Not Found), 409 (Conflict)
 *
 * @example
 * @ApiDelete('Delete a category')
 * @Delete(':id')
 * @HttpCode(HttpStatus.NO_CONTENT)
 * remove() { ... }
 */
export function ApiDelete(summary: string, options?: CrudDecoratorOptions) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiOperation({ summary }),
    ApiResponse(
      buildApiResponse(204, options?.description ?? 'Deleted successfully'),
    ),
    ApiResponse(buildApiResponse(401, 'Unauthorized')),
    ApiResponse(buildApiResponse(404, 'Not found')),
    ApiResponse(buildApiResponse(409, 'Conflict - has dependencies')),
  ];

  options?.additionalResponses?.forEach((r) => {
    decorators.push(ApiResponse(buildApiResponse(r.status, r.description)));
  });

  if (options?.requiresAuth !== false) {
    decorators.push(ApiCookieAuth());
  }

  return applyDecorators(...decorators);
}

// ============================================================
// SPECIALIZED DECORATORS
// ============================================================

/**
 * Decorator for BULK DELETE endpoints
 * Default responses: 200 (OK), 400 (Bad Request), 401 (Unauthorized)
 */
export function ApiBulkDelete(summary: string, options?: CrudDecoratorOptions) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiOperation({ summary }),
    ApiResponse(
      buildApiResponse(200, options?.description ?? 'Deleted successfully'),
    ),
    ApiResponse(buildApiResponse(400, 'Invalid request body')),
    ApiResponse(buildApiResponse(401, 'Unauthorized')),
  ];

  options?.additionalResponses?.forEach((r) => {
    decorators.push(ApiResponse(buildApiResponse(r.status, r.description)));
  });

  if (options?.requiresAuth !== false) {
    decorators.push(ApiCookieAuth());
  }

  return applyDecorators(...decorators);
}

/**
 * Decorator for action endpoints (e.g., /categories/:id/activate)
 * Default responses: 200 (OK), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found)
 */
export function ApiAction(summary: string, options?: CrudDecoratorOptions) {
  const decorators: (ClassDecorator | MethodDecorator | PropertyDecorator)[] = [
    ApiOperation({ summary }),
  ];

  if (options?.type) {
    decorators.push(ApiExtraModels(options.type));
  }

  decorators.push(
    ApiResponse(
      buildApiResponse(
        200,
        options?.description ?? 'Action completed successfully',
        options?.type,
        !options?.skipWrapper,
      ),
    ),
    ApiResponse(buildApiResponse(400, 'Invalid request')),
    ApiResponse(buildApiResponse(401, 'Unauthorized')),
    ApiResponse(buildApiResponse(404, 'Not found')),
  );

  options?.additionalResponses?.forEach((r) => {
    decorators.push(ApiResponse(buildApiResponse(r.status, r.description)));
  });

  if (options?.requiresAuth !== false) {
    decorators.push(ApiCookieAuth());
  }

  return applyDecorators(...decorators);
}
