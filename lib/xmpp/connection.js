var net, _temp_$DxFT$_, EventEmitter, util, ltx, StreamParser, starttls, NS_XMPP_TLS, NS_STREAM, NS_XMPP_STREAMS, MAX_RECONNECT_DELAY, Connection, _temp_$EQIk$_;

net = require("net");

_temp_$DxFT$_ = require("events");

EventEmitter = _temp_$DxFT$_.EventEmitter;

util = require("util");

ltx = require("ltx");

StreamParser = require("./stream_parser");

starttls = require("../starttls");

this.NS_XMPP_TLS = NS_XMPP_TLS = "urn:ietf:params:xml:ns:xmpp-tls";

this.NS_STREAM = NS_STREAM = "http://etherx.jabber.org/streams";

this.NS_XMPP_STREAMS = NS_XMPP_STREAMS = "urn:ietf:params:xml:ns:xmpp-streams";

MAX_RECONNECT_DELAY = 30 * 1e3;

this.Connection = Connection = (_temp_$EQIk$_ = function(opts) {
  var _this_$AdzF$_;
  EventEmitter.call(this);
  this.streamAttrs = opts.streamAttrs || {};
  this.xmlns = opts.xmlns || {};
  this.xmlns.stream = NS_STREAM;
  this.socket = opts.socket || new net.Socket;
  this.reconnectDelay = 0;
  this.setupStream();
  if (this.socket.readable) {
    this.startParser();
  } else {
    this.socket.on("connect", (_this_$AdzF$_ = this, function() {
      _this_$AdzF$_.startParser();
      return _this_$AdzF$_.emit("connect");
    }));
  }
  this.mixins = [];
}, _temp_$EQIk$_._name = "Connection", _temp_$EQIk$_);

util.inherits(Connection, EventEmitter);

Connection.prototype.allowTLS = true;

Connection.prototype.setupStream = function() {
  var _this_$O7ni$_, _this_$pEB3$_, _this_$wxOP$_, _this_$wyqp$_, proxyEvent, _temp_$DkmI$_, _this_$tjlQ$_;
  this.socket.addListener("data", (_this_$O7ni$_ = this, function(data) {
    return _this_$O7ni$_.onData(data);
  }));
  this.socket.addListener("end", (_this_$pEB3$_ = this, function() {
    console.log("socket:end");
    return _this_$pEB3$_.onEnd();
  }));
  this.socket.addListener("error", (_this_$wxOP$_ = this, function() {
    console.log("socket:error");
    return _this_$wxOP$_.onEnd();
  }));
  this.socket.addListener("close", (_this_$wyqp$_ = this, function() {
    console.log("socket:close");
    return _this_$wyqp$_.onClose();
  }));
  proxyEvent = (_temp_$DkmI$_ = (_this_$tjlQ$_ = this, function(event) {
    return _this_$tjlQ$_.socket.addListener(event, function() {
      var args;
      args = Array.prototype.slice.call(arguments);
      args.unshift(event);
      return _this_$tjlQ$_.emit.apply(_this_$tjlQ$_, args);
    });
  }), _temp_$DkmI$_._name = "proxyEvent", _temp_$DkmI$_);
  proxyEvent("data");
  proxyEvent("drain");
  if (!this.socket.serializeStanza) {
    this.socket.serializeStanza = function(el, cb) {
      return el.write(function(s) {
        return cb(s);
      });
    };
  }
};

Connection.prototype.pause = function() {
  if (this.socket.pause) {
    return this.socket.pause();
  }
};

Connection.prototype.resume = function() {
  if (this.socket.resume) {
    return this.socket.resume();
  }
};

Connection.prototype.send = function(stanza) {
  var flushed, el, _this_$ojlp$_;
  flushed = true;
  if (!this.socket) {
    return;
  }
  if (!this.socket.writable) {
    this.socket.end();
    return;
  }
  if (stanza.root) {
    el = this.rmXmlns(stanza.root());
    this.socket.serializeStanza(el, (_this_$ojlp$_ = this, function(s) {
      flushed = _this_$ojlp$_.socket.write(s);
    }));
  } else {
    flushed = this.socket.write(stanza);
  }
  return flushed;
};

Connection.prototype.startParser = function() {
  var _this_$BX0p$_, _this_$b0fZ$_, _this_$X0Xk$_, _this_$79ax$_;
  this.parser = new StreamParser.StreamParser(this.maxStanzaSize);
  this.parser.addListener("streamStart", (_this_$BX0p$_ = this, function(attrs) {
    var _obj_$E8wO$_, k;
    _this_$BX0p$_.streamNsAttrs = {};
    _obj_$E8wO$_ = attrs;
    for (k in _obj_$E8wO$_) {
      if (k === "xmlns" || k.substr(0, 6) === "xmlns:") {
        _this_$BX0p$_.streamNsAttrs[k] = attrs[k];
      }
    }
    return _this_$BX0p$_.emit("streamStart", attrs);
  }));
  this.parser.addListener("stanza", (_this_$b0fZ$_ = this, function(stanza) {
    return _this_$b0fZ$_.onStanza(_this_$b0fZ$_.addStreamNs(stanza));
  }));
  this.parser.addListener("error", (_this_$X0Xk$_ = this, function(e) {
    return _this_$X0Xk$_.error(e.condition || "internal-server-error", e.message);
  }));
  return this.parser.addListener("end", (_this_$79ax$_ = this, function() {
    _this_$79ax$_.stopParser();
    return _this_$79ax$_.end();
  }));
};

