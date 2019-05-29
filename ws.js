const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const request = require('request');


// 创建 websocket 服务器 监听在 2727 端口
const wss = new WebSocketServer({port: 2727});

let socketList = {};
// 服务器被客户端连接
wss.on('connection', (ws) => {
    let clientid;
    // 接收客户端信息并把信息返回发送
    ws.on('message', (msg) => {
        if (msg == 'reqAuthId') {
            request('https://content.henandaily.cn/index.php?m=hnsjb&c=wx_admin&a=get_code', function (err, res, body) {
                var json = JSON.parse(body);
                console.log(json)
                if (json.status == 1) {
                    clientid = json.data.admin_code;
                    //用来保存socket,键值为id
                    socketList[clientid] = ws;
                    // console.log(ws);
                    // 执行返回id的操作
                    console.log(clientid);
                    let resData = {"type": "receivedId", "clientid": clientid};
                    ws.send(JSON.stringify(resData));
                    // socket.emit('receivedId', clientid);
                } else {
                    // socket.emit('reqAuthFail', json.message)
                }


            });
        } else if (msg.startsWith('wxLogin')) {
            let authId = msg.split('wxLogin')[0];
            let code = msg.split('wxLogin')[1];

            request('https://content.henandaily.cn/index.php?m=hnsjb&c=wx_admin&a=wx_login&admin_code=' + authId + '&code=' + code, function (err, res, body) {
                let resData = {"type": "loginStatus", "data": body};
                ws.send(JSON.stringify(resData));
            });
            // 根据传过来的id判断socket实例 返回登陆状态
            for (var key in socketList) {
                if (key == authId) {
                    socketList[authId].send('loginSuccess');
                    // 给手机登陆页返回登陆成功
                    ws.send('loginSuccess');
                    return
                }
            }
        } else {
            console.log(msg)
        }

    });

    ws.on('close', () => {
        console.log("client disconnect");
        //客户端失去
        delete socketList[clientid];
    })
})