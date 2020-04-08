;;; setup-js-mode.el --- rogs default js mode configuration
;;
;;; Commentary:
;;
;; My default configuration for js mode
;;
;;; Code:

;; Associates json-mode to all .eslintrc files
(add-to-list 'auto-mode-alist '("\\.eslintrc\\'" . json-mode))

;; JS2 mode
(require 'js2-refactor)
(require 'xref-js2)

(add-to-list 'auto-mode-alist '("\\.js\\'" . js2-mode))
(add-to-list 'auto-mode-alist '("\\.js\\'" . rjsx-mode))
(add-hook 'js2-mode-hook #'js2-refactor-mode)
(add-hook 'js2-mode-hook #'emmet-mode)
(setq emmet-expand-jsx-className? t)
(js2r-add-keybindings-with-prefix "C-c C-f")
(define-key js2-mode-map (kbd "C-k") #'js2r-kill)
(define-key js2-mode-map (kbd "C-c ;") #'comment-line)
(define-key js2-mode-map (kbd "C-c C-;") #'comment-or-uncomment-region)

;; js-mode (which js2 is based on) binds "M-." which conflicts with xref, so
;; unbind it.
(define-key js-mode-map (kbd "M-.") nil)

(add-hook 'js2-mode-hook (lambda ()
  (add-hook 'xref-backend-functions #'xref-js2-xref-backend nil t)))

(setq js2-highlight-level 3)

;; Turn off js2 mode errors & warnings (we lean on eslint/standard)
(setq js2-mode-show-parse-errors nil)
(setq js2-mode-show-strict-warnings nil)

;; Tern
(require 'company)
(require 'company-tern)

(add-to-list 'company-backends 'company-tern)
(add-hook 'js2-mode-hook (lambda ()
                           (tern-mode)
                           (company-mode)))

;; Disable completion keybindings, as we use xref-js2 instead
(define-key tern-mode-keymap (kbd "M-.") nil)
(define-key tern-mode-keymap (kbd "M-,") nil)

;; Indium
(unless (package-installed-p 'indium)
  (package-install 'indium))
(require 'indium)
(add-hook 'js2-mode-hook #'indium-interaction-mode)
(define-key js2-mode-map (kbd "C-c i") 'indium-launch)

;; PrettierJS
(eval-after-load 'js2-mode
  '(progn
     (add-hook 'js2-mode-hook #'add-node-modules-path)
     (add-hook 'js2-mode-hook #'prettier-js-mode)))

(provide 'setup-js-mode)
;;; setup-js-mode.el ends here
