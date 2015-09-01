var req = require('request'),
	async = require('async'),
	moment = require('moment'),
	fs = require('fs');

var headers = [
	'#HostName',
	'IP',
	'Score',
	'Ping',
	'Speed',
	'CountryLong',
	'CountryShort',
	'NumVpnSessions',
	'Uptime',
	'TotalUsers',
	'TotalTraffic',
	'LogType',
	'Operator',
	'Message',
	'OpenVPN_ConfigData_Base64',
];

var headersLen = headers.length;
function VpnRawData(arr) {
	for (var i=0; i<headersLen; i++) {
		this[headers[i]] = arr[i];
	}

	this.name = this['#HostName'];

	if (this['OpenVPN_ConfigData_Base64'] && typeof this['OpenVPN_ConfigData_Base64'] == 'string') {
		this.buffer = new Buffer(this['OpenVPN_ConfigData_Base64'], 'base64');
		delete this.OpenVPN_ConfigData_Base64;
	}

	this.Score = Number(this.Score);
	this.Ping = Number(this.Ping);
}

var rawDataList = [];
req('http://www.vpngate.net/api/iphone/', function(err, res, body) {
	if (err) {
		throw new Error(err);
	}

	var parsed = {};
	var datas = body.split('\n');
	var len = datas.length;
	for (var i=1; i<len; i++) {
		rawDataList.push(new VpnRawData(datas[i].split(',')));
	}

	async.filter(rawDataList, function(rawData, cb) {
		if (rawData.CountryShort == "KR") {
			cb(true);
			return;
		}
		cb(false);
	}, function(res) {
		res.sort(function(a, b) {
			return b.Score - a.Score
		});

		async.each(res, function(item) {
			(function(vpn) {
				var speed = Math.floor((Number(vpn.Speed) / 1024 / 1024)).toString() + 'Mb'
				var uptime = Math.floor(vpn.Uptime / 1000 / 60 / 60).toString() + 'hours'
				//console.log(item.name + '_' + speed + '_' + uptime)
				var filepath = './' + item.name + '_'+ speed + '_' + uptime + '_' + vpn.Score.toString() + '.ovpn';
				fs.writeFile(filepath, vpn.buffer, function(err) {
					if (err) {
						console.log(err);
						return;
					}

					console.log('save: ' + filepath);
				});
			})(item);
		});
	})
});