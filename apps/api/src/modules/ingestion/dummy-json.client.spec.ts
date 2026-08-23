import { DummyJsonClient } from './dummy-json.client';

describe('DummyJsonClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches the full product dataset through the configured adapter', async () => {
    const payload = { products: [], total: 0, skip: 0, limit: 0 };
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(new DummyJsonClient().fetchProducts()).resolves.toEqual(
      payload,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchSpy.mock.calls[0][0];
    expect(requestedUrl).toBeInstanceOf(URL);
    if (!(requestedUrl instanceof URL)) {
      throw new Error('DummyJSON request did not use a URL');
    }
    expect(requestedUrl.href).toContain('/products?limit=0');
  });

  it('maps transport failures to EXTERNAL_DATA_ERROR', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network failure'));

    await expect(new DummyJsonClient().fetchProducts()).rejects.toMatchObject({
      code: 'EXTERNAL_DATA_ERROR',
      status: 502,
    });
  });
});
