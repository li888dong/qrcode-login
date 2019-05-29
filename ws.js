var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
const request = require('request');

let socketList = {};
// 服务器被客户端连接

app.ws('/websocket/', function (ws, req) {
    let clientid;

    //socket失去连接时触发（包括关闭浏览器，主动断开，掉线等任何断开连接的情况）
    ws.on('disconnect', function () {
        console.log("client disconnect");
        //客户端失去
        delete socketList[clientid];
    });

    // 接收客户端信息并把信息返回发送
    ws.on('message', (msg) => {
        if (msg == 'reqAuthId') {
            request('https://content.henandaily.cn/index.php?m=hnsjb&c=wx_admin&a=get_code', function (err, res, body) {
                var json = JSON.parse(body);
                if (json.status == 1) {
                    clientid = json.data.admin_code;
                    //用来保存socket,键值为id
                    socketList[clientid] = ws;
                    // console.log(ws);
                    // 执行返回id的操作

                    let resData = {"type": "receivedId", "clientid": clientid};
                    ws.send(JSON.stringify(resData));
                    // socket.emit('receivedId', clientid);
                } else {
                    // socket.emit('reqAuthFail', json.message)
                }


            });
        } else if (msg.startsWith('wxLogin')) {

            let authId = msg.split('wxLogin')[1];
            let code = msg.split('wxLogin')[2];
            let reqUrl = 'https://content.henandaily.cn/index.php?m=hnsjb&c=wx_admin&a=weixin_login&admin_code=' + authId + '&code=' + code;

            let resData = {
                type: 'pcLogin',
                reqUrl: reqUrl
            };

            // 根据传过来的id判断socket实例 pc网页端发起登陆请求
            for (var key in socketList) {
                if (key == authId) {
                    // 给电脑端返回登陆成功
                    socketList[authId].send(JSON.stringify(resData));
                    // 给手机登陆页返回登陆成功
                    ws.send('{"type": "pcLogin"}');
                    return
                }
            }

        } else {
            console.log(msg)
        }

    });
});

app.listen(2727);