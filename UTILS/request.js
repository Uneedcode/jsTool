/*
 * @Author: your name
 * @Date: 2021-09-22 17:44:50
 * @LastEditors: your name
 * @LastEditTime: 2021-09-22 17:44:51
 * @Description: file content
 */
/**
 * Requests a URL, returning a promise.
 *
 * @param  {string} url       The URL we want to request
 * @param  {object} [option] The options we want to pass to "fetch"
 * @param  {object} otherOptions Some extra options, such as "requestId" to mark a specific request
 * @return {object}           An object containing either "data" or "err"
 */
export default function request(url, option = {}, otherOptions = {}) {
  const systemPrefixes = [
    "datadev",
    "modelweb",
    "smartweb",
    "ditweb",
    "datameta",
    "ditmaster",
    "daweb",
    "smartservice",
    "dap",
    "dqaweb",
    "smartim",
    "ptopoint",
    "autorunweb", // intensive子系统也会调用
    "dataservice",
    "itsf", // intensive子系统
  ];
  let isOuterSystem = false;
  const { langeuage = true, requestId = null } = otherOptions;
  systemPrefixes.forEach((prefix) => {
    if (url.indexOf(prefix) === 0) {
      isOuterSystem = true;
    }
  });
  if (isOuterSystem) {
    url = `${ROUTER_BASE}${url}`;
  } else {
    url = `${SERVER_PATH}${url}`;
  }
  if (option.body && !option.body.language) {
    if (langeuage) {
      option.body.language = getLocale();
    }
  }
  // 判断如果get请求,且body不为空,添加到url参数
  if (option && option.method === "GET" && option.body) {
    url += `?${qs.stringify(option.body)}`;
    delete option.body;
  }

  if (option && option.body && option.body.string) {
    // const formBody = JSON.stringify(option.body.value);
    option.body = option.body.value;
  }
  // 防止多个tab打开用户数据不一致处理，统一监听用户信息发生变化后，重新刷新当前tab
  const sessonUc = getSession("uc");
  const cookieUc = CookieUtil.get("uc");
  // isNeedListenUserLogin 是否要监听用户登陆信息变化,再登陆时设置为true; 用的window存储变量
  if (
    window.isNeedListenUserLogin &&
    sessonUc &&
    cookieUc &&
    sessonUc !== cookieUc
  ) {
    window.isNeedListenUserLogin = false;
    window.location.reload();
    return;
  }

  if (url.indexOf(LOGIN_API_URL) === -1) {
    const { headers } = option;

    // 全程调度菜单对接数据运营ete_token，添加ete_token请求头
    const eteToken = getEteToken();
    const otherHeader = eteToken ? { ete_token: eteToken } : {};
    option.headers = { ...headers, ...saas.getHeaders() };
    const signatureSessionId = saas.getSubSystemSignatureId();
    if (isOuterSystem) {
      if (url.indexOf("/ditweb/") > -1) {
        option.headers = { ...option.headers, ...otherHeader };
      } else if (url.indexOf("/dqaweb/") > -1) {
        option.headers = { ...option.headers, ...otherHeader };
      } else if (signatureSessionId) {
        option.headers = {
          ...option.headers,
          "signature-sessionId": signatureSessionId,
        };
      }
    } else {
      // 门户接口也要添加ete_token请求头
      option.headers = { ...option.headers, ...otherHeader };
    }
  } else {
    option.withCredentials = true;
  }

  const newOptions = { credentials: "include", ...option };

  if (newOptions.method !== "GET") {
    newOptions.headers = {
      Accept: "application/json",
      ...newOptions.headers,
    };
    if (!(newOptions.body instanceof FormData)) {
      newOptions.headers = {
        "Content-Type": "application/json; charset=utf-8",
        ...newOptions.headers,
      };
      newOptions.body = JSON.stringify(newOptions.body);
    }
  }

  return fetch(url, newOptions)
    .then((response) => checkStatus(response, url, newOptions))
    .then((response) => {
      // blob处理，并暂存fileName
      if (option.responseType === "blob") {
        const fileNameStr =
          response.headers.get("content-disposition") || "downFile";
        fileName = fileNameStr;
      }

      if (option.downNow && option.responseType === "blob") {
        const name = getFileName();
        const p = response.blob();
        if (p) {
          return new Promise((resolve) => {
            p.then((res) => {
              resolve({
                res,
                fileName: name,
              });
            });
          });
        }
        return new Promise();
      }

      let promise =
        option.responseType === "blob" ? response.blob() : response.json();
      // 是否需要密文加密，如果需要走下面逻辑
      if (needEncryptUrl(url)) {
        promise = new Promise((resolve) => {
          promise.then((res) => {
            const { data: ciphertext } = res;
            try {
              const data = JSON.parse(Base64.decode(ciphertext));
              res.data = data;
              if (url.indexOf(LOGIN_API_URL) > -1) {
                saas.setProperties(res);
              }
            } catch (error) {
              // 接口报错可能不会返回json，但是也没法得知，这时候不需要报错
              console.warn(error);
            }
            if (res && requestId) {
              res.requestId = requestId;
            }
            resolve(res);
          });
        });
      } else {
        promise = new Promise((resolve, reject) => {
          promise.then((res) => {
            if (
              res &&
              (`${res.code}` === "3501" || `${res.resultCode}` === "3501")
            ) {
              if (!hasNotifyEvicted) {
                notifyEvicted();
              }
              reject(
                new Error(
                  formatMessage({
                    id: "login.confirmEvicted",
                    defaultMessage: "您已被强制登出",
                  })
                )
              );
            } else {
              if (res && requestId) {
                res.requestId = requestId;
              }
              resolve(res);
            }
          });
        });
      }
      return promise;
    })
    .catch((e) => {
      const status = e.name;
      // 约定，这两个状态退出登录
      if (status === 401 || status === 403) {
        globalLogout();
      }
    });
}
