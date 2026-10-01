export async function runUiAction(action, onError, onSuccess) {
  try {
    const result = await action();
    onSuccess?.();
    return result;
  } catch (error) {
    onError(error);
    return undefined;
  }
}
