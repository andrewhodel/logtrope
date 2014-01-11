var config = {}

config.key = 'randomkey';
config.webport = 8221;
config.syslogport = 1514;

config.mongo = {};
config.mongo.dbname = 'logtrope';
config.mongo.host = '192.168.80.207';
config.mongo.port = 27017;

module.exports = config;
