function doom
    if test (count $argv) -gt 0
        if test $argv[1] = "upgrade"
            set_color yellow
            echo "🚀 Running: doom $argv"
            set_color normal

            # make sure node 22 is active
            nvm install 22 >/dev/null
            nvm use 22

            command doom $argv
            if test $status -eq 0
                set_color green
                echo "✅ doom upgrade completed"
                set_color normal

                set_color yellow
                echo "🔧 Running: doom sync --rebuild"
                set_color normal

                command doom sync --rebuild
                if test $status -eq 0
                    set_color green
                    echo "✅ doom sync --rebuild completed"
                else
                    set_color red
                    echo "❌ doom sync --rebuild failed"
                end
                set_color normal
            else
                set_color red
                echo "❌ doom upgrade failed, skipping sync --rebuild"
                set_color normal
            end
            return
        end
    end

    # fallback to normal doom for other subcommands
    command doom $argv
end
