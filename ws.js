const Vue = require('vue');
const renderer = require('vue-server-renderer').createRenderer();

const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const request = require('request');

app.get('*', (req, res) => {
// 设置允许访问的请求头
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,Authorization");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", '3.2.1');

    const wxAppId = 'wxa874a4ea498e6887';
    const wxAppSecret = '45c76a1090d62132ce83dbea2a426cff';
    const wxCode = req.query.code;

    if (wxCode) {
        request('https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + wxAppId + '&secret=' + wxAppSecret + '&code=' + wxCode + '&grant_type=authorization_code', function (err, response, body) {
            if (response.statusCode == 200) {
                // console.log(JSON.parse(body));
                var data = JSON.parse(body);
                var access_token = data.access_token;
                var openid = data.openid;
                console.log('accesstoken', access_token);
                request.get(
                    {
                        url: 'https://api.weixin.qq.com/sns/userinfo?access_token=' + access_token + '&openid=' + openid + '&lang=zh_CN',
                    },
                    function (err, response, body) {
                        if (response.statusCode == 200) {
                            // 第四步：根据获取的用户信息进行对应操作
                            var userinfo = JSON.parse(body);
                            //console.log(JSON.parse(body));
                            console.log('获取微信信息成功！' ,userinfo);
                            res.send(userinfo)
                        } else {
                            next(err)
                        }
                    }
                );
            } else {
                next(err)
            }
        });
    }
});


// websocket连接
let socketList = {};
// 服务器被客户端连接

app.ws('/websocket', function (ws, req) {
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
            request('http://content.henandaily.cn/index.php?m=hnsjb&c=wx_admin&a=get_code', function (err, res, body) {
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
            let reqUrl = 'http://content.henandaily.cn/index.php?m=hnsjb&c=wx_admin&a=weixin_login&admin_code=' + authId + '&code=' + code;

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