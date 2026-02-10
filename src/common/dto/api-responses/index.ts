import { applyDecorators } from '@nestjs/common';
import { IApiResponses, ResponseConfig } from './types/api-responses';
import { ApiResponseOk } from './responses/200';
import { ApiResponseCreated } from './responses/201';
import { ApiResponseNonAuthoritativeInformation } from './responses/203';
import { ApiResponseNoContent } from './responses/204';
import { ApiResponseBadRequest } from './responses/400';
import { ApiResponseUnauthorized } from './responses/401';
import { ApiResponseForbidden } from './responses/403';
import { ApiResponseNotFound } from './responses/404';
import { ApiResponseConflict } from './responses/409';
import { ApiResponseInternalServerError } from './responses/500';
import { ApiCookieAuth, ApiOperation } from '@nestjs/swagger';

export const ApiResponses = (options: IApiResponses) => {
  const {
    method,
    path,
    summary,
    description,
    version,
    message,
    type,
    meta,
    statusCode,
    responses = [],
    skipDefaultResponse = false,
    requiredAuth = true,
  } = options;

  const decorators: MethodDecorator[] = [ApiOperation({ summary })];

  // If statusCode is provided, use it and skip default responses
  let allResponses: ResponseConfig[];
  if (statusCode) {
    allResponses = [
      {
        statusCode,
        message,
        description,
        type,
        meta,
      },
      ...responses,
    ];
  } else {
    const defaultResponses = skipDefaultResponse
      ? []
      : getDefaultResponses(method);

    // Enrich default responses with top-level options
    const enrichedDefaults = defaultResponses.map((defaultResponse) => ({
      ...defaultResponse,
      ...(message && { message }),
      ...(description && { description }),
      ...(type && { type }),
      ...(meta !== undefined && { meta }),
    }));

    allResponses = [...enrichedDefaults, ...responses];
  }

  allResponses.forEach((response) => {
    switch (response.statusCode) {
      case 200:
        decorators.push(
          ApiResponseOk({
            message: message || response.message,
            description: description || response.description,
            type: type || response.type,
            meta: meta || response.meta,
          }),
        );
        break;
      case 201:
        decorators.push(
          ApiResponseCreated({
            method,
            path,
            version,
            message: message || response.message,
            description: description || response.description,
            type: type || response.type,
            meta: meta || response.meta,
          }),
        );
        break;
      case 203:
        decorators.push(
          ApiResponseNonAuthoritativeInformation({
            method,
            path,
            version,
            message: message || response.message,
            description: description || response.description,
            type: type || response.type,
            meta: meta || response.meta,
          }),
        );
        break;
      case 204:
        decorators.push(
          ApiResponseNoContent({
            method,
            path,
            version,
            message: message || response.message,
            description: description || response.description,
          }),
        );
        break;
      case 400:
        decorators.push(
          ApiResponseBadRequest({
            method,
            path,
            version,
            message: response.message,
            error: response.error,
            description: response.description,
            details: response.details,
          }),
        );
        break;
      case 401:
        decorators.push(
          ApiResponseUnauthorized({
            method,
            path,
            version,
            message: response.message,
            error: response.error,
            description: response.description,
            details: response.details,
          }),
        );
        break;
      case 403:
        decorators.push(
          ApiResponseForbidden({
            method,
            path,
            version,
            message: response.message,
            error: response.error,
            description: response.description,
            details: response.details,
          }),
        );
        break;
      case 404:
        decorators.push(
          ApiResponseNotFound({
            method,
            path,
            version,
            message: response.message,
            error: response.error,
            description: response.description,
            details: response.details,
          }),
        );
        break;
      case 409:
        decorators.push(
          ApiResponseConflict({
            method,
            path,
            version,
            message: response.message,
            error: response.error,
            description: response.description,
            details: response.details,
          }),
        );
        break;
      case 500:
        decorators.push(
          ApiResponseInternalServerError({
            method,
            path,
            version,
            message: response.message,
            error: response.error,
            description: response.description,
            details: response.details,
          }),
        );
        break;
    }
  });

  if (requiredAuth) {
    decorators.push(ApiCookieAuth());
  }

  return applyDecorators(...decorators);
};

// Helper function to get default responses based on HTTP method
function getDefaultResponses(method: string): ResponseConfig[] {
  const defaults: Record<string, ResponseConfig[]> = {
    GET: [{ statusCode: 200 }],
    POST: [{ statusCode: 201 }],
    PUT: [{ statusCode: 200 }],
    PATCH: [{ statusCode: 200 }],
    DELETE: [{ statusCode: 204 }],
  };

  return defaults[method] || [{ statusCode: 200 }];
}

// Export individual response decorators for standalone use
export { ApiResponseOk } from './responses/200';
export { ApiResponseCreated } from './responses/201';
export { ApiResponseNonAuthoritativeInformation } from './responses/203';
export { ApiResponseNoContent } from './responses/204';
export { ApiResponseBadRequest } from './responses/400';
export { ApiResponseUnauthorized } from './responses/401';
export { ApiResponseForbidden } from './responses/403';
export { ApiResponseNotFound } from './responses/404';
export { ApiResponseConflict } from './responses/409';
export { ApiResponseInternalServerError } from './responses/500';
