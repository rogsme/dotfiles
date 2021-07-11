function certn-api
    cd ~/code/lazer/certn/certn_deps
    make up
    cd ../api_server
    source .venv/bin/activate.fish
    make up
    docker-compose logs --follow api
end
