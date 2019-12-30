#
# ~/.profile
#
#

[[ "$XDG_CURRENT_DESKTOP" == "KDE" ]] || export QT_QPA_PLATFORMTHEME="qt5ct"
export EDITOR=/usr/bin/nano
export TERM=xterm-256color
[[ -f ~/.extend.profile ]] && . ~/.extend.profile
