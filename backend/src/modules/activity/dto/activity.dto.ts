/**
 * Activity DTO — Phase 2 Audit Log Integrity
 *
 * CreateLogDto has been intentionally removed.
 * All audit log creation is now handled internally by backend services
 * using ActivityService.logFromUser() or ActivityService.logFromSystem().
 * No client-facing DTO is needed because the POST /logs endpoint no longer exists.
 */
