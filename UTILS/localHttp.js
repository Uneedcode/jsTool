/*
 * @Author: Uneedcode
 * @Date: 2021-09-22 17:54:16
 * @LastEditors: Uneedcode
 * @LastEditTime: 2021-09-22 17:54:17
 * @Description: http
 */
export class Http {
  getJSON(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      try {
        xhr.responseType = "blob";
        xhr.onreadystatechange = function () {
          if (this.readyState === 4) {
            if (this.status === 200) {
              resolve(this.response, this);
            } else {
              reject({ message: "获取文件失败！" });
            }
          }
        };
      } catch (error) {
        xhr.responseType = "arraybuffer";
        xhr.onload = function (oEvent) {
          resolve(oEvent.response, this);
        };
      }
      xhr.send();
    });
  }

  async get(api) {
    return await this.getJSON(api);
  }
}

const http = new Http();

export default http;
