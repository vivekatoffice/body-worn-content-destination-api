package internal

type Config struct {
	ServerAddress string
	StorageRoot   string
	ListenAddress string
}

func DefaultConfig() Config {
	return Config{
		ServerAddress: "http://10.176.10.111:8080",
		StorageRoot:   "E:\\Vivek\\API_MDs\\Bodyworn\\03_06_2026\\body-worn-integration-api\\vivekblr",
		ListenAddress: ":8081",
	}
}
