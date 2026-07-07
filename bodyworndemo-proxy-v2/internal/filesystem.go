package internal

import (
	"os"
	"path/filepath"
)

func ListVideos(root string) ([]Video, error) {

	var videos []Video

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {

		if err != nil {
			return nil
		}

		if info.IsDir() {
			return nil
		}

		videos = append(videos, Video{
			Name: info.Name(),
			Size: info.Size(),
			Path: path,
		})

		return nil
	})

	return videos, err
}
