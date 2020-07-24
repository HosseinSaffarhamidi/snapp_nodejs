const SchemaDb=require('./Schema');
const jwt=require('jsonwebtoken');
const config=require('../config');
const DriverRequest=require('../lib/DriverRequest');
const UserRequest=require('../lib/UserRequest');
function get_near_driver(service,io,user_name){
    var user_lat=service.lat1;
    var user_lng=service.lng1;
    SchemaDb.Driver.find({
        location:{
            $near:{
                $geometry:{
                    type:"Point",
                    coordinates:[user_lat,user_lng]
                }
            }
        },
        status_driver:"on"
    }).limit(10)
        .exec(function (error,result)
        {
            if(result)
            {
                console.log(result);
                result.forEach(function (value) {
                  if(value.socketId!=undefined)
                  {
                      console.log(value);
                      if(io.sockets.sockets[value.socketId])
                      {
                          console.log('ok');
                          io.sockets.sockets[value.socketId].emit('request',
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
                                  driver_lat:value.location.coordinates[0],
                                  driver_lng:value.location.coordinates[1],
                                  going_back:service.going_back,
                                  stop_time:service.stop_time,
                                  status:service.status,
                                  user_name:user_name
                              });
                      }

                  }
                  else{

                  }
                });
            }
            else
            {

            }
        });
}
function send_status1(io,user_socket_id,driver_id,service_id){
    SchemaDb.Driver.findById(driver_id,function (error,data)
    {
        if(data && io.sockets.sockets[user_socket_id]!=undefined)
        {
            io.sockets.sockets[user_socket_id].emit('set_status',
                {
                    status:1,
                    driver_name:data.name,
                    car_type:data.car_type,
                    city_code:data.city_code,
                    number_plates:data.number_plates,
                    code_number_plates:data.code_number_plates,
                    city_number:data.city_number,
                    service_id:service_id,
                    mobile:data.mobile
                });
        }
    });
}
function send_status2(io,user_socket_id){
    if(io.sockets.sockets[user_socket_id]!=undefined)
    {
        io.sockets.sockets[user_socket_id].emit('set_status',
         {
                status:2
         });
    }
}
function  finishServiceStatus(io,user_socket_id)
{
    if(io.sockets.sockets[user_socket_id]!=undefined)
    {
        io.sockets.sockets[user_socket_id].emit('set_status',
            {
                status:"finish"
            });
    }
}
function setDriverSocketId(token,socketId) {
    const driver_id=getIdFromToken(token);
    if(driver_id){
        SchemaDb.Driver.findById(driver_id,function (error,data) {
            if(data){
                data.socketId=socketId;
                data.save(function (error,newData) {
                   // console.log(newData);
                });
            }
        });
    }
}
function getIdFromToken(token){
    return jwt.verify(token,config.secret,function (error,decode) {

        if (decode) {
            return decode.id;
        }
        else {
            return false;
        }
    });
}
function setUserSocketId(token,socketId){
    const user_id=getIdFromToken(token);
    if(user_id){
        SchemaDb.User.findById(user_id,function (error,data) {
            if(data){
                data.socketId=socketId;
                data.save(function (error,newData) {});
            }
        });
    }
}
function send_service_item_to_driver(driver_id,data,io){
    SchemaDb.Driver.findById(driver_id,function (error,Drivedata)
    {
        if(Drivedata){
            if(io.sockets.sockets[Drivedata.socketId]!=undefined)
            {
                io.sockets.sockets[Drivedata.socketId].emit('update_service',data);
            }
            else {

            }
        }
        else{
        }
    });

}
function inventory_update(userData,service_price){
    const  user_id=userData._id;
    const inventory=userData.inventory-service_price;
    return SchemaDb.User.update({_id:user_id},{inventory:inventory},function (error,data)
    {
        if(data){
            return true;
        }
        else{
            return false;
        }
    });
}
function DriverRequestFunction(token){

     return jwt.verify(token,config.secret,function (error,decode) {
        if (decode) {
            const driver_id = decode.id;
            return new DriverRequest(driver_id);
        }
        else{
            throw  "error";
        }
    });

}
function UserRequestFunction(token){

    return jwt.verify(token,config.secret,function (error,decode) {
        if (decode) {
            const user_id = decode.id;
            return new UserRequest(user_id);
        }
        else{
            throw  "error";
        }
    });

}
module.exports={
    get_near_driver:get_near_driver,
    send_status1:send_status1,
    send_status2:send_status2,
    setDriverSocketId:setDriverSocketId,
    getIdFromToken:getIdFromToken,
    setUserSocketId:setUserSocketId,
    send_service_item_to_driver:send_service_item_to_driver,
    inventory_update:inventory_update,
    DriverRequest:DriverRequestFunction,
    finishServiceStatus:finishServiceStatus,
    UserRequestFunction:UserRequestFunction
};
