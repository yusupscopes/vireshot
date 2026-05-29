#!/bin/bash

# This script runs during building the sandbox template
# and makes sure the Next.js app is (1) running and (2) the `/` page is compiled
function ping_server() {
	counter=0
	max_attempts=600
	response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
	while [[ "${response}" -ne 200 ]]; do
	  ((counter++))
	  if (( counter % 20 == 0 )); then
	    echo "Waiting for server to start..."
	  fi
	  if (( counter >= max_attempts )); then
	    echo "Server did not become ready in time" >&2
	    return 1
	  fi
	  sleep 0.1
	  response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
	done
}

ping_server &
cd /home/user && npx next dev --turbopack