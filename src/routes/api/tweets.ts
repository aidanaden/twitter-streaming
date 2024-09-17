export async function GET() {
  const endpoint =
    "https://api.x.com/2/tweets/search/stream?expansions=author_id&user.fields=username,name,profile_image_url";
  const BEARER_TOKEN =
    "AAAAAAAAAAAAAAAAAAAAAMlvugEAAAAALpRgTI8PBJiuX0PZgJeLxnxGb2A%3DVodOxADN76K9SgV0V50Q6SvGcVf5YViW81YFWW21Kyv3XjKdYn";
  const stream = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
    },
  });
  console.log({
    limit: JSON.stringify(stream.headers.get("x-rate-limit-limit")),
    reset: JSON.stringify(stream.headers.get("x-rate-limit-reset")),
    remaining: JSON.stringify(stream.headers.get("x-rate-limit-remaining")),
  });

  if (!stream.body) {
    return new Response(
      JSON.stringify({
        error: 404,
        status: "failed to get stream from twitter",
      }),
      { status: 404, statusText: "failed to get stream from twitter" },
    );
  }

  return new Response(stream.body);
}
