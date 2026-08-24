package main

import "net/http"

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ola mundo"))
	})
	http.ListenAndServe(":3002", nil)
}
