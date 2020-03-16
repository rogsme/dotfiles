#
# | '__/ _ \ / _` / __|    Roger González
# | | | (_) | (_| \__ \    https://rogs.me
# |_|  \___/ \__, |___/    https://git.rogs.me
#            |___/
#
set fish_greeting ""
set -gx PATH /home/roger/.gem/ruby/2.6.0/bin $PATH
set -g theme_powerline_fonts yes
set -x VIRTUAL_ENV_DISABLE_PROMPT 1
set -g theme_color_scheme dark
set -g theme_display_date no
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
alias rm='rm -i'

source "$HOME/.config/fish/abbreviations.fish"
source "$HOME/.config/fish/personal_abbr.fish"

# tabtab source for packages
# uninstall by removing these lines
[ -f ~/.config/tabtab/__tabtab.fish ]; and . ~/.config/tabtab/__tabtab.fish; or true
