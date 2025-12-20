function tunnl -d "Expose a local port via tunnl.gg"
    if test (count $argv) -ne 1
        echo "Usage: tunnl <local_port>"
        echo "Example: tunnl 1313"
        return 1
    end

    set -l local_port $argv[1]

    if not string match -qr '^[0-9]+$' -- $local_port
        echo "tunnl: local_port must be a number (got: $local_port)"
        return 1
    end

    echo "Starting tunnel for localhost:$local_port… (Ctrl+C to stop)"
    command ssh -t -R 80:localhost:$local_port proxy.tunnl.gg
end
