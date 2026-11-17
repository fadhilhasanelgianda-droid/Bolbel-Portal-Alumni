import { compare, hash } from '@node-rs/bcrypt';

/**
 * Native bcrypt: the work runs on libuv's threadpool, so a login burst doesn't stall the event loop
 * (bcryptjs, pure JS, blocked it for ~300 ms per hash). Hashes are the standard $2b$ format and stay
 * interchangeable with the ones bcryptjs already stored.
 */
const COST = 12;

export const hashPassword = (password: string) => hash(password, { cost: COST });
export const verifyPassword = (password: string, passwordHash: string) => compare(password, passwordHash);

/** Precomputed (cost 12) hash of a throwaway string: compared against when the email is unknown so login timing stays flat. */
export const DUMMY_HASH = '$2b$12$91Gl.qkpV2HXXXQ639AIIuQUEOdnT7/WSBf8rFcMGoQw9JWJirGii';
