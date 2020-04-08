;;; rogs-core.el --- rogs default core configuration
;;
;;; Commentary:
;;
;; My core configuration
;;
;;; Code:

;; Saves emacs backups in other folder
(setq
 backup-by-copying t              ; don't clobber symlinks
 backup-directory-alist '(("." . "~/.emacs_backups"))    ; don't litter my fs tree
 delete-old-versions t
 kept-new-versions 6
 kept-old-versions 2
 version-control t)               ; use versioned backups

;; Indent
(setq web-mode-markup-indent-offset 2)
(setq web-mode-css-indent-offset 2)
(setq web-mode-code-indent-offset 2)
(setq js-indent-level 2)
(setq-default tab-width 2)
(setq js-highlight-level 3)

;; NeoTree
(require 'neotree)
(put 'upcase-region 'disabled nil)
(put 'downcase-region 'disabled nil)

;; Magit
(require 'magit-gitflow)
(add-hook 'magit-mode-hook 'turn-on-magit-gitflow)

;; WhiteSpace Cleanup
(global-whitespace-cleanup-mode)

;; Auto revert mode (Updating buffers when changed on disk)
(global-auto-revert-mode)

;; All the icons
(add-to-list 'load-path
              "~/.emacs.d/packages/all-the-icons")
(require 'all-the-icons)

;; Dashboard
(require 'dashboard)
(dashboard-setup-startup-hook)
(setq dashboard-startup-banner 'logo)
(setq dashboard-items '((recents  . 5)
                        (bookmarks . 5)
                        (projects . 5)
                        (agenda . 20)))
(setq dashboard-set-heading-icons t)
(setq dashboard-set-file-icons t)

;; YASnippets
(add-to-list 'load-path
              "~/.emacs.d/plugins/yasnippet")
(require 'yasnippet)
(yas-global-mode 1)

;; Helm configs
(require 'helm-config)

;; Helm flycheck
(require 'helm-flycheck)

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

;; Emojify
(add-hook 'after-init-hook #'global-emojify-mode)

;; RESTClient
(require 'restclient)

;; Multiple cursors mode
(require 'multiple-cursors)

;; Projectile mode
(projectile-mode +1)

;; PugMode
(require 'pug-mode)

;; Powerline
(require 'powerline)
(powerline-default-theme)

(provide 'rogs-core)
;;; rogs-core.el ends here
