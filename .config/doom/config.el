;;; $DOOMDIR/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here! Remember, you do not need to run 'doom
;; sync' after modifying this file!


;; Some functionality uses this to identify you, e.g. GPG configuration, email
;; clients, file templates and snippets.
(setq user-full-name "Roger Gonzalez"
      user-mail-address "roger@rogs.me")

;; Add custom packages
(add-to-list 'load-path "~/.config/doom/custom-packages")

;; Load custom packages
(require 'screenshot)
(require 'ox-slack)
(require 'deferred)
(require 'private) ;; Private file. Generate manually

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
(setq doom-font (font-spec :family "MesloLGS NF" :size 14)
      doom-variable-pitch-font (font-spec :family "sans")
      doom-big-font (font-spec :family "MesloLGS NF" :size 24))

;; There are two ways to load a theme. Both assume the theme is installed and
;; available. You can either set `doom-theme' or manually load a theme with the
;; `load-theme' function. This is the default:
(after! doom-themes
  (setq doom-themes-enable-bold t
        doom-themes-enable-italic t))
(custom-set-faces!
  '(font-lock-comment-face :slant italic)
  '(font-lock-keyword-face :slant italic))
(setq doom-theme 'doom-badger)

;; If you use `org' and don't want your org files in the default location below,
;; change `org-directory'. It must be set before org loads!
(setq org-directory "~/org/")
(setq org-roam-directory "~/roam/")

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

;; Org Mode
(after! org
  ;; Include diary
  (setq org-agenda-include-diary t)
  ;; Logs
  (setq org-log-state-notes-insert-after-drawers nil
        org-log-into-drawer "LOGBOOK"
        org-log-done 'time
        org-log-repeat 'time
        org-log-redeadline 'note
        org-log-reschedule 'note)
  ;; Keyword and faces
  (setq-default org-todo-keywords
                '((sequence "REPEAT(r)" "NEXT(n@/!)" "DELEGATED(e@/!)" "TODO(t@/!)" "WAITING(w@/!)" "SOMEDAY(s@/!)" "PROJ(p)" "|" "DONE(d@)" "CANCELLED(c@/!)" "FORWARDED(f@)")))
  (setq-default org-todo-keyword-faces
                '(
                  ( "REPEAT" . (:foreground "white" :background "indigo" :weight bold))
                  ( "NEXT" . (:foreground "red" :background "orange" :weight bold))
                  ( "DELEGATED" . (:foreground "white" :background "blue" :weight bold))
                  ( "TODO" . (:foreground "white" :background "violet" :weight bold))
                  ( "WAITING" (:foreground "white" :background "#A9BE00" :weight bold))
                  ( "SOMEDAY" . (:foreground "white" :background "#00807E" :weight bold))
                  ( "PROJ" . (:foreground "white" :background "deeppink3" :weight bold))
                  ( "DONE" . (:foreground "white" :background "forest green" :weight bold))
                  ( "CANCELLED" . (:foreground "light gray" :slant italic))
                  ( "FORWARDED" . (:foreground "light gray" :slant italic))
                  ))
  (setq org-fontify-done-headline t)
  (setq org-fontify-todo-headline t)
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
          ("G" "Define a goal" entry (file+headline "~/org/capture.org" "Capture") (file "~/org/templates/goal.org") :empty-lines-after 1)
          ("R" "REPEAT entry" entry (file+headline "~/org/capture.org" "Capture") (file "~/org/templates/repeat.org") :empty-lines-before 1)
          ("N" "NEXT entry" entry (file+headline "~/org/capture.org" "Capture") (file "~/org/templates/next.org") :empty-lines-before 1)
          ("T" "TODO entry" entry (file+headline "~/org/capture.org" "Capture") (file "~/org/templates/todo.org") :empty-lines-before 1)
          ("W" "WAITING entry" entry (file+headline "~/org/capture.org" "Capture") (file "~/org/templates/waiting.org") :empty-lines-before 1)
          ("S" "SOMEDAY entry" entry (file+headline "~/org/capture.org" "Capture") (file "~/org/templates/someday.org") :empty-lines-before 1)
          ("P" "PROJ entry" entry (file+headline "~/org/capture.org" "Capture") (file "~/org/templates/proj.org") :empty-lines-before 1)
          ("B" "Book on the to-read-list" entry (file+headline "~/org/private.org" "Libros para leer") (file "~/org/templates/book.org") :empty-lines-after 2)
          ("p" "Create a daily plan")
          ("pP" "Daily plan private" plain (file+olp+datetree "~/org/plan-free.org") (file "~/org/templates/dailyplan.org") :immediate-finish t :jump-to-captured t)
          ("pX" "Daily plan X-Team" plain (file+olp+datetree "~/org/plan-xteam.org") (file "~/org/templates/dailyplan.org") :immediate-finish t :jump-to-captured t)
          ("j" "Journal entry")
          ("jP" "Journal entry private" entry (file+olp+datetree "~/org/journal-private.org") "** %U - %^{Heading}")
          ("jX" "Journal entry X-Team" entry (file+olp+datetree "~/org/journal-xteam.org") "** %U - %^{Heading}")
          )))
  ;; Custom agenda views
  (setq org-agenda-custom-commands
        (quote
         (
          ("A" . "Agendas")
          ("AT" "Daily overview"
           ((tags-todo "URGENT"
                       ((org-agenda-overriding-header "Urgent Tasks")))
            (tags-todo "RADAR"
                       ((org-agenda-overriding-header "On my radar")))
            (tags-todo "PHONE+TODO=\"NEXT\""
                       ((org-agenda-overriding-header "Phone Calls")))
            (tags-todo "COMPANY"
                       ((org-agenda-overriding-header "Cuquitoni")))
            (tags-todo "SHOPPING"
                       ((org-agenda-overriding-header "Shopping")))
            (tags-todo "Depth=\"Deep\"/NEXT"
                       ((org-agenda-overriding-header "Next Actions requiring deep work")))
            (agenda ""
                    ((org-agenda-overriding-header "Today")
                     (org-agenda-span 1)
                     (org-agenda-start-day "1d")
                     (org-agenda-sorting-strategy
                      (quote
                       (time-up priority-down)))))
            nil nil))
          ("AW" "Weekly overview" agenda ""
           ((org-agenda-overriding-header "Weekly overview")))
          ("AM" "Monthly overview" agenda ""
           ((org-agenda-overriding-header "Monthly overview"))
           (org-agenda-span
            (quote month))
           (org-deadline-warning-days 0)
           (org-agenda-sorting-strategy
            (quote
             (time-up priority-down tag-up))))
          ("W" . "Weekly Review Helper")
          ("Wn" "New tasks" tags "NEW"
           ((org-agenda-overriding-header "NEW Tasks")))
          ("Wd" "Check DELEGATED tasks" todo "DELEGATED"
           ((org-agenda-overriding-header "DELEGATED tasks")))
          ("Ww" "Check WAITING tasks" todo "WAITING"
           ((org-agenda-overriding-header "WAITING tasks")))
          ("Ws" "Check SOMEDAY tasks" todo "SOMEDAY"
           ((org-agenda-overriding-header "SOMEDAY tasks")))
          ("Wf" "Check finished tasks" todo "DONE|CANCELLED|FORWARDED"
           ((org-agenda-overriding-header "Finished tasks")))
          ("WP" "Planing ToDos (unscheduled) only" todo "TODO|NEXT"
           ((org-agenda-overriding-header "To plan")
            (org-agenda-skip-function
             (quote
              (org-agenda-skip-entry-if
               (quote scheduled)
               (quote deadline)))))))
         ))
  ;;
  ;; Enforce ordered tasks
  (setq org-enforce-todo-dependencies t)
  (setq org-enforce-todo-checkbox-dependencies t)
  (setq org-track-ordered-property-with-tag t)

  ;; Org bullets
  (require 'org-bullets)
  (add-hook 'org-mode-hook (lambda () (org-bullets-mode 1)))

  ;; Org recur
  (use-package org-recur
    :hook ((org-mode . org-recur-mode)
           (org-agenda-mode . org-recur-agenda-mode))
    :demand t
    :config
    (define-key org-recur-mode-map (kbd "C-c d") 'org-recur-finish)

    ;; Rebind the 'd' key in org-agenda (default: `org-agenda-day-view').
    (define-key org-recur-agenda-mode-map (kbd "C-c d") 'org-recur-finish)
    (define-key org-recur-agenda-mode-map (kbd "C-c 0") 'org-recur-schedule-today)

    (setq org-recur-finish-done t
          org-recur-finish-archive t))

  ;; Truncate lines to 105 chars
  ;; Why 105 chars? Because that's the max my screen can handle on vertical split
  (add-hook 'org-mode-hook #'auto-fill-mode)
  (setq-default fill-column 105)

  ;; Custom ORG functions
  ;; Refresh org-agenda after rescheduling a task.
  (defun org-agenda-refresh ()
    "Refresh all `org-agenda' buffers."
    (dolist (buffer (buffer-list))
      (with-current-buffer buffer
        (when (derived-mode-p 'org-agenda-mode)
          (org-agenda-maybe-redo)))))

  (defadvice org-schedule (after refresh-agenda activate)
    "Refresh org-agenda."
    (org-agenda-refresh))

  (defun org-focus-private() "Set focus on private things."
         (interactive)
         (setq org-agenda-files '("~/org/private.org"))
         (message "Focusing on private Org files"))
  (defun org-focus-xteam() "Set focus on X-Team things."
         (interactive)
         (setq org-agenda-files '("~/org/xteam.org"))
         (message "Focusing on X-Team Org files"))
  (defun org-focus-all() "Set focus on all things."
         (interactive)
         (setq org-agenda-files '("~/org/"))
         (message "Focusing on all Org files"))

  (defun my/org-add-ids-to-headlines-in-file ()
    "Add ID properties to all headlines in the current file which
do not already have one."
    (interactive)
    (org-map-entries 'org-id-get-create))
  (add-hook 'org-mode-hook
            (lambda ()
              (add-hook 'before-save-hook
                        'my/org-add-ids-to-headlines-in-file nil 'local)))
  (defun my/copy-idlink-to-clipboard() "Copy an ID link with the
headline to killring, if no ID is there then create a new unique
ID.  This function works only in org-mode or org-agenda buffers.

The purpose of this function is to easily construct id:-links to
org-mode items. If its assigned to a key it saves you marking the
text and copying to the killring."
         (interactive)
         (when (eq major-mode 'org-agenda-mode) ;if we are in agenda mode we switch to orgmode
           (org-agenda-show)
           (org-agenda-goto))
         (when (eq major-mode 'org-mode) ; do this only in org-mode buffers
           (setq mytmphead (nth 4 (org-heading-components)))
           (setq mytmpid (funcall 'org-id-get-create))
           (setq mytmplink (format "[[id:%s][%s]]" mytmpid mytmphead))
           (kill-new mytmplink)
           (message "Copied %s to killring (clipboard)" mytmplink)
           ))

  (global-set-key (kbd "<f5>") 'my/copy-idlink-to-clipboard)

  (defun org-reset-checkbox-state-maybe ()
    "Reset all checkboxes in an entry if the `RESET_CHECK_BOXES' property is set"
    (interactive "*")
    (if (org-entry-get (point) "RESET_CHECK_BOXES")
        (org-reset-checkbox-state-subtree)))

  (defun org-checklist ()
    (when (member org-state org-done-keywords) ;; org-state dynamically bound in org.el/org-todo
      (org-reset-checkbox-state-maybe)))

  (add-hook 'org-after-todo-state-change-hook 'org-checklist)

  (defun org-roam-node-insert-immediate (arg &rest args)
  (interactive "P")
  (let ((args (cons arg args))
        (org-roam-capture-templates (list (append (car org-roam-capture-templates)
                                                  '(:immediate-finish t)))))
    (apply #'org-roam-node-insert args)))

  ;; Save all org buffers on each save
  (add-hook 'auto-save-hook 'org-save-all-org-buffers)
  (add-hook 'after-save-hook 'org-save-all-org-buffers))

;; My own menu
(map! :leader
      (:prefix-map ("a" . "applications")
       :desc "HTTP Status cheatsheet" "h" #'helm-httpstatus)
      (:prefix-map ("ao" . "org")
       :desc "Org focus X-Team" "x" #'org-focus-xteam
       :desc "Org focus private" "p" #'org-focus-private
       :desc "Org focus all" "a" #'org-focus-all
      ))

;; Python

(require 'auto-virtualenv)
(after! python
  :init
  (add-hook 'python-mode-hook 'auto-virtualenv-set-virtualenv)
  (setq enable-local-variables :all))

(elpy-enable)
(after! elpy
  (set-company-backend! 'elpy-mode
    '(elpy-company-backend :with company-files company-yasnippet)))
(setq elpy-rpc-timeout 10)
(remove-hook 'elpy-modules 'elpy-module-flymake)

(use-package flycheck
  :config
  (setq-default flycheck-disabled-checkers '(python-pylint)))

;; LSP config
(after! lsp-mode
  (setq lsp-diagnostic-package :none)
  (setq lsp-headerline-breadcrumb-enable t)
  (setq lsp-headerline-breadcrumb-icons-enable t))

(after! lsp-ui
  (setq lsp-ui-doc-enable t))

;; (add-hook 'prog-mode-hook (lambda () (symbol-overlay-mode t)))


;; Create new spikes, saved for later
;; (defun certn/new-spike ()
;;   "Create a new org spike in ~/org/Lazer/Certn/."
;;   (interactive)
;;   (let ((name (read-string "Ticket: ")))
;;     (expand-file-name (format "%s.org" name) "~/org/Lazer/Certn/Spikes")))


;; Dashboard mode
;; (use-package dashboard
;;   :init      ;; tweak dashboard config before loading it
;;   (setq dashboard-set-heading-icons t)
;;   (setq dashboard-set-file-icons t)
;;   (setq dashboard-center-content nil) ;; set to 't' for centered content
;;   (setq dashboard-items '((recents . 5)
;;                           (bookmarks . 5)
;;                           (projects . 5)))
;;   (setq dashboard-set-navigator t)
;;   :config
;;   (dashboard-setup-startup-hook)
;;   (dashboard-modify-heading-icons '((recents . "file-text")
;;                                     (bookmarks . "book"))))
;; (setq initial-buffer-choice (lambda () (get-buffer-create "*dashboard*")))
;; (setq doom-fallback-buffer-name "*dashboard*")

(defun my/html2org-clipboard ()
  "Convert clipboard contents from HTML to Org and then paste (yank)."
  (interactive)
  (kill-new (shell-command-to-string "timeout 1 xclip -selection clipboard -o -t text/html | pandoc -f html -t json | pandoc -f json -t org --wrap=none"))
  (yank)
  (message "Pasted HTML in org"))
(define-key org-mode-map (kbd "<f4>") 'my/html2org-clipboard)

;; Clipmon as emacs clipboard manager
(global-set-key (kbd "M-y") 'helm-show-kill-ring)
(add-to-list 'after-init-hook 'clipmon-mode-start)
(defadvice clipmon--on-clipboard-change (around stop-clipboard-parsing activate) (let ((interprogram-cut-function nil)) ad-do-it))
(setq clipmon-timer-interval 1)

(after! groovy-mode
  (define-key groovy-mode-map (kbd "<f4>") 'my/jenkins-verify))

;; Git
(setq forge-alist '(("github.com-underarmour" "api.github.com" "github.com" forge-github-repository)
                    ("github.com" "api.github.com" "github.com" forge-github-repository)
                    ("gitlab.com" "gitlab.com/api/v4" "gitlab.com" forge-gitlab-repository)
                    ("salsa.debian.org" "salsa.debian.org/api/v4" "salsa.debian.org" forge-gitlab-repository)
                    ("framagit.org" "framagit.org/api/v4" "framagit.org" forge-gitlab-repository)
                    ("gitlab.gnome.org" "gitlab.gnome.org/api/v4" "gitlab.gnome.org" forge-gitlab-repository)
                    ("codeberg.org" "codeberg.org/api/v1" "codeberg.org" forge-gitea-repository)
                    ("code.orgmode.org" "code.orgmode.org/api/v1" "code.orgmode.org" forge-gogs-repository)
                    ("bitbucket.org" "api.bitbucket.org/2.0" "bitbucket.org" forge-bitbucket-repository)
                    ("git.savannah.gnu.org" nil "git.savannah.gnu.org" forge-cgit**-repository)
                    ("git.kernel.org" nil "git.kernel.org" forge-cgit-repository)
                    ("repo.or.cz" nil "repo.or.cz" forge-repoorcz-repository)
                    ("git.suckless.org" nil "git.suckless.org" forge-stagit-repository)
                    ("git.sr.ht" nil "git.sr.ht" forge-srht-repository)))

;;;; Use delta instead of the default diff
(add-hook 'magit-mode-hook (lambda () (magit-delta-mode +1)))

;; Misc

(beacon-mode t)

;; ChatGPT
(setq chatgpt-shell-model-version "gpt-4")
(setq chatgpt-shell-streaming "t")
(setq chatgpt-shell-system-prompt "You are a senior Python developer in charge of maintaining a very big application")

;; Github Copilot
;; accept completion from copilot and fallback to company
;; More info https://robert.kra.hn/posts/2023-02-22-copilot-emacs-setup/
(use-package! copilot
  :hook (prog-mode . copilot-mode)
  :bind (:map copilot-completion-map
              ("<tab>" . 'copilot-accept-completion)
              ("TAB" . 'copilot-accept-completion)
              ("C-TAB" . 'copilot-accept-completion-by-word)
              ("C-<tab>" . 'copilot-accept-completion-by-word)))

;; PlantUML
(setq plantuml-executable-path "/usr/bin/plantuml")
(setq plantuml-default-exec-mode 'executable)
(setq org-plantuml-exec-mode 'plantuml)
(setq plantuml-server-url 'nil)

(add-to-list 'org-src-lang-modes '("plantuml" . plantuml))
(org-babel-do-load-languages 'org-babel-load-languages '((plantuml . t)))
(add-to-list 'auto-mode-alist '("\\.plantuml\\'" . plantuml-mode))
(setq org-babel-default-header-args:plantuml
      '((:results . "verbatim") (:exports . "results") (:cache . "no")))

;; Go
(setq lsp-go-analyses '((shadow . t)
                        (simplifycompositelit . :json-false)))
