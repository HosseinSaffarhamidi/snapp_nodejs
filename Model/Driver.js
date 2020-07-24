const express=require('express');
const router=express.Router();
const bcrypt=require('bcryptjs');
const config=require('../config');
const jwt=require('jsonwebtoken');
const SchemaDb=require('./Schema');
const lib=require('./function');

router.get('/add',function (req,res)
{
    var time=Math.floor(Date.now()/1000);
    var password=bcrypt.hashSync('123456',10);
    SchemaDb.Driver.create({
        name:"driver12",
        location:{
            type:"Point",
            coordinates:[38.047606,46.385269]
        },
        angle:0,
        car_type:"پراید سفید رنگ",
        city_code:"ی",
        number_plates:"134",
        code_number_plates:"34",
        password:password,
        mobile:"09141592094",
        created_time:time,
        status:"no"

    },function (error,driver)
    {
       console.log(error);
    });

    res.send('add driver');
});
router.post('/near_driver',function (req,res)
{
    var user_lat=req.body.lat;
    var user_lng=req.body.lng;
    var data=[];
    console.log(user_lat+'-'+user_lng);
    SchemaDb.Driver.find({
       location:{
           $near:{
               $maxDistance:500,
               $geometry:{
                   type:"Point",
                   coordinates:[user_lat,user_lng]
               }
           }
       }
   },function (error,result)
   {
      if(!error)
      {
          result.forEach(function (value) {

                  var lat=value.location.coordinates[0];
                  var lng=value.location.coordinates[1];
                  var angle=value.angle;
                  var objrct={
                      lat:lat,
                      lng:lng,
                      angle:angle
                  };
                  data.push(objrct);
          });

          res.send(data);
      }
      else
      {

      }
   });

});
router.post('/request_driver',function (req,res)
{
    var user_lat=req.body.lat;
    var user_lng=req.body.lng;
    SchemaDb.Driver.findOne({
        location:{
            $near:{
                $geometry:{
                    type:"Point",
                    coordinates:[user_lat,user_lng]
                }
            }
        }
    },function (error,result)
    {
        if(!error)
        {
            var object={lat:result.location.coordinates[0],
                lng:result.location.coordinates[1],
                name:result.name,
                car_type:result.car_type,
                angle:result.angle,
                city_code:result.city_code,
                number_plates:result.number_plates,
                code_number_plates:result.code_number_plates,
                city_number:result.city_number
            };
            res.send(object);
        }
        else
        {
            console.log(error);
        }
    });
});
router.post('/login',function (req,res)
{
    const mobile=req.body.mobile;
    const password=req.body.password;
    SchemaDb.Driver.findOne({mobile:mobile,status:"ok"},function (error,driver)
    {
        if(driver)
        {
            const check_password=bcrypt.compareSync(password,driver.password);
            if(check_password)
            {
                const token=jwt.sign({id:driver._id},config.secret);
                res.send({ auth:'true',token:token,inventory:driver.inventory});
            }
            else
            {
                res.send({ auth:'false' });
            }
        }
        else
        {
            res.send({ auth:'false' });
        }
    });
});
router.post('/request_service',function (req,res)
{
    var service_id=req.body.service_id;
    var token=req.body.token;
    var driver_lat=req.body.driver_lat;
    var driver_lng=req.body.driver_lng;
    jwt.verify(token,config.secret,function (error,decode)
    {
        if(decode)
        {
            var driver_id=decode.id;
            SchemaDb.Service.findById(service_id,function (error,data)
            {
                if(!error)
                {
                    if(data.status!="-3")
                    {
                        if(data.driver_id=='')
                        {
                            SchemaDb.User.findById(data.user_id,function (error,user_data)
                            {
                                if(user_data)
                                {
                                    lib.send_status1(req.io,data.userSocketId,driver_id,service_id);
                                    data.driver_id=driver_id;
                                    data.status="1";
                                    data.driving_status=1;
                                    data.save();
                                    var t=Math.floor(Date.now()/1000);
                                    SchemaDb.ServiceStatus.create({lat:driver_lat,lng:driver_lng,service_id:service_id,time:t,status:"1"},function (error,data) {});

                                    res.send({status:'ok',user_name:user_data.name,mobile:user_data.mobile,user_inventory:user_data.inventory});
                                }
                                else
                                {

                                    res.send({status:'error'});
                                }
                            });

                        }
                        else
                        {
                            res.send({status:'no'});
                        }
                    }
                    else{
                        res.send({status:'cancel_service'});
                    }

                }
                else
                {
                    res.send({status:'error'});
                }
            });
        }
        else
        {
            res.send({status:'error'});
        }
    });


});
router.post('/set_status',function (req,res)
{
    const service_id=req.body.service_id;
    const token=req.body.token;
    const status=req.body.status;
    const driver_lat=req.body.driver_lat;
    const driver_lng=req.body.driver_lng;

    new lib.DriverRequest(token).set_service_status(service_id,status,driver_lat,driver_lng,req,res);
});
router.post('/cancel_service',function (req,res)
{
    const service_id=req.body.service_id;
    const token=req.body.token;
    jwt.verify(token,config.secret,function (error,decode) {
        if (decode) {
            var driver_id = decode.id;
            SchemaDb.Service.findOne({driver_id:driver_id,_id:service_id})
                .populate({path:'User',select:['_id','socketId']}).exec(function (error,data)
            {
                if(data && data.User!=null){
                    data.status=-2;
                    data.driving_status=0;
                    data.save(function (error2,newData)
                    {
                        if(req.io.sockets.sockets[data.User.socketId]!=undefined)
                        {
                            req.io.sockets.sockets[data.User.socketId].emit('cancel_service');
                        }
                        else{
                            console.log('error');
                        }

                        res.send('ok');

                    });
                }
                else{
                    res.send('error');
                }
            });
        }
        else{
            res.send('auth');
        }
    });
});
router.post('/set_request_status',function (req,res)
{
    const  token=req.body.token;
    const  status=req.body.status;
    const  status_driver=(status==1) ? "on" : "off";

    new lib.DriverRequest(token).set_status_driver(status_driver,res);
});
router.post('/set_driver_location',function (req,res)
{
    const  token=req.body.token;
    const  lat=req.body.lat;
    const  lng=req.body.lng;
    console.log('step1');
    new lib.DriverRequest(token).set_driver_location(lat,lng,res);
});
router.get('/get_service',function (req,res)
{
    const token=req.headers['x-access-token'];
    const page=req.query.page;
    lib.DriverRequest(token).getUserService(page,res);
});

module.exports=router;
