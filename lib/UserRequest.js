const SchemaDb=require('../model/Schema');
class  UserRequest {

    constructor(user_id){

        this.user_id=user_id;
    }
    addScore(service_id,score,res){
        this.service_id=service_id;
        this.score=score;
        this.res=res;

        SchemaDb.Service.findById(service_id).populate({path:'driver'}).exec(function (error,data)
        {
             if(data){

                 const  numScore=data.driver.numScore+1;
                 const  sumScore=data.driver.sumScore+parseFloat(score);
                 const new_score=sumScore/numScore;
                 data.driver.numScore=numScore;
                 data.driver.sumScore=sumScore;
                 data.driver.score=new_score;
                 data.driver.save(function (error,driverdata) {

                     if(driverdata){
                         res.send('ok');
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
    getUserService(page,res)
    {
        const skip=(page-1)*10;
        SchemaDb.Service.find({user_id:this.user_id})

            .sort({'time':'desc'}).skip(skip).limit(10).exec(function (error,data)
        {
            res.send(data);

        });

    }
}
module.exports=UserRequest;


//        .populate({path:'driver',select:['name','mobile','car_type']})
