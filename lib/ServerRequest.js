const SchemaDb=require('../model/Schema');
class ServerRequest {

    cancel(service_id,status,io,document){
        SchemaDb.Service.findOne({_id:service_id})
            .populate({path:'driver',select:['_id','socketId']})
            .populate({path:'User',select:['_id','socketId']})
            .exec(function (error,data) {
                if(!error)
                {
                    data.status=status;
                    data.driving_status=0;
                    data.save(function (error,updateData) {
                        if(error)
                        {
                            console.log('error');
                        }
                        else {


                            if(io.sockets.sockets[data.driver.socketId]!=undefined)
                            {
                                io.sockets.sockets[data.driver.socketId].emit('cancel_service');
                            }
                            else{

                            }

                            if(io.sockets.sockets[data.User.socketId]!=undefined)
                            {
                                io.sockets.sockets[data.User.socketId].emit('cancel_service');
                            }
                            else{

                            }

                            document.remove();
                        }
                    });
                }
            })
    }
}
module.exports=ServerRequest;
