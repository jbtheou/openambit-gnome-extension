// This extension was developed by :
// Jean-Baptiste Theou <jbtheou@gmail.com>
//
// Licence: GPLv2
//
// Copyright 2014 Jean-Baptiste Theou

const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Soup = imports.gi.Soup;
const GUdev = imports.gi.GUdev;
const GLib = imports.gi.GLib;
const GUsb = imports.gi.GUsb;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Gio = imports.gi.Gio;

// From: http://findicons.com/icon/437394/watch_alt_inv?id=437394#
let watch_icon_idle_src = Gio.icon_new_for_string(Me.path + "/icons/watch_alt_inv_idle.png");
let watch_icon_src = Gio.icon_new_for_string(Me.path + "/icons/watch_alt_inv.png");
let watch_icon;
let watch_icon_idle;
let network_error;
let network_ok;

// Using Openambit APPKEY for now
const APPKEY = "HpF9f1qV5qrDJ1hY1QK1diThyPsX10Mh4JvCw9xVQSglJNLdcwr3540zFyLzIC3e";
const MOVESCOUNT_HOST = 'https://uiservices.movescount.com';
const MOVESCOUNT_USER = MOVESCOUNT_HOST + "/members/private?appkey=" + APPKEY;
const MOVESCOUNT_GPS = MOVESCOUNT_HOST + "/devices/gpsorbit/binary?appkey=" + APPKEY;
const AMBIT_DAEMON = "openambit_cli"
const MOVESCOUNT_CREATE_MOVE = MOVESCOUNT_HOST + "/moves/?appkey=" + APPKEY;

let meta;
let ambitmanager;
let settings;
let icon;
let shell_icons;
let connectivity;
let connected;
let initialization = true;
let message_status;
let battery_status;
let device_status;
let gps_status;
let log_status;

function AmbitManager(metadata)
{
	this._init();
}

AmbitManager.prototype =
{
	__proto__: PanelMenu.Button.prototype,

	_init: function()
	{
			watch_icon = new St.Icon({gicon: watch_icon_src, style_class: 'system-status-icon'});
			watch_icon_idle = new St.Icon({gicon: watch_icon_idle_src, style_class: 'system-status-icon'});
			network_error =  new St.Icon({icon_name: 'network-error-symbolic', style_class: 'system-status-icon'});
			network_ok = new St.Icon({icon_name: 'network-idle-symbolic', style_class: 'system-status-icon'});
			PanelMenu.Button.prototype._init.call(this, St.Align.START);
			settings = Convenience.getSettings();
			shell_icons = new St.BoxLayout();
			shell_icons.set_width(48);
			shell_icons.set_height(24);
			icon = new Array(2);
			connectivity = false;
			connected = false;
			initialization = true;
			update_icons();
			initialization = false;
			this.actor.add_actor(shell_icons);
			this.actor.add_style_class_name('panel-status-button');
			this.actor.has_tooltip = false;
			message_status = new PopupMenu.PopupMenuItem(_("Disable"));
			this.menu.addMenuItem(message_status);
			message_status.connect('activate', showProfile);
			this.Separator = new PopupMenu.PopupSeparatorMenuItem();
			this.menu.addMenuItem(this.Separator);
			device_status = new PopupMenu.PopupMenuItem(_("N/A"));
			this.menu.addMenuItem(device_status);
			battery_status = new PopupMenu.PopupMenuItem(_("Battery: N/A"));
			this.menu.addMenuItem(battery_status);
			gps_status = new PopupMenu.PopupMenuItem(_("GPS orbit: N/A"));
			this.menu.addMenuItem(gps_status);
			log_status = new PopupMenu.PopupMenuItem(_("Log: N/A"));
			this.menu.addMenuItem(log_status);
			let client = new GUdev.Client ({subsystems: ["usb/usb_device"]});
			client.connect ("uevent", this._onuevent);
			this._lookfordevice(client);
			getUserInfo();
	},

	_onuevent: function (client, action, device) {
		if (device.get_property("ID_VENDOR") == "Suunto") {
			connected = ( (action == "add") ? true : false);
			update_icons();
			getUserInfo();
			update_device(connected);
		}
	},

	_lookfordevice: function (client) {
		let usb = client.query_by_subsystem("usb");
		for (var n = 0; n < usb.length; n++) {
			if (usb[n].get_property("ID_VENDOR")  == "Suunto" ) {
				connected = true;
				update_icons();
				update_device(connected);
			}
		}
	},
}

function getUserInfo () {
		var soupSyncSession = new Soup.SessionSync();
		var movescount_account = settings.get_string('movescount-account');
		var userkey = settings.get_string('userkey');
		var request = Soup.Message.new('GET',MOVESCOUNT_USER+"&userkey="+userkey+"&email="+movescount_account);
		let responseCode = soupSyncSession.send_message(request);
		let message;
		if(responseCode == 200)
		{
			var responseBody = request["response-body"];
			var response = JSON.parse(responseBody.data);
			message = "Log as: " + response["Username"];
			connectivity = true;
		}
		else if (responseCode == 401)
		{
			message = "Access denied";
			connectivity = false;
		}
		update_icons();
		message_status.label.set_text(message);
}

