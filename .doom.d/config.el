;;
;;  | '__/ _ \ / _` / __|    Roger González
;;  | | | (_) | (_| \__ \    https://rogs.me
;;  |_|  \___/ \__, |___/    https://git.rogs.me
;;             |___/
;;
;;; $DOOMDIR/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here! Remember, you do not need to run 'doom
;; refresh' after modifying this file!


;; These are used for a number of things, particularly for GPG configuration,
;; some email clients, file templates and snippets.
(setq user-full-name "Roger Gonzalez"
      user-mail-address "roger@rogs.me")

;; Doom exposes five (optional) variables for controlling fonts in Doom. Here
;; are the three important ones:
;;
;; + `doom-font'
;; + `doom-variable-pitch-font'
;; + `doom-big-font' -- used for `doom-big-font-mode'
;;
;; They all accept either a font-spec, font string ("Input Mono-12"), or xlfd
;; font string. You generally only need these two:
;; test
(setq doom-font (font-spec :family "monospace" :size 28)
      doom-variable-pitch-font (font-spec :family "sans"))

;; There are two ways to load a theme. Both assume the theme is installed and
;; available. You can either set `doom-theme' or manually load a theme with the
;; `load-theme' function. These are the defaults.
(setq doom-theme 'doom-oceanic-next)

;; If you intend to use org, it is recommended you change this!
(setq org-directory "~/org")

;; If you want to change the style of line numbers, change this to `relative' or
;; `nil' to disable it:
(setq display-line-numbers-type t)


;; Here are some additional functions/macros that could help you configure Doom:
;;
;; - `load!' for loading external *.el files relative to this one
;; - `use-package' for configuring packages
;; - `after!' for running code after a package has loaded
;; - `add-load-path!' for adding directories to the `load-path', where Emacs
;;   looks when you load packages with `require' or `use-package'.
;; - `map!' for binding new keys
;;
;; To get information about any of these functions/macros, move the cursor over
;; the highlighted symbol at press 'K' (non-evil users must press 'C-c g k').
;; This will open documentation for it, including demos of how they are used.
;;
;; You can also try 'gd' (or 'C-c g d') to jump to their definition and see how
;; they are implemented.

;; Set emacs logo as the default image
(setq
 +doom-dashboard-banner-file (expand-file-name "logo.png" doom-private-dir))

;; Saves emacs backups in other folder
(setq
 backup-by-copying t              ; don't clobber symlinks
 backup-directory-alist '(("." . "~/.emacs_backups"))    ; don't litter my fs tree
 delete-old-versions t
 kept-new-versions 6
 kept-old-versions 2
 version-control t)               ; use versioned backups

;; WhiteSpace Cleanup
(global-whitespace-cleanup-mode)

;; HTTP Statuses for Helm
(defvar helm-httpstatus-source
  '((name . "HTTP STATUS")
    (candidates . (("100 Continue") ("101 Switching Protocols")
                   ("102 Processing") ("200 OK")
                   ("201 Created") ("202 Accepted")
                   ("203 Non-Authoritative Information") ("204 No Content")
                   ("205 Reset Content") ("206 Partial Content")
                   ("207 Multi-Status") ("208 Already Reported")
                   ("300 Multiple Choices") ("301 Moved Permanently")
                   ("302 Found") ("303 See Other")
                   ("304 Not Modified") ("305 Use Proxy")
                   ("307 Temporary Redirect") ("400 Bad Request")
                   ("401 Unauthorized") ("402 Payment Required")
                   ("403 Forbidden") ("404 Not Found")
                   ("405 Method Not Allowed") ("406 Not Acceptable")
                   ("407 Proxy Authentication Required") ("408 Request Timeout")
                   ("409 Conflict") ("410 Gone")
                   ("411 Length Required") ("412 Precondition Failed")
                   ("413 Request Entity Too Large")
                   ("414 Request-URI Too Large")
                   ("415 Unsupported Media Type")
                   ("416 Request Range Not Satisfiable")
                   ("417 Expectation Failed") ("418 I'm a teapot")
                   ("421 Misdirected Request")
                   ("422 Unprocessable Entity") ("423 Locked")
                   ("424 Failed Dependency") ("425 No code")
                   ("426 Upgrade Required") ("428 Precondition Required")
                   ("429 Too Many Requests")
                   ("431 Request Header Fields Too Large")
                   ("449 Retry with") ("500 Internal Server Error")
                   ("501 Not Implemented") ("502 Bad Gateway")
                   ("503 Service Unavailable") ("504 Gateway Timeout")
                   ("505 HTTP Version Not Supported")
                   ("506 Variant Also Negotiates")
                   ("507 Insufficient Storage") ("509 Bandwidth Limit Exceeded")
                   ("510 Not Extended")
                   ("511 Network Authentication Required")))
    (action . message)))

(defun helm-httpstatus ()
  (interactive)
  (helm-other-buffer '(helm-httpstatus-source) "*helm httpstatus*"))

;; Multiple cursors mode
(global-set-key (kbd "C-S-c C-S-c") 'mc/edit-lines)
(global-set-key (kbd "C->") 'mc/mark-next-like-this)
(global-set-key (kbd "C-<") 'mc/mark-previous-like-this)
(global-set-key (kbd "C-c C-<") 'mc/mark-all-like-this)

;; Removes mouse from code
(mouse-avoidance-mode "animate")

;; Basic: Turn off bugging yes-or-no-p
(fset 'yes-or-no-p 'y-or-n-p)

;; PrettierJS
(eval-after-load 'js2-mode
  '(progn
     (add-hook 'js2-mode-hook #'add-node-modules-path)
     (add-hook 'js2-mode-hook #'prettier-js-mode)))

(add-hook 'web-mode-hook 'rainbow-mode)

;; Indent
(setq web-mode-markup-indent-offset 2)
(setq web-mode-css-indent-offset 2)
(setq web-mode-code-indent-offset 2)
(setq js-indent-level 2)
(setq-default tab-width 2)
(setq js-highlight-level 3)
(setq auto-indent-indent-style 'aggressive)
(require 'aggressive-indent)
(global-aggressive-indent-mode 1)

;; Relative line mode
(setq display-line-numbers-type 'relative)

;; Org Mode

;; Capture templates
(after! org
  (setq org-capture-templates
        (quote
         (
          ;; Personal templates
          ("p" "Templates for personal")
          ("pr" "Non-scheduled" entry
           (file+headline "~/org/personal.org" "Captured")
           (file "~/org/templates/basic-task.txt"))
          ("ps" "Scheduled" entry
           (file+headline "~/org/personal.org" "Captured")
           (file "~/org/templates/scheduled-task.txt"))
          ("pl" "Logbook entry for Personal" entry (file+datetree "logbook-personal.org") "** %U - %^{Activity}  :LOG:")
          ;; Massive templates
          ("m" "Templates for Massive")
          ("mc" "Templates for CocaCola")
          ("mcr" "Non-scheduled" entry
           (file+headline "~/org/Massive/CocaCola/cocacola.org" "Captured")
           (file "~/org/templates/basic-task.txt"))
          ("mcs" "Scheduled" entry
           (file+headline "~/org/Massive/CocaCola/cocacola.org" "Captured")
           (file "~/org/templates/scheduled-task.txt"))
          ("mcm" "New daily meeting" entry
           (file+datetree "~/org/Massive/CocaCola/coca-dailies.org")
           (file "~/org/templates/meeting.txt"))
          ("mck" "New Kafein mistake" entry
           (file+datetree "~/org/Massive/CocaCola/kafein-errors.org")
           (file "~/org/templates/kafein-errors.txt"))
          ("ml" "Logbook entry for Massive" entry (file+datetree "logbook-work.org") "** %U - %^{Activity}  :LOG:")
          ))))

;; Emojify mode
(add-hook 'after-init-hook #'global-emojify-mode)
