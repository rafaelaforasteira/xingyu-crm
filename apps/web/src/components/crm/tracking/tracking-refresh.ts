/** One in-flight refresh per mounted overview, including the short visual feedback period. */
export function createTrackingRefresh() {
  let running = false;
  return async ({
    isFetching,
    refetch,
    onPending,
    onSuccess,
    onError,
  }: {
    isFetching: boolean;
    refetch: () => Promise<{ isError: boolean }>;
    onPending: (pending: boolean) => void;
    onSuccess: () => void;
    onError: () => void;
  }) => {
    if (running || isFetching) return;
    running = true;
    onPending(true);
    try {
      const [result] = await Promise.all([
        refetch(),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);
      if (result.isError) onError();
      else onSuccess();
    } catch {
      onError();
    } finally {
      running = false;
      onPending(false);
    }
  };
}
