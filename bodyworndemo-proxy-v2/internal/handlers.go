package internal

import (
	"encoding/json"
	"net/http"
)

type Server struct {
	Config Config
}

func (s *Server) Videos(w http.ResponseWriter, r *http.Request) {

	files, err := ListVideos(s.Config.StorageRoot)

	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}
