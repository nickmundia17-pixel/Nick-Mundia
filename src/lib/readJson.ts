export async function readJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.ok
        ? 'Music service returned an unexpected response. Please try again.'
        : `Music service is unavailable right now (status ${res.status}). Please try again shortly.`
    );
  }
  return (await res.json()) as T;
}
