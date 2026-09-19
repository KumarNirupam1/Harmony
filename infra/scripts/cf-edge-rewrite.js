// CloudFront viewer-request Function (cloudfront-js-2.0).
// Rewrites clean route paths to the S3 object Next.js emits under
// `output: export` + `trailingSlash: true` (e.g. /planner/ -> /planner/index.html).
// Paths that already end in a file extension (static assets, RSC payloads) are left alone.
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (uri !== "/" && !/\.[a-z0-9]+$/i.test(uri)) {
    request.uri = uri.endsWith("/") ? uri + "index.html" : uri + "/index.html";
  }

  return request;
}