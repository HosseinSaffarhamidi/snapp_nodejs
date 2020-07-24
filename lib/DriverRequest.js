const SchemaDb=require('../model/Schema');
class DriverRequest
{
    constructor(driver_id){

        this.driver_id=driver_id;
    }
    set_status_driver(type,res)
    {
        SchemaDb.Driver.updateOne({_id:this.driver_id},{status_driver:type}).exec(function (error,data)
        {
            if(!error){
                if(data.n==1){
                    res.send("ok");
                }
                else{
                    res.send("error");
                }
            }
        });
    }
    set_driver_location(lat,lng,res){

        const  driver_lat=parseFloat(lat);
        const driver_lng=  parseFloat(lng);
        SchemaDb.Driver.updateOne({_id:this.driver_id},{
            location : {
                type : "Point",
                coordinates : [driver_lat, driver_lng]
            }}
        ).exec(function (error,data)
        {

            if(!error){
                if(data.n==1){
                    res.send("ok");
                }
                else{
                    res.send("error");
                }
            }
            else {
                console.log(error);
            }
        });
    }
    set_service_status(service_id,status,driver_lat,driver_lng,req,res)
    {
        this.status=status;
        this.service_id=service_id;
        this.driver_lat=driver_lat;
        this.driver_lng=driver_lng;
        const  self=this;
        SchemaDb.Service.findOne({_id:service_id,driver_id:this.driver_id})
            .populate({path:'User'})
            .populate({path:'driver',select:['_id','inventory']})
            .exec(function (error,data) {

                self.oldStatus=data.status;
                if (!error && data.User) {

                    const lib=require('../model/function');
                    console.log(status);
                    if(status==4 && data.lat3==null && data.going_back=="no")
                    {
                        lib.finishServiceStatus(req.io,data.User.socketId);
                        self.finishService(data,res);
                    }
                    else if(status==5 && data.going_back=="no" && data.lat3!=null){
                        lib.finishServiceStatus(req.io,data.User.socketId);
                        self.finishService(data,res);
                    }
                    else if(status==5 && data.going_back=="ok" && data.lat3==null){
                        lib.finishServiceStatus(req.io,data.User.socketId);
                        self.finishService(data,res);
                    }
                    else if(status==6){
                        lib.finishServiceStatus(req.io,data.User.socketId);
                        self.finishService(data,res);
                    }
                    else{
                        if(status==2)
                        {
                            lib.send_status2(req.io,data.User.socketId);
                        }
                        self.updateService(data,status,res);
                    }
                }
                else{
                    res.send({status:"error"});
                }
            });

    }
    finishService(data,res){

        const commission=this.getCommission(data.price);
        const self=this;
        data.status=this.status;
        data.driving_status=2;
        data.wage=commission;
        data.save(function (error,newData)
        {
            if(newData)
            {
                self.checkInventory(data,res)
            }
            else{
                res.send({status:"error"});
            }
        });
    }
    checkInventory(data,res){

        const lib=require('../model/function');

        if(data.User.inventory>=data.price)
        {
            if(lib.inventory_update(data.User,data.price))
            {
                this.createEvent();

                const commission=this.getCommission(data.price);
                const driver_price=data.price-commission;
                data.driver.inventory=data.driver.inventory+driver_price;
                data.driver.save(function (error) {});
                data.wage=commission;
                res.send({status:"ok",inventory:data.driver.inventory});
            }
            else
            {
                this.rollback(data,res);
            }
        }
        else
        {
            const commission=this.getCommission(data.price);
            data.driver.inventory=data.driver.inventory-commission;
            data.driver.save(function (error)
            {});
            data.wage=commission;
            this.createEvent();
            res.send({status:"ok",inventory:data.driver.inventory});
        }
    }
    rollback(data,res){
        data.status=this.oldStatus;
        data.driving_status=1;
        data.save(function (error,newData)
        {
            res.send({status:"error"});
        });
    }
    createEvent(){
        const t=Math.floor(Date.now()/1000);
        SchemaDb.ServiceStatus.create({lat:this.driver_lat,lng:this.driver_lng,service_id:this.service_id,time:t,status:this.status},function (error,data) {});

    }
    updateService(data,status,res){
        const self=this;
        data.status=status;
        data.save(function (error,newData)
        {
            if(newData){
                self.createEvent();
                res.send({status:"ok"});
            }
            else
            {
                res.send({status:"error"});
            }
        });
    }
    getUserService(page,res){

        const skip=(page-1)*10;

        SchemaDb.Service.find({driver_id:this.driver_id})
            .populate({path:'User',select:['name','mobile']})
            .sort({'time':'desc'}).skip(skip).limit(10).exec(function (error,data)
        {
            res.send(data);
        });

    }
    getCommission(price){
        const  a=5;
        const commission=(a*price)/100;
        return commission;
    }
}
module.exports=DriverRequest;
