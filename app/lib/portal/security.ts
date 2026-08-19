export type AccessDecision =
  | { allowed: true; status: 200 }
  | { allowed: false; status: 401 | 403 | 404 | 410 };

export function decideAccountAccess(input: {
  authenticated: boolean;
  accountExists: boolean;
  accountStatus?: "active" | "disabled";
}): AccessDecision {
  if (!input.authenticated) return { allowed: false, status: 401 };
  if (!input.accountExists || input.accountStatus === "disabled") {
    return { allowed: false, status: 403 };
  }
  return { allowed: true, status: 200 };
}

export function decideResourceAccess(input: {
  authenticated: boolean;
  accountExists: boolean;
  accountStatus?: "active" | "disabled";
  resourceExists: boolean;
  resourceClientId?: string;
  clientAccountId?: string;
  revoked?: boolean;
}): AccessDecision {
  const account = decideAccountAccess(input);
  if (!account.allowed) return account;
  if (!input.resourceExists) return { allowed: false, status: 404 };
  if (!input.clientAccountId || input.resourceClientId !== input.clientAccountId) {
    return { allowed: false, status: 403 };
  }
  if (input.revoked) return { allowed: false, status: 410 };
  return { allowed: true, status: 200 };
}
