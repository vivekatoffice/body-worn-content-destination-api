package main

import (
	"log"
	"net/http"

	"bodyworndemo-proxy-v2/internal"
)

func main() {

	cfg := internal.DefaultConfig()

	server := &internal.Server{
		Config: cfg,
	}

	proxy := internal.NewProxy(cfg.ServerAddress)

	http.Handle("/auth/v1.0", proxy)
	http.Handle("/v1.0/", proxy)

	http.HandleFunc("/api/videos", server.Videos)

	http.Handle("/", http.FileServer(http.Dir("./web")))

	log.Println("Listening on", cfg.ListenAddress)

	log.Fatal(http.ListenAndServe(cfg.ListenAddress, nil))
}
