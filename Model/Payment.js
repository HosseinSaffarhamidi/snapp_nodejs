const SchemaDb=require('./Schema');
const ZarinpalCheckout = require('zarinpal-checkout');
const lib=require('./function');
class Payment
{
    constructor(req,res){
        this.req=req;
        this.res=res;
    }
    request_payment(id){
        const self=this;
        SchemaDb.Payment.findById(id,function (error,data)
        {
            if(data)
            {
                self.PaymentRequestZarinPal(data,self);
            }
            else{
                self.res.send('error on payment');
            }
        });
    }
    PaymentRequestZarinPal(data,self){
        const zarinpal = ZarinpalCheckout.create('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', false);
        zarinpal.PaymentRequest({
            Amount: data.price, // In Tomans
            CallbackURL: '',
            Description: 'پرداخت هزینه سفر',
        }).then(response => {
            if (response.status === 100)
            {
                data.authority=response.authority;
                data.save(function (error,newData)
                {
                   if(newData){
                       self.res.redirect(response.url);
                   }
                   else{
                       self.res.send('error on payment');
                   }
                });

            }
        }).catch(err =>
        {
            self.res.send('error on payment');
        });
    }
    CheckPayment(authority)
    {
        const self=this;
        SchemaDb.Payment.findOne({authority:authority})
            .populate({path:'Service'}).exec(function (error,data)
        {

            if(data){
                self.PaymentVerification(data.price,authority,self,data,data.Service);
            }
        });
    }
    PaymentVerification(amount,authority,self,data,ServiceData)
    {
        const zarinpal = ZarinpalCheckout.create('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', false);
        zarinpal.PaymentVerification({
            Amount:amount,
            Authority:authority,
        }).then(function (response) {

            if (response.status == 100)
            {
                self.updateRequest(self,data,ServiceData);
            } else {
                self.res.send('error');
            }
        }).catch(function (err) {
             self.res.send(err);
        });
    }
    updateRequest(self,data,ServiceData)
    {
        data.status=1;
        data.save(function (error,newData)
        {
           if(newData){
               self.updateInventory(self,newData.user_id,ServiceData);
           }
           else
           {

           }
        });
    };
    updateInventory(self,user_id,ServiceData){

        SchemaDb.User.updateOne({_id:user_id},{inventory:ServiceData.price},function (error,data) {
            if(data){
                let object=ServiceData;
                object["User"]={"inventory":parseInt(ServiceData.price)};
                lib.send_service_item_to_driver(ServiceData.driver_id,object,self.req.io);
            }
            else{

            }
        });
    }
}

module.exports=Payment;
