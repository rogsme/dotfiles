(setq user-full-name "Roger Gonzalez"
      user-mail-address "roger@rogs.me")

(if (not (eq system-type 'darwin))
    (progn
      (setq doom-font (font-spec :family "MesloLGS Nerd Font" :size 14)
            doom-variable-pitch-font (font-spec :family "sans")
            doom-big-font (font-spec :family "MesloLGS Nerd Font" :size 24))))

(after! doom-themes
  (setq doom-themes-enable-bold t
        doom-themes-enable-italic t))
(custom-set-faces!
  '(font-lock-comment-face :slant italic)
  '(font-lock-keyword-face :slant italic))
(setq doom-theme 'doom-badger)
(setq fancy-splash-image "~/.config/doom/logo.png")

(setq display-line-numbers-type 'relative)

(setq org-directory "~/org/")
(setq org-roam-directory "~/roam/")

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
          ("pL" "Daily plan Lazer" plain (file+olp+datetree "~/org/plan-lazer.org") (file "~/org/templates/dailyplan.org") :immediate-finish t :jump-to-captured t)
          ("j" "Journal entry")
          ("jP" "Journal entry private" entry (file+olp+datetree "~/org/journal-private.org") "** %U - %^{Heading}")
          ("jL" "Journal entry Lazer" entry (file+olp+datetree "~/org/journal-lazer.org") "** %U - %^{Heading}")
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
  ;; Load org-recur
  (require 'org-recur)

  (after! org-recur
    (add-hook 'org-mode-hook #'org-recur-mode)
    (add-hook 'org-agenda-mode-hook #'org-recur-agenda-mode)
    
    (map! :map org-recur-mode-map
          "C-c d" #'org-recur-finish)
    
    (map! :map org-recur-agenda-mode-map
          "C-c d" #'org-recur-finish
          "C-c 0" #'org-recur-schedule-today)
    
    (setq org-recur-finish-done t
          org-recur-finish-archive t))

  ;; Truncate lines to 105 chars
  ;; Why 105 chars? Because that's the max my screen can handle on vertical split
  (add-hook 'org-mode-hook #'auto-fill-mode)
  (setq-default fill-column 105)

  ;; Custom ORG functions
  ;; Refresh org-agenda after rescheduling a task.
  (defun org-agenda-refresh ()
    "Refresh all `org-agenda' buffers more efficiently."
    (let ((agenda-buffers (seq-filter
                           (lambda (buf)
                             (with-current-buffer buf
                               (derived-mode-p 'org-agenda-mode)))
                           (buffer-list))))
      (dolist (buffer agenda-buffers)
        (with-current-buffer buffer
          (org-agenda-maybe-redo)))))

  (defadvice org-schedule (after refresh-agenda activate)
    "Refresh org-agenda."
    (org-agenda-refresh))

  (defun org-focus (files msg)
    "Set focus on specific org FILES with notification MSG."
    (setq org-agenda-files files)
    (message msg))

  (defun org-focus-private ()
    "Set focus on private things."
    (interactive)
    (org-focus '("~/org/private.org") "Focusing on private Org files"))

  (defun org-focus-lazer ()
    "Set focus on Lazer things."
    (interactive)
    (org-focus '("~/org/lazer.org") "Focusing on Lazer Org files"))

  (defun org-focus-all ()
    "Set focus on all things."
    (interactive)
    (org-focus '("~/org/") "Focusing on all Org files"))

  (defun my/org-add-ids-to-headlines-in-file ()
    "Add ID properties to all headlines in the current file which
do not already have one."
    (interactive)
    (org-map-entries 'org-id-get-create))

  (add-hook 'org-mode-hook
            (lambda ()
              (add-hook 'before-save-hook
                        'my/org-add-ids-to-headlines-in-file nil 'local)))
  (defun my/copy-idlink-to-clipboard ()
    "Copy an ID link with the headline to killring.
If no ID exists, create a new unique ID. This function works only in
org-mode or org-agenda buffers.

The purpose of this function is to easily construct id:-links to
org-mode items. If its assigned to a key it saves you marking the
text and copying to the killring.

This function is a cornerstone of my note-linking workflow. It creates and copies
an org-mode ID link to the current heading, making it easy to reference content
across my knowledge base. I use this constantly when creating connections between
related notes or tasks."
    (interactive)
    (when (eq major-mode 'org-agenda-mode) ;if we are in agenda mode we switch to orgmode
      (org-agenda-show)
      (org-agenda-goto))
    (when (eq major-mode 'org-mode) ; do this only in org-mode buffers
      (let* ((heading (nth 4 (org-heading-components)))
             (id (org-id-get-create))
             (link (format "[[id:%s][%s]]" id heading)))
        (kill-new link)
        (message "Copied %s to killring (clipboard)" link))))

  (global-set-key (kbd "<f5>") 'my/copy-idlink-to-clipboard)

  (defun org-reset-checkbox-state-maybe ()
    "Reset all checkboxes in an entry if the `RESET_CHECK_BOXES' property is set."
    (interactive "*")
    (when (org-entry-get (point) "RESET_CHECK_BOXES")
      (org-reset-checkbox-state-subtree)))

  (defun org-checklist ()
    (when (member org-state org-done-keywords) ;; org-state dynamically bound in org.el/org-todo
      (org-reset-checkbox-state-maybe)))

  (add-hook 'org-after-todo-state-change-hook 'org-checklist)

  (defun org-roam-node-insert-immediate (arg &rest args)
    "Insert a node immediately without the capture process."
    (interactive "P")
    (let ((args (cons arg args))
          (org-roam-capture-templates
           (list (append (car org-roam-capture-templates)
                         '(:immediate-finish t)))))
      (apply #'org-roam-node-insert args)))

  ;; Save all org buffers on each save
  (add-hook 'auto-save-hook 'org-save-all-org-buffers)
  (add-hook 'after-save-hook 'org-save-all-org-buffers)
  (require 'org-download)
  (add-hook 'dired-mode-hook 'org-download-enable)
  (add-hook 'org-mode-hook 'org-auto-tangle-mode))

(after! lsp-mode
  (setq lsp-headerline-breadcrumb-enable t)
  (setq lsp-headerline-breadcrumb-icons-enable t))

(after! python
  :init
  (require 'auto-virtualenv)
 (setq auto-virtualenv-global-dirs
      '("~/.virtualenvs/" "~/.pyenv/versions/" "~/.envs/" "~/.conda/" "~/.conda/envs/" "./.venv"))
  (add-hook 'python-mode-hook 'auto-virtualenv-setup)
  (setq enable-local-variables :all)
  (setq poetry-tracking-strategy 'projectile)
  (setq cov-coverage-mode t)
  (add-hook 'python-mode-hook 'cov-mode))

(after! groovy-mode
  (define-key groovy-mode-map (kbd "<f4>") 'my/jenkins-verify))

(setq lsp-go-analyses '((shadow . t)
                        (simplifycompositelit . :json-false)))

(setq restclient-same-buffer-response nil)

(add-to-list 'load-path "~/.config/doom/custom-packages")

(require 'screenshot)
(require 'private)

(defun my/ediff-init-and-example ()
  "Compare init.el with the example init file."
  (interactive)
  (let ((init-file (concat doom-user-dir "init.el"))
        (example-file (concat doom-emacs-dir "templates/init.example.el")))
    (if (and (file-exists-p init-file)
             (file-exists-p example-file))
        (ediff-files init-file example-file)
      (message "Cannot find init.el or example file"))))

(define-key! help-map "di"   #'my/ediff-init-and-example)

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

(defun my/html2org-clipboard ()
  "Convert HTML in clipboard to Org format and paste it."
  (interactive)
  (condition-case err
      (progn
        (kill-new (shell-command-to-string
                   "timeout 1 xclip -selection clipboard -o -t text/html | pandoc -f html -t json | pandoc -f json -t org --wrap=none"))
        (yank)
        (message "Pasted HTML in org"))
    (error (message "Error converting HTML to Org: %s" (error-message-string err)))))
(after! org
  (define-key org-mode-map (kbd "<f4>") 'my/html2org-clipboard))

(map! :leader
      (:prefix-map ("a" . "applications")
       :desc "HTTP Status cheatsheet" "h" #'helm-httpstatus)
      (:prefix-map ("ao" . "org")
       :desc "Org focus Lazer" "l" #'org-focus-lazer
       :desc "Org focus private" "p" #'org-focus-private
       :desc "Org focus all" "a" #'org-focus-all
      ))

;; Ensure clipmon is loaded
(require 'clipmon)

(after! clipmon
  (global-set-key (kbd "M-y") 'helm-show-kill-ring)
  (add-to-list 'after-init-hook 'clipmon-mode-start)
  (defadvice clipmon--on-clipboard-change (around stop-clipboard-parsing activate)
    (let ((interprogram-cut-function nil)) ad-do-it))
  (setq clipmon-timer-interval 1))

(add-hook 'magit-mode-hook (lambda () (magit-delta-mode +1)))

(defun my/magit-gptcommit-commit-accept-wrapper (orig-fun &rest args)
  "Wrapper for magit-gptcommit-commit-accept to preserve original message."
  (when-let ((buf (magit-commit-message-buffer)))
    (with-current-buffer buf
      (let ((orig-message (string-trim-right (or (git-commit-buffer-message) "") "\n$")))
        (apply orig-fun args)
        (unless (string-empty-p orig-message)
          (save-excursion
            (goto-char (point-min))
            (insert orig-message)))))))

(advice-add 'magit-gptcommit-commit-accept
            :around #'my/magit-gptcommit-commit-accept-wrapper)

(setq chatgpt-shell-model-version "gpt-4o")
(setq chatgpt-shell-streaming "t")
(setq chatgpt-shell-system-prompt "You are a senior developer knowledgeable in every programming language")
(setq chatgpt-shell-openai-key openai-key)
(setq dall-e-shell-openai-key openai-key)

(require 'llm-ollama)
(setq magit-gptcommit-llm-provider (make-llm-ollama :scheme "http" :host "192.168.0.122"  :embedding-model "gemma3:12b" :chat-model "gemma3:12b"))
(setq llm-warn-on-nonfree nil)

(after! magit
  (magit-gptcommit-mode 1)
  (setq magit-gptcommit-prompt
      "You are an expert programmer crafting a Git commit message. Carefully review the following file diffs as if you had read each line.

Your goal is to generate a commit message that follows the kernel Git commit style guide.

SUMMARY INSTRUCTIONS:
- Write a one-line summary of the change, no more than 50 characters.
- Use the imperative tense (for example, use 'Improve logging output' instead of 'Improved logging' or 'Improves logging').
- Do not include prefixes like Fix:, Feat:, or Chore: at the beginning of the summary.
- The summary must not end with a period.
- Ensure the summary reflects a single, specific, and cohesive purpose.

COMMENT INSTRUCTIONS:
- After the summary, write concise developer-facing comments explaining the commit.
- Each comment must be on its own line and prefixed with '-'.
- Each comment must end with a period.
- Do not include any paragraphs, introductions, or extra explanations.
- Do not use backticks (`) anywhere in the summary or comments.
- Do not use Markdown formatting (e.g., *, **, #, _, or inline code).

THE FILE DIFFS:
%s

Now, write the commit message in this exact format:
<summary line>

- comment1
- comment2
- commentN")


  (magit-gptcommit-status-buffer-setup))

(require 'forge-llm)
(forge-llm-setup)
(require 'llm-claude)
(setq forge-llm-llm-provider (make-llm-claude :key anthropic-key :chat-model "claude-3-7-sonnet-latest"))
(setq forge-llm-max-diff-size 'nil)

;; Load copilot
(require 'copilot)

(after! copilot
  (add-hook 'prog-mode-hook #'copilot-mode)
  (map! :map copilot-completion-map
        "<tab>" #'copilot-accept-completion
        "TAB" #'copilot-accept-completion
        "C-TAB" #'copilot-accept-completion-by-word
        "C-<tab>" #'copilot-accept-completion-by-word))

(after! aidermacs
  ;; Set API keys
  (setenv "ANTHROPIC_API_KEY" anthropic-key)
  (setenv "OPENAI_API_KEY" openai-key)
  (setenv "GEMINI_API_KEY" gemini-key)
  (setenv "OLLAMA_API_BASE" "https://ollama.rogs.casa")

  ;; General settings
  (setq aidermacs-use-architect-mode t)
  (setq aidermacs-auto-commits nil)
  (setq aidermacs-backend 'vterm)
  (setq aidermacs-vterm-multiline-newline-key "S-<return>")
  (add-to-list 'aidermacs-extra-args "--no-gitignore --chat-mode ask --no-auto-commits --cache-prompts --dark-mode --pretty --stream --vim --cache-keepalive-pings 2"))


;; Keybinding for Aidermacs menu
(map! :leader
      :desc "Aidermacs"
      "l" #'aidermacs-transient-menu)

(setq plantuml-executable-path "/usr/bin/plantuml")
(setq plantuml-default-exec-mode 'executable)
(setq org-plantuml-exec-mode 'plantuml)
(setq plantuml-server-url 'nil)

(org-babel-do-load-languages 'org-babel-load-languages '((plantuml . t)))
(add-to-list 'auto-mode-alist '("\\.plantuml\\'" . plantuml-mode))
(setq org-babel-default-header-args:plantuml
      '((:results . "verbatim") (:exports . "results") (:cache . "no")))
(after! org
  (add-to-list 'org-src-lang-modes '("plantuml" . plantuml)))
