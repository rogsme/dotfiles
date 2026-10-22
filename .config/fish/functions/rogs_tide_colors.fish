function rogs_tide_colors --description 'Set the tide prompt colors to the rogs palette'
    set -l dark 0A0A0A
    set -l raised 1E1E1E

    # Vi mode: blue for normal, green for insert, red for replace, purple for visual
    set -U tide_vi_mode_bg_color_default 6BA1E6
    set -U tide_vi_mode_bg_color_insert 50FA7B
    set -U tide_vi_mode_bg_color_replace E06C75
    set -U tide_vi_mode_bg_color_visual BDABF0
    set -U tide_vi_mode_color_default $dark
    set -U tide_vi_mode_color_insert $dark
    set -U tide_vi_mode_color_replace $dark
    set -U tide_vi_mode_color_visual $dark

    # OS icon in green on a dark segment
    set -U tide_os_bg_color $raised
    set -U tide_os_color 50FA7B

    # Path in blue
    set -U tide_pwd_bg_color 6BA1E6
    set -U tide_pwd_color_anchors $dark
    set -U tide_pwd_color_dirs $dark
    set -U tide_pwd_color_truncated_dirs 18355B

    # Git: green when clean, yellow with changes, red for conflicts and operations
    set -U tide_git_bg_color 50FA7B
    set -U tide_git_bg_color_unstable E5C07B
    set -U tide_git_bg_color_urgent E06C75
    for v in branch conflicted dirty operation staged stash untracked upstream
        set -U tide_git_color_$v $dark
    end

    # Prompt character, frame and separators
    set -U tide_character_color 50FA7B
    set -U tide_character_color_failure E06C75
    set -U tide_prompt_color_frame_and_connection 4C4C4C
    set -U tide_prompt_color_separator_same_color 808080

    # Status: green check on a dark segment, red segment when the last command failed
    set -U tide_status_bg_color $raised
    set -U tide_status_color 50FA7B
    set -U tide_status_bg_color_failure E06C75
    set -U tide_status_color_failure $dark

    # Right side: dark segments with colored text
    set -U tide_cmd_duration_bg_color $raised
    set -U tide_cmd_duration_color E5C07B
    set -U tide_context_bg_color $raised
    set -U tide_context_color_default B5B5B5
    set -U tide_context_color_root E06C75
    set -U tide_context_color_ssh E5C07B
    set -U tide_jobs_bg_color $raised
    set -U tide_jobs_color 56B6C2
    set -U tide_time_bg_color $raised
    set -U tide_time_color B5B5B5
    set -U tide_shlvl_bg_color $raised
    set -U tide_shlvl_color E5C07B
    set -U tide_private_mode_bg_color $raised
    set -U tide_private_mode_color EEEEEE
    set -U tide_direnv_bg_color $raised
    set -U tide_direnv_color E5C07B
    set -U tide_direnv_bg_color_denied E06C75
    set -U tide_direnv_color_denied $dark

    # Languages and tools, each in the palette color closest to its brand color
    for pair in aws:D19A66 bun:EEEEEE crystal:EEEEEE distrobox:BDABF0 docker:6BA1E6 elixir:BDABF0 \
            gcloud:6BA1E6 go:56B6C2 java:D19A66 kubectl:6BA1E6 nix_shell:6BA1E6 node:50FA7B \
            php:BDABF0 pulumi:E5C07B python:6BA1E6 ruby:E06C75 rustc:D19A66 terraform:BDABF0 \
            toolbox:BDABF0 zig:D19A66
        string split : $pair | read -l -L item color
        set -U tide_"$item"_bg_color $raised
        set -U tide_"$item"_color $color
    end

    tide reload
end
