export class AccountRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function accountRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
  ownerId?: string | null,
): Promise<T> {
  const response = await fetch(path, {
    method,
    signal,
    headers: ownerId ? { "X-Bracket-Owner": ownerId } : {},
    cache: "no-store",
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : {
          headers: {
            "Content-Type": "application/json",
            ...(ownerId ? { "X-Bracket-Owner": ownerId } : {}),
          },
          body: JSON.stringify(body),
        }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new AccountRequestError(
      response.status,
      data.error || "Unable to reach account storage. Please retry.",
    );
  return data as T;
}
