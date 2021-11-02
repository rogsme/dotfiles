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

(setq doom-font (font-spec :family "Mononoki Nerd Font" :size 14)
      doom-variable-pitch-font (font-spec :family "sans")
      doom-big-font (font-spec :family "Mononoki Nerd Font" :size 24))

;; There are two ways to load a theme. Both assume the theme is installed and
;; available. You can either set `doom-theme' or manually load a theme with the
;; `load-theme' function. This is the default:
(after! doom-themes
  (setq doom-themes-enable-bold t
        doom-themes-enable-italic t))
(custom-set-faces!
  '(font-lock-comment-face :slant italic)
  '(font-lock-keyword-face :slant italic))
(setq doom-theme 'doom-oceanic-next)

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

;; Removes mouse from code
;; (mouse-avoidance-mode "animate")


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
                  ( "CANCELLED" . (:foreground "light gray" :slant italic))))
  ;; Priorities
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
          ("pl" "Logbook entry for Personal" entry (file+olp+datetree "logbook-personal.org") "** %U - %^{Tags}\n%?")
          ;; Lazer templates
          ("l" "Templates for Lazer")
          ("lc" "Templates for Certn")
          ("lct" "Tasks" entry
           (file+headline "~/org/Tarmac/Volition/volition.org" "Captured")
           (file "~/org/templates/basic-task.txt"))
          ("lcs" "Spike" entry (file certn/new-spike)  (file "~/org/templates/spike.txt"))
          ("lcl" "Logbook entry for Certn" entry (file+olp+datetree "~/org/Lazer/Certn/logbook-certn.org") "** %U - %^{Tags}\n%?")
          ("ll" "Logbook entry for Lazer" entry (file+olp+datetree "~/org/Lazer/logbook-lazer.org") "** %U - %^{Tags}\n%?")
          )))
  ;; Enforce ordered tasks
  (setq org-enforce-todo-dependencies t)
  (setq org-enforce-todo-checkbox-dependencies t)
  (require 'org-bullets)
  (add-hook 'org-mode-hook (lambda () (org-bullets-mode 1))))


;; My own menu
(map! :leader
      (:prefix-map ("a" . "applications")
       ;; ispell
       :desc "Open vterm" "v" #'vterm
       :desc "HTTP Status cheatsheet" "h" #'helm-httpstatus
       :desc "Run ispell" "i" #'ispell
       ))


;; Python

(require 'auto-virtualenv)
(after! python
  :init
  (add-hook 'python-mode-hook 'auto-virtualenv-set-virtualenv))

(add-hook 'prog-mode-hook (lambda () (symbol-overlay-mode t)))
(setq enable-local-variables :all)

;; (use-package python-pytest
;;  :custom
;;  (python-pytest-executable "/home/roger/code/lazer/certn/api_server/.docker-python-tests.sh"))
(elpy-enable)
(after! elpy
  (set-company-backend! 'elpy-mode
    '(elpy-company-backend :with company-files company-yasnippet)))
(setq elpy-rpc-timeout 10)
(remove-hook 'elpy-modules 'elpy-module-flymake)


(defun certn/new-spike ()
  "Create a new org spike in ~/org/Lazer/Certn/."
  (interactive)
  (let ((name (read-string "Ticket: ")))
    (expand-file-name (format "%s.org" name) "~/org/Lazer/Certn/Spikes")))

