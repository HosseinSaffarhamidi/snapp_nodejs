var express=require('express');
var mongoose=require('mongoose');
var router=express.Router();
var bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const config=require('../config');
const Schema=mongoose.Schema;
const SchemaDb=require('./Schema');
const lib=require('./function');
const Payment=require('./Payment');
router.post('/login',function (req,res)
{
    var mobile=req.body.mobile;
    var password=req.body.password;
    SchemaDb.User.findOne({mobile:mobile},function (error,user)
    {
        if(user)
        {
            var check_password=bcrypt.compareSync(password,user.password);
            if(check_password)
            {
                var token=jwt.sign({id:user._id},config.secret);
                res.send({ auth:'true',token:token });
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
router.post('/register',function (req,res)
{
    var name=req.body.name;
    var mobile=req.body.mobile;
    var password=req.body.password;
    var hash_password=bcrypt.hashSync(password,10);
    var code=Math.random().toString().substring(2,7);
    SchemaDb.User.findOne({mobile:mobile},function (error,user)
    {
        if(user)
        {

            res.send({ message:"شماره موبایل وارد شده تکراری میباشد",status:"no" });
        }
        else
        {
            SchemaDb.User.create({name:name,mobile:mobile,password:hash_password,active_code:code,status:'no',like:0,dislike:0},function (error,user)
            {

                if(!error)
                {
                    var token=jwt.sign({id:user._id},config.secret,{
                        expiresIn:300
                    });
                    res.send({status:"ok",token:token });

                }
                else
                {
                    res.send({ message:"خطا در ثبت اطلاعات - مجددا تلاش نمایید",status:"no" });
                }
            });
        }
    });

});
router.post('/active_mobile_number',function (req,res)
{
    var active_code=req.body.active_code;
    var token=req.headers['x-access-token'];
    if(token)
    {
        jwt.verify(token,config.secret,function (errror,decode)
        {

            if(errror)
            {
                res.send({status:"error"});
            }
            else
            {
                SchemaDb.User.findById(decode.id,function (error,user)
               {
                   if(error)
                   {
                       res.send({status:"error"});
                   }
                   else
                   {
                       if(user.active_code==active_code)
                       {
                           user.status='ok';
                           user.save();
                           var token=jwt.sign({id:user._id},config.secret);
                           res.send({status:"ok",token:token});
                       }
                       else
                       {
                           res.send({status:"error_code"});
                       }
                   }
               });
            }
        });

    }
    else
    {
        res.send({status:"error"});
    }

});
router.get('/get_service',function (req,res)
{
    const token=req.headers['x-access-token'];
    const page=req.query.page;
    lib.UserRequestFunction(token).getUserService(page,res);
});
router.get('/check_runing_service',function (req,res)
{
    console.log('1');
    var token=req.headers['x-access-token'];
    if(token)
    {
        console.log('2');
        jwt.verify(token,config.secret,function (errror,decode)
        {
            if(errror)
            {
                res.send({status:"error"});
            }
            else
            {
                console.log('3');
                const user_id=decode.id;
                SchemaDb.Service.findOne({user_id:user_id,driving_status:1})
                .populate({path:'driver'}).exec(function (error,data)
                {
                    if(data)
                    {
                        const object={
                            price:data.price,
                            lat1:data.lat1,
                            lat2:data.lat2,
                            lat3:data.lat3,
                            lng1:data.lng1,
                            lng2:data.lng2,
                            lng3:data.lng3,
                            driver_name:data.driver.name,
                            mobile:data.driver.mobile,
                            car_type:data.driver.car_type,
                            city_code:data.driver.city_code,
                            number_plates:data.driver.number_plates,
                            code_number_plates:data.driver.code_number_plates,
                            city_number:data.driver.city_number,
                            mobile:data.driver.mobile,
                            service_id:data._id,
                            going_back:data.going_back,
                            stop_time:data.stop_time
                        };
                        res.send(JSON.stringify(object));
                    }
                    else{
                        res.send({status:"error"});
                    }

                })
            }
        });
    }

});
router.post('/cancel_service',function (req,res) {
    const token=req.headers['x-access-token'];
    const service_id=req.body.id;
    if(token)
    {
        jwt.verify(token,config.secret,function (error,decode) {
            if (decode) {
                const user_id = decode.id;
                console.log(service_id);
                let  query="";
                if (service_id == "0")
                {
                    query=SchemaDb.Service.findOne({user_id:user_id});
                }
                else{
                    query=SchemaDb.Service.findOne({_id:service_id,user_id:user_id});
                }
                if(service_id!="0")
                {
                    query.populate({path:'driver',select:['_id','socketId']});
                }
                query.sort({time:-1}).exec(function (error,data) {
                  if(!error)
                  {
                      console.log("service_id: "+data._id);
                      data.status="-3";
                      data.driving_status=0;
                      data.save(function (error,updateData) {
                          if(error)
                          {
                              return res.send("error");
                          }
                          else {
                              if(service_id!="0"){
                                  if(req.io.sockets.sockets[data.driver.socketId]!=undefined)
                                  {
                                      req.io.sockets.sockets[data.driver.socketId].emit('cancel_service');
                                  }
                                  else{
                                      console.log('error');
                                  }

                              }
                              return res.send("ok");
                          }
                      });
                  }
                  else
                  {
                      console.log(error);
                      return res.send("error");
                  }
                });
            }
        });
    }
});
router.post('/add_item_service',function (req,res)
{
    const  obj=JSON.parse(req.body.data);
    const token=req.headers['x-access-token'];
    const service_id=req.body.service_id;
    const  lat=obj.lat3;
    const  lng=obj.lng3;
    const  price=req.body.price;
    const  going_back=obj.going_back;
    const  address3=obj.address3;
    const  stop_time=obj.stop_time;
    if(token)
    {
        jwt.verify(token,config.secret,function (error,decode) {
            if (decode) {
                var user_id = decode.id;
                SchemaDb.Service.findOne({ "user_id":user_id,_id:service_id})
                    .populate({path:'User',select:['inventory']}).exec(function (error,data)
                {
                    if(data)
                    {
                        data.total_price=price;
                        data.price=price;
                        if(lat!=undefined)
                        {
                            data.lat3=lat;
                            data.lng3=lng;
                            data.address3=address3;
                            SchemaDb.ServiceItem.create({service_id:service_id,itemName:"location3"},
                                function (error,data) {});
                        }
                        if(going_back!=undefined)
                        {
                            data.going_back="ok";
                            SchemaDb.ServiceItem.create({service_id:service_id,itemName:"going_back"},
                                function (error,data) {});
                        }
                        if(stop_time!=undefined)
                        {
                            data.stop_time=stop_time;
                            SchemaDb.ServiceItem.create({service_id:service_id,itemName:"stop_time"},
                                function (error,data) {});
                        }
                        data.save(function (error,newData) {
                            if(!error)
                            {
                                lib.send_service_item_to_driver(data.driver_id,data,req.io);
                                res.send("ok");
                            }
                            else {
                                res.send("error");
                            }
                        });
                    }
                    else {
                        res.send("error");
                    }
                });

            }
            else {
                res.send("error");
            }
        });
    }

});


router.post('/payment',function (req,res)
{
    const token=req.headers['x-access-token'];
    const price=req.body.price;
    const service_id=req.body.service_id;
    const time=(Date.now()/1000);
    if(token)
    {
        jwt.verify(token,config.secret,function (error,decode) {
            if (decode) {
                const user_id = decode.id;
                SchemaDb.Payment.create({
                    price:price,
                    user_id:user_id,
                    time:time,
                    status:0,
                    service_id:service_id
                },function (error,data)
                {
                    if(data){
                        res.send(JSON.stringify({payment_code:data._id}));
                    }
                    else{
                        res.send(JSON.stringify({error:"create"}));
                    }
                });
            }
            else{
                res.send(JSON.stringify({error:"auth"}));
            }
        });
    }
    else{
        res.send(JSON.stringify({error:"auth"}))
    }
});

router.get('/request_payment/:id',function (req,res)
{
    const id=req.params.id;
    new Payment(req,res).request_payment(id);

});
router.get('/PaymentVerification', function(req, res) {

    // const amount=req.query.amount;
     const authority=req.query.Authority;
     new Payment(req,res).CheckPayment(authority);
});
router.get('/inventory',function (req,res)
{
    const token=req.headers['x-access-token'];
    if(token) {
        jwt.verify(token, config.secret, function (error, decode) {
            if (decode) {
                const user_id = decode.id;
                SchemaDb.User.findById(user_id,function (error,data)
                {
                     if(data){
                         res.send(data.inventory.toString());
                     }
                     else{
                         res.send('error');
                     }
                });
            }
            else{
                res.send('error');
            }
        })
    }
    else{
        res.send('authError');
    }
});
router.post('/add_score',function (req,res)
{
    const service_id=req.body.service_id;
    const  score=req.body.score;
    const token=req.headers['x-access-token'];
    new lib.UserRequestFunction(token).addScore(service_id,score,res);

});


module.exports=router;