function update_icons () {
		if (!initialization) {
			shell_icons.remove_actor(icon[0]);
			shell_icons.remove_actor(icon[1]);
		}
		icon[0] = connected ? watch_icon : watch_icon_idle;
		icon[1] = connectivity ? network_ok : network_error;
		shell_icons.add_actor(icon[0]);
		shell_icons.add_actor(icon[1]);
}

function update_device (connected) {
		let [res, out, err, status] = GLib.spawn_command_line_sync(AMBIT_DAEMON + " --settime");
		update_battery (connected);
		if (connected ) {
			[a, firmware, b, c] = GLib.spawn_command_line_sync(AMBIT_DAEMON + " --firmware");
			[d, model, e, f] = GLib.spawn_command_line_sync(AMBIT_DAEMON + " --model");
			device_status.label.set_text(model + " " + firmware);
			update_log();
		}
		else {
			device_status.label.set_text("N/A");
			log_status.label.set_text("Log: N/A");
			gps_status.label.set_text("GPS orbit: N/A");
		}
}

function update_battery (connected) {
		if (connected ) {
			let [res, out, err, status] = GLib.spawn_command_line_sync(AMBIT_DAEMON + " --battery");
			battery_status.label.set_text("Battery: " + out + "%");
		}
		else
			battery_status.label.set_text("Battery: N/A");
}

function readFile(filename) {
    let input_file = Gio.file_new_for_path(filename);
    let size = input_file.query_info(
        "standard::size",
        Gio.FileQueryInfoFlags.NONE,
        null).get_size();
    let stream = input_file.open_readwrite(null).get_input_stream();
    let data = stream.read_bytes(size, null).get_data();
    stream.close(null);
    return [data, size];
}

function sync_log() {
	var soupAsyncSession = new Soup.SessionAsync();
	var movescount_account = settings.get_string('movescount-account');
	var userkey = settings.get_string('userkey');
	let dir = Gio.file_new_for_path("/home/jbtheou/.openambit/data");
	let fileEnum;
	try {
		fileEnum = dir.enumerate_children('standard::name,standard::type',
						Gio.FileQueryInfoFlags.NONE, null);
	} catch (e) {
		fileEnum = null;
	}
	if (fileEnum != null) {
		let info;
		while ((info = fileEnum.next_file(null))) {
			var request = Soup.Message.new('POST',MOVESCOUNT_CREATE_MOVE+"&userkey="+userkey+"&email="+movescount_account);
			let [data, size] = readFile("/home/jbtheou/.openambit/data/" + info.get_name());
			request.set_request('application/json',(2),data,size);
			let responseCode = soupAsyncSession.queue_message(request,
				function(_httpSession, message) {
					log("Move sync");
				});
		}
	}
}

function read_progress (stream, res) {
	let [out,size] = stream.read_line_finish(res)
	if (out != null) {
		log_status.label.set_text("Log: " + out);
		if (out != "Done")
			stream.read_line_async(GLib.PRIORITY_HIGH, null, read_progress);
		else {
			sync_log();
			update_gpsorbit();
		}
	}
}

function read_progress_gps (stream, res) {
	let [out,size] = stream.read_line_finish(res)
	if (out != null) {
		gps_status.label.set_text("GPS orbit: " + out);
	}
}

function update_log () {
	log_status.label.set_text("Log: In progress");
	let [res, pid, in_fd, out_fd, err_fd] = GLib.spawn_async_with_pipes(null, [AMBIT_DAEMON,'--log'], null, 0, null);
	let log_output = new Gio.DataInputStream({ base_stream: new Gio.UnixInputStream({fd: out_fd}) });
	log_output.read_line_async(GLib.PRIORITY_LOW, null, read_progress);
}

function update_gpsorbit () {
	var soupSyncSession = new Soup.SessionSync();
	var request = Soup.Message.new('GET',MOVESCOUNT_GPS);
	let responseCode = soupSyncSession.send_message(request);
	if(responseCode == 200)
	{
		gps_status.label.set_text("GPS orbit: Updating");
		let f = Gio.file_new_for_path("/tmp/movescount-orbit.data");
		let fstream = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
		var responseBody = request["response-body-data"];
		fstream.write(responseBody.get_data(),null,responseBody.length);
		fstream.close(null);
		let [res, pid, in_fd, out_fd, err_fd] = GLib.spawn_async_with_pipes(null, [AMBIT_DAEMON,'--gpsorbit', '/tmp/movescount-orbit.data'], null, 0, null);
		let log_output = new Gio.DataInputStream({ base_stream: new Gio.UnixInputStream({fd: out_fd}) });
		log_output.read_line_async(GLib.PRIORITY_LOW, null, read_progress_gps);
	}
	else
		gps_status.label.set_text("GPS orbit: Error");
}

function showProfile() {
	Main.Util.spawnCommandLine("xdg-open http://www.movescount.com/scoreboard");
}

function init(metadata)
{
	meta = metadata;
}

function enable()
{
	ambitmanager = new AmbitManager(meta);
	Main.panel.addToStatusArea('ambitmanager', ambitmanager);
}

function disable()
{
	ambitmanager.destroy();
	ambitmanager = null;
}
