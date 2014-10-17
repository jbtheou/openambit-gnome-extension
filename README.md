openambit-gnome-extension
=========================

Openambit - Gnome 3 extension

Integrate openambit into an Gnome 3 extension.

Early stage. NOT for users.

For now, using openambit_cli project.

## Installation

Build openambit_cli project (https://github.com/jbtheou/openambit_cli)

Clone the extension:

```
git clone https://github.com/jbtheou/openambit-gnome-extension.git
mkdir ~/.local/share/gnome-shell/extensions/openambit-extension-jbtheou@gmail.com
cp -r openambit-gnome-extension/extension/* ~/.local/share/gnome-shell/extensions/openambit-extension-jbtheou@gmail.com/
glib-compile-schemas ~/.local/share/gnome-shell/extensions/openambit-extension-jbtheou@gmail.com/schemas/
```
## Configuration

Edit
```
~/.local/share/gnome-shell/extensions/openambit-extension-jbtheou@gmail.com/extension.js
```
and setup AMBIT_DAEMON properly (full path to openambit_cli).

Open gnome-tweak-tool and setup the extension.
