#!/usr/bin/env zsh

### SETUP ABREVIATIONS ###
# declare a list of expandable aliases to fill up later
typeset -a ealiases
ealiases=()

# write a function for adding an alias to the list mentioned above
function abbrev-alias() {
    alias $1
    ealiases+=(${1%%\=*})
}

# expand any aliases in the current line buffer
function expand-ealias() {
    if [[ $LBUFFER =~ "\<(${(j:|:)ealiases})\$" ]]; then
        zle _expand_alias
        zle expand-word
    fi
    zle magic-space
}
zle -N expand-ealias

# Bind the space key to the expand-alias function above, so that space will expand any expandable aliases
bindkey ' '        expand-ealias
bindkey '^ '       magic-space     # control-space to bypass completion
bindkey -M isearch " "      magic-space     # normal space during searches

# A function for expanding any aliases before accepting the line as is and executing the entered command
expand-alias-and-accept-line() {
    expand-ealias
    zle .backward-delete-char
    zle .accept-line
}
zle -N accept-line expand-alias-and-accept-line

# Arch
abbrev-alias i='sudo pacman -S'
abbrev-alias r='sudo pacman -Rsu'

# NPM
abbrev-alias ni='npm install'
abbrev-alias nis='npm install --save'
abbrev-alias nisd='npm install --save-dev'
abbrev-alias nig='npm install -g'
abbrev-alias np='npm prune'
abbrev-alias nl='npm list'
abbrev-alias nr='npm remove'
abbrev-alias nu='npm update'
abbrev-alias ns='npm start'
abbrev-alias nt='npm test'

# Git
abbrev-alias g='git'
abbrev-alias ga.='git add .'
abbrev-alias ga='git add'
abbrev-alias gb='git branch'
abbrev-alias gbd='git branch -D'
abbrev-alias gcm='git checkout master'
abbrev-alias gco='git checkout'
abbrev-alias gcob='git checkout -b'
abbrev-alias gcod='git checkout development'
abbrev-alias gi='gitignore'
abbrev-alias gm='git merge'
abbrev-alias gpl='git pull'
abbrev-alias gps='git push'
abbrev-alias gpsu='git push -u origin master'
abbrev-alias gs='git status'
abbrev-alias gc='git clone'
abbrev-alias gd='git diff'
abbrev-alias gcd='git checkout develop'
abbrev-alias gpd='git pull origin develop'
abbrev-alias gpm='git pull origin master'
abbrev-alias gst='git stash'
abbrev-alias gsta='git stash apply'
abbrev-alias gr='git reset --hard'

# <a href="https://github.com/petervanderdoes/gitflow-avh">Git Flow AVH</a>
abbrev-alias gf='git flow'
abbrev-alias gfi='git flow init -d'

abbrev-alias gff='git flow feature'
abbrev-alias gffs='git flow feature start'
abbrev-alias gfff='git flow feature finish'
abbrev-alias gffp='git flow feature publish'
abbrev-alias gfft='git flow feature track'
abbrev-alias gffco='git flow feature checkout'
abbrev-alias gfr='git flow release'
abbrev-alias gfrs='git flow release start'
abbrev-alias gfrf='git flow release finish'
abbrev-alias gfrp='git flow release publish'
abbrev-alias gfrt='git flow release track'
abbrev-alias gfrco='git flow release checkout'
abbrev-alias gfb='git flow bugfix'
abbrev-alias gfbs='git flow bugfix start'
abbrev-alias gfbf='git flow bugfix finish'
abbrev-alias gfbp='git flow bugfix publish'
abbrev-alias gfbt='git flow bugfix track'
abbrev-alias gfbco='git flow bugfix checkout'
abbrev-alias gfh='git flow hotfix'
abbrev-alias gfhs='git flow hotfix start'
abbrev-alias gfhf='git flow hotfix finish'
abbrev-alias gfhp='git flow hotfix publish'
abbrev-alias gfht='git flow hotfix track'
abbrev-alias gfhco='git flow hotfix checkout'
