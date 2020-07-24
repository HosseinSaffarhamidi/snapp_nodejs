var express=require('express');
var app=express();
var http=require('http').Server(app);
var io=require('socket.io')(http);
var socket=io.on('connection',function (socket)
{
    socket.on('add_service',function (token,address1,address2,address3,price,stop_time,lat1,
                                      lat2,lng1,lng2,going_back,lat3,lng3)
    {

        jwt.verify(token,config.secret,function (error,decode)
        {
            if(!error)
            {
                var ndt=new Date();
                var g_y=ndt.getFullYear();
                var g_m=ndt.getMonth()+1;
                var g_d=ndt.getDate();
                var shamsi=Jdf.gregorian_to_jalali(g_y,g_m,g_d);
                var d=shamsi[0]+"-"+shamsi[1]+"-"+shamsi[2];
                var t=Math.floor(Date.now()/1000);

                lat3=(lat3==undefined) ? '': lat3;
                lng3=(lng3==undefined) ? '': lng3;
                var user_id=decode.id;
                SchemaDb.Service.create({
                    user_id:user_id,
                    time:t,
                    address1:address1,
                    address2:address2,
                    address3:address3,
                    price:price,
                    total_price:price,
                    stop_time:stop_time,
                    date:d,
                    lat1:lat1,
                    lat2:lat2,
                    lat3:lat3,
                    lng1:lng1,
                    lng2:lng2,
                    lng3:lng3,
                    going_back:going_back,
                    driver_id:"",
                    userSocketId:socket.id
                },function (error,service)
                {
                    if(service)
                    {
                        lib.get_near_driver(service,io);
                    }
                });

            }
            else
            {

            }
        });

    });

    socket.on('request_service',function (token)
    {
        jwt.verify(token,config.secret,function (error,decode)
        {
            if(!error)
            {
                var driver_id=decode.id;
                SchemaDb.Driver.findOne({
                    _id:driver_id
                },function (error,data)
                {
                    if(data)
                    {
                        data.socketId=socket.id;
                        data.save();
                    }
                });
            }
        });
    });

    // socket.emit('send_data',{data:"idehpardazanjavan.com",id:socket.id});
});

module.exports={
    socket:socket,
    http:http
};