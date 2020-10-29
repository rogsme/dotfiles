;;; $DOOMDIR/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here! Remember, you do not need to run 'doom
;; sync' after modifying this file!


;; Some functionality uses this to identify you, e.g. GPG configuration, email
;; clients, file templates and snippets.
(setq user-full-name "Roger Gonzalez"
      user-mail-address "roger@rogs.me")

;; Doom exposes five (optional) variables for controlling fonts in Doom. Here
;; are the three important ones:
;;
;; + `doom-font'
;; + `doom-variable-pitch-font'
;; + `doom-big-font' -- used for `doom-big-font-mode'; use this for
;;   presentations or streaming.
;;
;; They all accept either a font-spec, font string ("Input Mono-12"), or xlfd
;; font string. You generally only need these two:
;; (setq doom-font (font-spec :family "monospace" :size 12 :weight 'semi-light)
;;       doom-variable-pitch-font (font-spec :family "sans" :size 13))
(setq doom-font (font-spec :family "Source Code Pro Medium" :size 15)
      doom-variable-pitch-font (font-spec :family "sans")
      doom-big-font (font-spec :family "Source Code Pro Medium" :size 24))

(after! doom-themes
  (setq doom-themes-enable-bold t
        doom-themes-enable-italic t))
(custom-set-faces!
  '(font-lock-comment-face :slant italic)
  '(font-lock-keyword-face :slant italic))

;; There are two ways to load a theme. Both assume the theme is installed and
;; available. You can either set `doom-theme' or manually load a theme with the
;; `load-theme' function. This is the default:

(setq doom-theme 'doom-material)

;; If you use `org' and don't want your org files in the default location below,
;; change `org-directory'. It must be set before org loads!
(setq org-directory "~/org/")

;; This determines the style of line numbers in effect. If set to `nil', line
;; numbers are disabled. For relative line numbers, set this to `relative'.
(setq display-line-numbers-type 'relative)


;; Here are some additional functions/macros that could help you configure Doom:
;;
;; - `load!' for loading external *.el files relative to this one
;; - `use-package!' for configuring packages
;; - `after!' for running code after a package has loaded
;; - `add-load-path!' for adding directories to the `load-path', relative to
;;   this file. Emacs searches the `load-path' when you load packages with
;;   `require' or `use-package'.
;; - `map!' for binding new keys
;;
;; To get information about any of these functions/macros, move the cursor over
;; the highlighted symbol at press 'K' (non-evil users must press 'C-c c k').
;; This will open documentation for it, including demos of how they are used.
;;
;; You can also try 'gd' (or 'C-c c d') to jump to their definition and see how
;; they are implemented.
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

(after! typescript-mode
  (add-hook 'typescript-mode-hook #'prettier-js-mode))

(add-hook 'web-mode-hook 'rainbow-mode)

;; Indent
(setq web-mode-markup-indent-offset 2)
(setq web-mode-css-indent-offset 2)
(setq web-mode-code-indent-offset 2)
(setq js-indent-level 2)
(setq-default tab-width 2)
(setq js-highlight-level 3)
(setq auto-indent-indent-style 'aggressive)
;; (require 'aggressive-indent)
;; (global-aggressive-indent-mode 1)

;; Org Mode
(after! org
  ;; Include diary
  (setq org-agenda-include-diary t)
  ;; Logs
  (setq org-log-state-notes-insert-after-drawers nil
        org-log-into-drawer t
        org-log-done 'time
        org-log-repeat 'time
        org-log-redeadline 'note
        org-log-reschedule 'note)
  ;; Keyword and faces
  (setq-default org-todo-keywords
                '((sequence "TODO(t!)" "IN_PROGRESS(i!)" "WAIT(w@/!)" "SOMEDAY(s!)" "|" "DONE(d@/!)" "CANCELLED(c@/!)")))
  (setq-default org-todo-keyword-faces
                '(( "TODO" . (:foreground "white" :background "darkorchid4" :weight bold))
                  ( "IN_PROGRESS" . (:background "deeppink3" :weight bold))
                  ( "WAIT" (:background "red" :weight bold))
                  ( "SOMEDAY" . (:foreground "white" :background "#00807E" :weight bold))
                  ( "DONE" . (:foreground "white" :background "forest green" :weight bold))
                  ( "CANCELLED" . (:foreground "light gray" :slant italic))));; Priorities
  ;; A: Do it now
  ;; B: Decide when to do it
  ;; C: Delegate it
  ;; D: Just an idea
  (setq org-highest-priority ?A)
  (setq org-lowest-priority ?D)
  (setq org-default-priority ?B)
  (setq org-priority-faces '((?A . (:foreground "white" :background "dark red" :weight bold))
                             (?B . (:foreground "white" :background "dark green" :weight bold))
                             (?C . (:foreground "yellow"))
                             (?D . (:foreground "gray"))))
  ;; Capture templates
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
          ("pl" "Logbook entry for Personal" entry (file+datetree "logbook-personal.org") "** %U - %^{Activity} :LOG:")
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
          ("ml" "Logbook entry for Massive" entry (file+datetree "logbook-work.org") "** %U - %^{Activity} :LOG:")
          ;; Tarmac templates
          ("t" "Templates for Tarmac")
          ("tv" "Templates for Volition")
          ("tvr" "Non-scheduled" entry
           (file+headline "~/org/Tarmac/Volition/volition.org" "Captured")
           (file "~/org/templates/basic-task.txt"))
          ("tvs" "Scheduled" entry
           (file+headline "~/org/Tarmac/Volition/volition.org" "Captured")
           (file "~/org/templates/scheduled-task.txt"))
          ("tvt" "New standup" entry
           (file+datetree "~/org/Tarmac/Volition/standups.org")
           (file "~/org/templates/standup.txt"))
          ("tve" "New EOD email" entry
           (file+datetree "~/org/Tarmac/Volition/eod-emails.org")
           (file "~/org/templates/tarmac-eod-email-template.txt"))
          ("tl" "Logbook entry for Tarmac" entry (file+datetree "~/org/Tarmac/logbook-tarmac.org") "** %U - %^{Activity} :LOG:")
          )))
  ;; Enforce ordered tasks
  (setq org-enforce-todo-dependencies t)
  (setq org-enforce-todo-checkbox-dependencies t))

;; Emojify mode
(add-hook 'after-init-hook #'global-emojify-mode)

;; My own menu
(map! :leader
      (:prefix-map ("a" . "applications")
       ;; ispell
       :desc "Open vterm" "v" #'vterm
       :desc "HTTP Status cheatsheet" "h" #'helm-httpstatus
       :desc "Run ispell" "i" #'ispell
       ))

;; Autofill mode
(add-hook 'text-mode-hook 'auto-fill-mode)
(setq-default fill-column 80)

;; LSP eslint config
(setq lsp-eslint-server-command
      '("node"
        "/home/roger/.vscode-oss/extensions/vscode-eslint-release-2.1.5/server/out/eslintServer.js"
        "--stdio"))
;; For some reason, eslint disables document hightlight so I'm reenabling it
(add-hook 'lsp-on-idle-hook 'lsp-document-highlight)

(after! python
  :init
  (setq lsp-pyls-plugins-pylint-enabled t)
  (setq lsp-pyls-plugins-autopep8-enabled nil)
  (setq lsp-pyls-plugins-pyflakes-enabled nil)
  (setq lsp-pyls-plugins-pycodestyle-enabled nil)
  (setq lsp-pyls-configuration-sources "pep8")
  (add-hook 'before-save-hook 'lsp-format-buffer))
