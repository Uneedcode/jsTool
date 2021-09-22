class Websocket {
  constructor(params = {}) {
    this.params = params;
    this.socket = null;
    this.connect();
  }

  connect = () => {
    const ts = this;
    const { socketUrl, timeout = 0 } = this.params;
    // 选择浏览器websocket
    if ('WebSocket' in window) {
      this.socket = new WebSocket(socketUrl);
    } else if ('MozWebSocket' in window) {
      this.socket = new window.MozWebSocket(socketUrl);
    } else {
      this.socket = new window.SockJS(socketUrl);
    }
    this.socket.onopen = this.onopen;
    this.socket.onmessage = this.onmessage;
    this.socket.onclose = this.onclose;
    this.socket.onerror = this.onerror;
    this.socket.sendMessage = this.sendMessage;
    // this.socket.closeSocket = this.closeSocket;
    if (timeout) {
      const time = setTimeout(() => {
        if (ts.socket && ts.socket.readyState !== 1) {
          ts.close();
        }
        clearInterval(time);
      }, timeout);
    }
  };

  close = () => {
    if (this.socket) {
      this.socket.close();
    }
  };

  onopen = () => {
    const { onopen } = this.params;
    if (onopen) {
      onopen();
    }
  };

  onmessage = msg => {
    const { onmessage } = this.params;
    if (onmessage) {
      onmessage(msg);
    }
  };

  onclose = e => {
    const { onclose } = this.params;
    if (onclose) {
      onclose(e);
    }
  };

  onerror = e => {
    // socket连接报错触发
    const { onerror } = this.params;
    this.socket = null;
    if (onerror) {
      onerror(e);
    }
  };

  sendMessage = value => {
    if (this.socket) {
      this.socket.send(JSON.stringify(value));
    }
  };
}
export default Websocket;
