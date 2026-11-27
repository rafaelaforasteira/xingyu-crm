// Both auth bootstrap and API retries must use the same renewal operation.
const pending = new Map<string, Promise<Response>>();

export function requestSessionRefresh(url: string): Promise<Response> {
  let operation = pending.get(url);
  if (!operation) {
    const renew = () =>
      fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
    const underLock = async () => {
      // With Web Locks, a waiting tab checks whether the previous tab already
      // renewed the shared cookies before it rotates them a second time.
      const me = await fetch(url.replace(/\/refresh$/, "/me"), {
        credentials: "include",
        cache: "no-store",
      });
      if (me.ok)
        return new Response(JSON.stringify({ user: await me.json() }), {
          headers: { "Content-Type": "application/json" },
        });
      return renew();
    };
    operation = Promise.resolve(
      typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request("brainx-session:" + url, underLock)
        : renew(),
    ).finally(() => {
      pending.delete(url);
    });
    pending.set(url, operation);
  }
  return operation.then((response) => response.clone());
}