Connection.prototype.stopParser = function() {
  if (this.parser) {
    return delete this.parser;
  }
};

Connection.prototype.startStream = function() {
  var attrs, _obj_$1w2o$_, k, _obj_$tIs5$_, el, s;
  this.reconnectDelay = 0;
  attrs = {};
  _obj_$1w2o$_ = this.xmlns;
  for (k in _obj_$1w2o$_) {
    if (this.xmlns.hasOwnProperty(k)) {
      if (!k) {
        attrs.xmlns = this.xmlns[k];
      } else {
        attrs["xmlns:" + k] = this.xmlns[k];
      }
    }
  }
  _obj_$tIs5$_ = this.streamAttrs;
  for (k in _obj_$tIs5$_) {
    if (this.streamAttrs.hasOwnProperty(k)) {
      attrs[k] = this.streamAttrs[k];
    }
  }
  el = new ltx.Element("stream:stream", attrs);
  el.t(" ");
  s = el.toString();
  this.send(s.substr(0, s.indexOf(" </stream:stream>")));
  this.streamOpened = true;
};

Connection.prototype.onData = function(data) {
  if (this.parser) {
    return this.parser.write(data);
  }
};

Connection.prototype.setSecure = function(credentials, isServer) {
  var ct, _this_$w3fJ$_;
  this.socket.removeAllListeners("data");
  this.socket.removeAllListeners("drain");
  this.socket.removeAllListeners("close");
  if (this.socket.clearTimer) {
    this.socket.clearTimer();
  }
  this.stopParser();
  ct = starttls(this.socket, credentials || this.credentials, isServer, (_this_$w3fJ$_ = this, function() {
    _this_$w3fJ$_.isSecure = true;
    _this_$w3fJ$_.startParser();
    if (!isServer) {
      return _this_$w3fJ$_.startStream();
    }
  }));
  ct.on("close", function() {
    return this.onClose();
  });
  this.socket = ct;
  return this.setupStream();
};

Connection.prototype.onStanza = function(stanza) {
  if (stanza.is("error", NS_STREAM)) {
    return this.emit("error", stanza);
  } else {
    if (stanza.is("features", NS_STREAM) && this.allowTLS && !this.isSecure && stanza.getChild("starttls", NS_XMPP_TLS)) {
      return this.send(new ltx.Element("starttls", {
        xmlns: NS_XMPP_TLS
      }));
    } else {
      if (this.allowTLS && stanza.is("proceed", NS_XMPP_TLS)) {
        return this.setSecure();
      } else {
        return this.emit("stanza", stanza);
      }
    }
  }
};

Connection.prototype.addStreamNs = function(stanza) {
  var _obj_$hMhY$_, attr;
  _obj_$hMhY$_ = this.streamNsAttrs;
  for (attr in _obj_$hMhY$_) {
    if (!stanza.attrs[attr] && !(attr === "xmlns" && this.streamNsAttrs[attr] === this.xmlns[""])) {
      stanza.attrs[attr] = this.streamNsAttrs[attr];
    }
  }
  return stanza;
};

Connection.prototype.rmXmlns = function(stanza) {
  var _obj_$q4TM$_, attr, prefix;
  _obj_$q4TM$_ = this.xmlns;
  for (prefix in _obj_$q4TM$_) {
    attr = prefix ? "xmlns:" + prefix : "xmlns";
    if (stanza.attrs[attr] === this.xmlns[prefix]) {
      delete stanza.attrs[attr];
    }
  }
  return stanza;
};

Connection.prototype.onEnd = function() {
  this.stopParser();
  return this.socket.end();
};

Connection.prototype.end = function() {
  if (this.socket.writable) {
    if (this.streamOpened) {
      this.socket.write("</stream:stream>");
      return delete this.streamOpened;
    } else {
      return this.socket.end();
    }
  }
};

Connection.prototype.onClose = function() {
  var _this_$wKUc$_;
  if (!this.socket) {
    return;
  }
  delete this.socket;
  if (this.reconnect) {
    setTimeout((_this_$wKUc$_ = this, function() {
      _this_$wKUc$_.socket = new net.Stream;
      _this_$wKUc$_.setupStream();
      return _this_$wKUc$_.reconnect();
    }), this.reconnectDelay);
    console.log("Reconnect in", this.reconnectDelay);
    this.reconnectDelay = this.reconnectDelay + Math.ceil(Math.random() * 2e3);
    if (this.reconnectDelay > MAX_RECONNECT_DELAY) {
      this.reconnectDelay = MAX_RECONNECT_DELAY;
    }
  } else {
    return this.emit("close");
  }
};

Connection.prototype.error = function(condition, message) {
  var e;
  this.emit("error", new Error(message));
  if (!this.socket || !this.socket.writable) {
    return;
  }
  if (!this.streamOpened) {
    this.startStream();
  }
  e = new ltx.Element("stream:error");
  e.c(condition, {
    xmlns: NS_XMPP_STREAMS
  });
  if (message) {
    e.c("text", {
      xmlns: NS_XMPP_STREAMS,
      "xml:lang": "en"
    }).t(message);
  }
  this.send(e);
  return this.end();
};