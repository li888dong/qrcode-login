var express = require('express');
var app = express();
var server = require('http').createServer(app);
var request = require('request');
var io = require('socket.io')(server);

//定义变量，用来存储socket。如果是多进程的话，那么socket可以考虑存入redis中
var socketList = {};
//客户端连接服务器socket成功时触发的事件;
io.sockets.on('connection', function (socket) {


    //连接成功时，告诉客户端连接成功;可以通过send来发送信息
    socket.send({status: 1});

    //socket失去连接时触发（包括关闭浏览器，主动断开，掉线等任何断开连接的情况）
    socket.on('disconnect', function () {
        console.log("client disconnect");
        //客户端失去
        for (var key in socketList) {
            delete socketList[key];
        }
    });

    //接收客户端send来的信息
    socket.on('reqAuthId', function () {
        request('https://content.henandaily.cn/index.php?m=hnsjb&c=wx_admin&a=get_code', function (err, res, body) {
            var json = JSON.parse(body);
            if (json.status == 1) {
                var clientid = json.data.code;
                //用来保存socket,键值为id
                socketList[clientid] = socket;
                // 执行返回id的操作
                socket.emit('receivedId', clientid);
            } else {
                socket.emit('reqAuthFail',json.message)
            }


        })
    });

    socket.on('mobileLogin', function (data) {

        // 根据传过来的id判断socket实例 返回登陆状态
        for (var key in socketList) {
            if (key === data.id) {
                socketList[data.id].emit('loginSuccess', '登陆成功！');
                // 给手机登陆页返回登陆成功
                socket.emit('loginSuccess', '登陆成功！');
                return
            }
        }

        // 给手机登陆页返回登陆成功
        socket.emit('loginSuccess', '登陆失败！');

    })
});

server.listen(3000);