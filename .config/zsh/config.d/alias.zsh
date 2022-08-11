#!/usr/bin/env zsh

# Colorize grep output (good for log files)
alias grep='grep --color=auto'
alias egrep='egrep --color=auto'
alias fgrep='fgrep --color=auto'

# confirm before overwriting something
alias cp="cp -i"
alias mv='mv -i'
alias rm='rm -i'

alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
alias ..='cd ..'
alias df='df -h'                          # human-readable sizes
alias free='free -m'                      # show sizes in MB


alias ls='exa -la --color=always --group-directories-first'
alias pr='ping rogs.me'
alias my-ip="curl ifconfig.me"
alias emacs="emacsclient -c -a 'emacs'"
alias prometeo="cd ~/code/prometeo/prometeo"
alias prometeo-vpn="sudo wg-quick down wg0 && mullvad disconnect && sudo wg-quick up wg0"

# GIT
alias gcd="git checkout develop"

# SSH
alias cloud="ssh root@cloud.rogs.me"

# Python

alias mkv="mkv .venv"

mvenv() {
    deactivate || true
    rm -rf .venv
    mkv
    pip install -r "$1"
}
