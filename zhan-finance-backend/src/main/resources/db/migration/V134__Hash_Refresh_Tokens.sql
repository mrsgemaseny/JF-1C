-- Refresh tokens are now stored as SHA-256 hex digests (64 chars). Existing rows hold raw
-- values that the application can no longer match, so every live session is revoked once.
-- Users re-authenticate on their next refresh; access tokens expire within 15 minutes.
UPDATE refresh_tokens
SET is_revoked = TRUE,
    revoked_at = NOW()
WHERE is_revoked = FALSE;
