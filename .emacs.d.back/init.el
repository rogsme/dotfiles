;;; init.el --- rogs Emacs configuration
;;
;;; Commentary:
;;
;; This is my basic configuration for Emacs as text editor.
;; It is mainly focused on Web Development with JS, React, Django and Node
;;
;;; Code:

(setq user-full-name "Roger González")
(setq user-mail-address "roger@rogs.me")

(package-initialize)

;; Define Folders
(defvar core-dir (expand-file-name "core" user-emacs-directory)
  "Directory containing core configuration.")

(defvar setup-dir (expand-file-name "setup" user-emacs-directory)
  "Directory containing modes configuration.")
(setq custom-file "~/.emacs.d/core/rogs-custom.el")

(add-to-list 'load-path core-dir)
(add-to-list 'load-path setup-dir)
(load custom-file)

;; Load core configurations
(require 'rogs-core)
(require 'rogs-packages)
(require 'rogs-ui)
(require 'rogs-keybindings)

;; Load modes configurations
(require 'setup-web-mode)
(require 'setup-js-mode)
(require 'setup-flycheck-mode)
(require 'setup-yaml-mode)
(require 'setup-python-mode)
(require 'setup-org-mode)

(provide 'init.el)
;;; init.el ends here
