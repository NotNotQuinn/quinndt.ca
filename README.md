# quinndt.ca

My personal site :)

## HTTP structure

Each direct "top level" route (e.g. `/foo/`) is its own sub-domain.

Using an NGINX config similar to below, all 404 requests to `/foo/[uri]` are sent to `/[uri]`.
This means when on `bar.quinndt.ca` and requesting the `/favicon.ico`, it will first
try `quinndt.ca/foo/favicon.ico` and then `quinndt.ca/favicon.ico` if it is missing.

###### [Thanks, stackoverflow!](https://stackoverflow.com/questions/21286850)
```nginx
upstream quinndt-web-root-server {
  server localhost:4000;
}

server {
  server_name quinndt.ca;
  server_name www.quinndt.ca;

  location / {
    proxy_set_header Host $http_host;
    proxy_intercept_errors on;
    recursive_error_pages on;
    error_page 404 = @web-root;
    proxy_pass http://quinndt-web-root-server/landing;
  }

  location @web-root {
    proxy_set_header Host $http_host;
    proxy_pass http://quinndt-web-root-server;
  }
}
```

This does not come without downsides:

There can be no custom 404 pages per subdomain, because they will be ignored in
favor of the root's 404. To avoid this, when the root gets a 404 from
`/[uri]` it should show the original 404 from `/foo/[uri]`. I don't know if this is possible.

And also redirects get all messed up because they reference the `/foo/[uri]` part,
but are sent to the client. Resulting in requests showing `/foo/[uri]` on the client side. Although they still work, because of the root 404 fallback.

Here is a play-by-play:
 1. GET `http://bar.quinndt.ca/thing.html`
 	* 301 `/foo/thing2.html` <--- Should be `/thing2.html`
 2. GET `http://bar.quinndt.ca/foo/thing2.html` <--- What the client sees
	- GET `http://quinndt.ca/foo/foo/thing2.html`
		* 404 -> try root
	- GET `http://quinndt.ca/foo/thing2.html`
		* 200 OK <--- What the client gets

Although I haven't encountered issues with these, I can see that  its possible I may in the future.
