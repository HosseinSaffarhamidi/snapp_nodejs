const express=require('express');
const mongoose=require('mongoose');
const User=require('./model/User');
const bodyParser = require('body-parser');
const app=express();
const config=require('./config');
const Jdf=require('./model/Jdf');
const lib=require('./model/function');
const jwt=require('jsonwebtoken');
const ServicePrice=require('./model/ServicePrice');
const http=require('http').Server(app);
const SchemaDb=require('./model/Schema');
const Schema=mongoose.Schema;
const io=require('socket.io')(http);
app.use(bodyParser.urlencoded({ extended: false }));
const Payment=require('./model/Payment');
const ServerRequest=require('./lib/ServerRequest');
const ip='54.37.98.123';
mongoose.connect('mongodb://localhost:27017/Snapp',{ useNewUrlParser:true },function (error)
{
    if(error)
    {

    }
    else
    {
        console.log("connected");
    }
});
var Driver=require('./model/Driver');
io.on('connection',function (socket)
{
    if(socket.request._query['group']!=undefined)
    {
        socket.join(socket.request._query['group']);

        if(socket.request._query['group']=="driver" && socket.request._query['token']!="null")
        {
            console.log(socket.id);
            lib.setDriverSocketId(socket.request._query['token'],socket.id);
        }
        if(socket.request._query['group']=="user" && socket.request._query['token']!="null")
        {
            lib.setUserSocketId(socket.request._query['token'],socket.id);
        }
    }

    socket.on('add_service',function (token,address1,address2,price,stop_time,lat1,
                                      lat2,lng1,lng2,going_back,lat3,lng3,address3)
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


                var n1=Date.now().toString().substring(6,13);
                var n2=Math.random().toString().substring(2,7);

                var order_id="Tx-"+n1+"-"+n2;

                lat3=(lat3==undefined) ? '': lat3;
                lng3=(lng3==undefined) ? '': lng3;
                address3=(address3==undefined) ? '': address3;
                var user_id=decode.id;


                SchemaDb.User.findById(user_id).select(['name']).exec(function (error,userData)
                {
                    if(userData){
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
                            userSocketId:socket.id,
                            status:"-1",
                            driving_status:0,
                            order_id:order_id,
                        },function (error,service)
                        {
                            if(service)
                            {

                                lib.get_near_driver(service,io,userData.name);
                            }
                        });
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

    socket.on('set_score_user',function (type,service_id)
    {
        SchemaDb.Service.findById(service_id,function (error,service)
        {
            if(!error)
            {
                var user_id=service.user_id;
                SchemaDb.User.findById(user_id,function (error2,user)
                {
                    if(!error2)
                    {
                        if(type=="like")
                        {
                            var n=user.like+1;
                            user.like=n;
                            user.save();
                        }
                        else if(type=="dislike")
                        {
                            user.dislike=user.dislike+1;
                            user.save();
                        }
                    }
                });
            }
        });

    });
});
app.get('/',function (req,res)
{
    res.send('express');
});

app.get('/test',function (req,res) {
});
app.post('/send_notification',function (req,res) {

    var id=req.body.TxNotificationId;


    SchemaDb.notification.findById(id,function (error,result)
    {
        if(result)
        {
            if(result.group=="all")
            {
                io.sockets.emit('notification',
                    {
                        title:result.title,
                        content:result.content,
                        activity:result.activity,
                        activity_key:result.activity_key,
                        activity_value:result.activity_value
                    });
            }
            else
            {
                io.sockets.to(result.group).emit('notification',
                    {
                        title:result.title,
                        content:result.content,
                        activity:result.activity,
                        activity_key:result.activity_key,
                        activity_value:result.activity_value
                    });
            }
            res.send({status:"ok"});
        }
        else {
            res.send({status:"error"});
        }
    });


});

app.use(function (req,res,next) {
    res.header("Access-Control-Allow-Origin", "*");
    req.io=io;
    next();
});

app.use('/user',User);
app.use('/driver',Driver);
app.post('/get_service_price',function (req,res)
{
    const lat=req.body.lat;
    const lng=req.body.lng;
    const price=new ServicePrice().getPrice(lat,lng,res);
});

setInterval(function () {

    SchemaDb.Queue.find().exec(function (error,data)
    {
        data.forEach(function (row) {

            if(row.type=="chancel_service")
            {
                const  service_id=row.value[0].id;
                const  status=row.value[0].status;
                new ServerRequest().cancel(service_id,status,io,row);
            }
            if(row.type=="new request")
            {
                SchemaDb.Service.findById(row.value)
                    .populate({path:'User',select:['_id','name']}).exec(function (error,data)
                {
                    lib.get_near_driver(data,io,data.User.name);
                    row.remove();
                })
            }
            if(row.type=="send_request_for_driver")
            {


                const time=Math.floor(Date.now() / 1000);
                const  service_id=row.value[0].service_id;
                const  driver_id=row.value[0].driver_id;
                const  request_time=row.value[0].request_time+(5*60+10);
                if(request_time>time){
                    SchemaDb.Service.findById(service_id)
                        .populate({path:'User',select:['_id','name']}).exec(function (error,service)
                    {
                        SchemaDb.Driver.findOne({ status_driver:"on",_id:driver_id}).exec(function (error,Driverdata)
                        {
                            if(Driverdata)
                            {
                                console.log('b');
                                if(Driverdata.socketId!=undefined)
                                {
                                    console.log('a');
                                    if(io.sockets.sockets[Driverdata.socketId])
                                    {
                                        console.log('c');
                                        io.sockets.sockets[Driverdata.socketId].emit('request',
                                            {
                                                service_id:service._id,
                                                address1:service.address1,
                                                address2:service.address2,
                                                address3:service.address3,
                                                price:service.price,
                                                lat1:service.lat1,
                                                lng1:service.lng1,
                                                lat2:service.lat2,
                                                lng2:service.lng2,
                                                lat3:service.lat3,
                                                lng3:service.lng3,
                                                driver_lat:Driverdata.location.coordinates[0],
                                                driver_lng:Driverdata.location.coordinates[1],
                                                going_back:service.going_back,
                                                stop_time:service.stop_time,
                                                status:service.status,
                                                user_name:service.User.user_name
                                            });
                                        row.remove();
                                    }
                                }
                            }
                        });

                    });
                }
                else {
                    row.remove();
                }

            }

        })

    });
},10000);

http.listen(3000);
