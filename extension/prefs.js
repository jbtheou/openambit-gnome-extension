const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const Lang = imports.lang;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

let userkey;

const OpenAmbitPrefsWidget = new GObject.Class({
	Name: 'OpenAmbit.Prefs.Widget',
	GTypeName: 'OpenAmbitPrefsWidget',
	Extends: Gtk.Grid,

	_init : function(params) {
		this.parent(params);
		this.margin = 24;
		this.row_spacing = 6;
		this.orientation = Gtk.Orientation.VERTICAL;
		this._settings = Convenience.getSettings();
		this.add(new Gtk.Label({ label: '<b>' + _("Movescount account") + '</b>',
					use_markup: true,
					halign: Gtk.Align.START }));
		let entry = new Gtk.Entry({ hexpand: true,
					margin_bottom: 12 });
		this.add(entry);
		this.add(new Gtk.Label({ label: '<b>' + _("UserKey") + '</b>',
					use_markup: true,
					halign: Gtk.Align.START }));
		userkey = new Gtk.Label({ label: this._settings.get_string('userkey'),
					use_markup: true,
					halign: Gtk.Align.START });
		this.add(userkey);
		let userkeybutton = new Gtk.ToolButton({ label: _("Generate userkey") });
		userkeybutton.connect('clicked', Lang.bind(this, this._userkey));
		this.add(userkeybutton);
		this._settings.bind('movescount-account', entry, 'text', Gio.SettingsBindFlags.DEFAULT);
	},

	_userkey: function() {
		var text = "";
		var dic = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < 14; i++ )
			text += dic.charAt(Math.floor(Math.random() * dic.length));
		this._settings.set_string('userkey',text);
		userkey.set_label(text);
	},
});

function init() {
}

function buildPrefsWidget() {
    let widget = new OpenAmbitPrefsWidget();
    widget.show_all();

    return widget;
}
