function update-zen --description "Update Zen Browser via debian packaging script"
    function require_cmd
        for cmd in $argv
            if not command -qs $cmd
                echo "❌ Missing required command: $cmd"
                echo "   Try: sudo apt update && sudo apt install $cmd"
                return 1
            end
        end
    end

    # Sanity checks
    require_cmd git wget dpkg
    or return 1

    # Pick tarball URL based on arch
    set arch (uname -m)
    switch $arch
        case x86_64
            set ZEN_TARBALL_URL https://github.com/zen-browser/desktop/releases/latest/download/zen.linux-x86_64.tar.xz
        case aarch64 arm64
            set ZEN_TARBALL_URL https://github.com/zen-browser/desktop/releases/latest/download/zen.linux-aarch64.tar.xz
        case '*'
            echo "⚠️  Unknown arch '$arch', defaulting to x86_64"
            set ZEN_TARBALL_URL https://github.com/zen-browser/desktop/releases/latest/download/zen.linux-x86_64.tar.xz
    end

    # Create temp dir
    set workdir (mktemp -d /tmp/zen-update.XXXXXX)
    echo "🛠️  Working in $workdir"
    cd $workdir

    # Clone packager repo
    echo "⬇️  Cloning repo…"
    git clone --depth=1 https://github.com/sh4r10/zen-browser-debian.git
    or return 1
    cd zen-browser-debian

    # Download tarball
    echo "⬇️  Downloading Zen for $arch…"
    wget --progress=bar:force $ZEN_TARBALL_URL
    or return 1

    # Build deb
    echo "📦 Building .deb…"
    chmod +x ./create-zen-deb.sh
    ./create-zen-deb.sh
    or return 1

    # Find newest .deb
    set deb (/usr/bin/ls -t *.deb 2>/dev/null)
    if test -z "$deb"
        echo "❌ No .deb generated."
        return 1
    end
    echo "✅ Built: $deb"

    # Install with sudo if needed
    if test (id -u) -ne 0
        set sudo_prefix sudo
    else
        set sudo_prefix ""
    end

    echo "💿 Installing…"
    if not $sudo_prefix dpkg -i "$deb"
        echo "⚠️  Missing deps, trying apt -f install…"
        if command -qs apt
            $sudo_prefix apt -f install -y
            $sudo_prefix dpkg -i "$deb"
        else
            echo "❌ Could not fix dependencies automatically."
            return 1
        end
    end

    echo "🎉 Zen Browser updated!"
    echo "🧹 Cleaning up $workdir"

    cd 
    # rm -rf $workdir
end



