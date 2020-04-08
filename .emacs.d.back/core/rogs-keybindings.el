;;; keybindings.el --- rogs default keybindings configuration
;;
;;; Commentary:
;;
;; My default configuration for keybindings
;;
;;; Code:

;; F5 = Goto line
(global-set-key [f5] 'goto-line)

;; F6 = browse-url-of-file
(global-set-key [f6] 'browse-url-of-file)

;; NeoTree
(global-set-key [f8] 'neotree-toggle)

;; Magit
(global-set-key [f7] 'magit-status)

;; Helm
(with-eval-after-load "helm"
(define-key helm-map (kbd "<tab>") 'helm-execute-persistent-action))

(global-set-key (kbd "M-i") 'helm-swoop)
(global-set-key (kbd "C-x b") 'helm-buffers-list)
(global-set-key (kbd "C-x r b") 'helm-bookmarks)
(global-set-key (kbd "M-x") 'helm-M-x)
(global-set-key (kbd "M-y") 'helm-show-kill-ring)
(global-set-key (kbd "C-x C-f") 'helm-find-files)

;; Helm flycheck
(eval-after-load 'flycheck
  '(define-key flycheck-mode-map (kbd "C-c ! h") 'helm-flycheck))

;; Multiple cursors mode
(global-set-key (kbd "C-S-c C-S-c") 'mc/edit-lines)
(global-set-key (kbd "C->") 'mc/mark-next-like-this)
(global-set-key (kbd "C-<") 'mc/mark-previous-like-this)
(global-set-key (kbd "C-c C-<") 'mc/mark-all-like-this)
(define-key mc/keymap (kbd "<return>") nil)

;; Projectile mode
(define-key projectile-mode-map (kbd "C-c p") 'projectile-command-map)

;; Org mode
(global-set-key "\C-ca" 'org-agenda)
(global-set-key (kbd "<f12>") 'org-capture)

(provide 'rogs-keybindings)
;;; rogs-keybindings.el ends here
