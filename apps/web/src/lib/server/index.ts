export { prisma } from './db';
export { getCorrelationId, withCorrelationHeaders } from './correlation';
export {
  AppError,
  errorResponse,
  successResponse,
  handleRouteError,
  type ErrorCode,
  type ApiErrorBody,
} from './errors';
export {
  requireTenantContext,
  assertTenantMatch,
  tenantWhere,
  tenantWhereWithId,
  withTenantScope,
  createTenantRepository,
  type TenantContext,
} from './tenancy';
export { getTracer, withSpan, spanAttributes } from './tracing';
export { initSentry, captureError } from './sentry';
export {
  validateCsrfToken,
  withSecurityHeaders,
  sanitizeHtml,
  validateOrigin,
} from './security';
export {
  redactPiiFromObject,
  redactPiiFromString,
  safeLogContext,
  redactHeaders,
} from './pii';
export {
  writeAuditEvent,
  getAuditTrail,
  type AuditAction,
  type AuditEntry,
} from './audit';
export {
  checkRateLimit,
  checkUserRateLimit,
  RATE_LIMITS,
} from './rate-limit';
export {
  verifyWebhookSignature,
  checkIdempotencyKey,
  storeIdempotencyKey,
  WEBHOOK_CONFIGS,
  type WebhookVerifyOptions,
} from './webhook';
export {
  registerUser,
  loginUser,
  logoutUser,
  authenticateRequest,
  requestPasswordReset,
  resetPassword,
  verifyAccessToken,
  type TokenPair,
  type JwtPayload,
  type AuthenticatedContext,
} from './auth';
export {
  defineAbilitiesFor,
  assertCan,
  type AppAbility,
  type RbacContext,
} from './rbac';
export {
  getOrCreateSubscription,
  getSubscriptionWithLimits,
  changePlan,
  checkPlanLimit,
  PLAN_LIMITS,
  type PlanName,
} from './billing';
export {
  getFlag,
  isEnabled,
  setFlagOverride,
  clearFlagOverride,
  clearAllOverrides,
  getAllFlags,
  getFlagDefinitions,
} from './flags';
