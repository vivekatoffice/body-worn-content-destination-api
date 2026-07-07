package internal

import (
	"net/http"
	"net/http/httputil"
	"net/url"
)

func NewProxy(target string) http.Handler {

	u, _ := url.Parse(target)

	return httputil.NewSingleHostReverseProxy(u)
}
