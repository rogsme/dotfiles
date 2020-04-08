;;; ui.el --- rogs default ui configuration
;;
;;; Commentary:
;;
;; My default configuration for UI
;;
;;; Code:

;; Theme
(load-theme 'bliss t)
(set-frame-font "Source Code Pro Medium 11")

;; Line number
(global-linum-mode 1)
(line-number-mode 1)

;; Column number
(column-number-mode 1)

;; Parentesis highlight
(show-paren-mode 1)

;; NO scrollbar, NO toolbar NO menubar
(scroll-bar-mode -1)
(tool-bar-mode -1)
(menu-bar-mode -1)
(horizontal-scroll-bar-mode -1)

;; Basic: Maximize Buffer
(when (fboundp 'winner-mode)
  (winner-mode 1))

;; Electric pair mode
(electric-pair-mode 1)
(push '(?\' . ?\') electric-pair-pairs)
(push '(?\` . ?\`) electric-pair-pairs)

;; Removes mouse from code
(mouse-avoidance-mode "animate")

;; Selection highlight
(delete-selection-mode 1)

;; Basic: Turn off bugging yes-or-no-p
(fset 'yes-or-no-p 'y-or-n-p)

;; Tabs with spaces
(setq-default indent-tabs-mode nil)

;; Delete selection mode
(delete-selection-mode 1)

;; Wind move
(windmove-default-keybindings 'meta)

;; Start maximized
(add-to-list 'default-frame-alist '(fullscreen . maximized))

;; Overriding background color
(set-background-color "black")

(provide 'rogs-ui)
;;; rogs-ui.el ends here
