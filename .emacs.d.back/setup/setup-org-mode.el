;;; setup-org-mode.el --- rogs default org mode configuration
;;
;;; Commentary:
;;
;; My default configuration for org mode
;;
;;; Code:

(setq org-agenda-files (quote ("~/Dropbox/org")))

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
(setq org-lowest-priority  ?D)
(setq org-default-priority ?B)
(setq org-priority-faces '((?A . (:foreground "white" :background "dark red" :weight bold))
                           (?B . (:foreground "white" :background "dark green" :weight bold))
                           (?C . (:foreground "yellow"))
                           (?D . (:foreground "gray"))))

;; Time formats
(setq org-time-stamp-custom-formats '("<%d/%m/%y %a>" . "<%d/%m/%y %a %H:%M>"))
(setq org-display-custom-times t)

;; Tags
(setq org-tag-alist '(("payments" . ?p) ("girlfriend" . ?g) ("call" . ?c) ("mail" . ?m) ("rogs" . ?r) ("jobs" . ?j) ("backend" . ?b) ("frontend" . ?f) ("devops" . ?d) ("bugs" . ?u) ("improvements" . ?i)))

;; Log into drawer
(setq org-log-into-drawer t)

;; Archive location
(setq org-archive-location "archive/%s_archive::")

;; Log when reschedule
(setq org-log-reschedule t)

;; Log when done
(setq org-log-done t)

;; Capture templates
(setq org-capture-templates
      (quote
       (
        ;; Personal templates
        ("p" "Templates for personal")
        ("pr" "Non-scheduled" entry
         (file+headline "~/Dropbox/org/personal.org" "Captured")
         (file "~/.emacs.d/org/templates/basic-task.txt"))
        ("ps" "Scheduled" entry
         (file+headline "~/Dropbox/org/personal.org" "Captured")
         (file "~/.emacs.d/org/templates/scheduled-task.txt"))
        ("pl" "Logbook entry for Personal" entry (file+datetree "logbook-personal.org") "** %U - %^{Activity}  :LOG:")
        ;; Massive templates
        ("m" "Templates for massive")
        ("mr" "Non-scheduled" entry
         (file+headline "~/Dropbox/org/massive.org" "Captured")
         (file "~/.emacs.d/org/templates/basic-task.txt"))
        ("ms" "Scheduled" entry
         (file+headline "~/Dropbox/org/massive.org" "Captured")
         (file "~/.emacs.d/org/templates/scheduled-task.txt"))
        ("ml" "Logbook entry for Massive" entry (file+datetree "logbook-work.org") "** %U - %^{Activity}  :LOG:")
        ("mm" "New daily meeting" entry
         (file+datetree "~/Dropbox/org/massive-dailies.org")
         (file "~/.emacs.d/org/templates/meeting.txt"))
        ;; Rogs templates
        ("r" "Templates for rogs")
        ("rr" "Non-scheduled" entry
         (file+headline "~/Dropbox/org/rogs.org" "Captured")
         (file "~/.emacs.d/org/templates/basic-task.txt"))
        ("rs" "Scheduled" entry
         (file+headline "~/Dropbox/org/rogs.org" "Captured")
         (file "~/.emacs.d/org/templates/scheduled-task.txt"))
        )))

;; Wrap long lines
(add-hook 'text-mode-hook 'turn-on-visual-line-mode)

;; Enforce ordered tasks and add a tag
(setq org-enforce-todo-dependencies t)
(setq org-track-ordered-property-with-tag t)
(setq org-agenda-dim-blocked-tasks t)
(setq org-enforce-todo-checkbox-dependencies t)

;; Org habits
(require 'org-habit)
(setq org-habit-graph-column 50)

;; Include diary
(setq org-agenda-include-diary t)

;; Keep line breaks on export
(setq org-export-preserve-breaks t)

;; Org bullets
(require 'org-bullets)
(add-hook 'org-mode-hook (lambda () (org-bullets-mode 1)))

(provide 'setup-org-mode)
;;; setup-org-mode.el ends here
