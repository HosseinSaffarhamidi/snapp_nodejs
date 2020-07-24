const SchemaDb=require('./Schema');
class ServicePrice
{

    getPrice(lat,lng,res){

        this.resuest_response=res;
        this.fixed_price=0;
        this.price=0;
        const self=this;
        SchemaDb.Location.findOne({
            location:{
                $near:{
                    $geometry:{
                        type:"Point",
                        coordinates:[lat,lng]
                    }
                }
            }
        },function (error,result)
        {
           if(result)
           {
              const check=self.checkArea(lat,lng,result.location.coordinates[0],result.location.coordinates[1],result.radius);
              if(check)
              {
                  self.fixed_price=result.fixed_price;
                  self.price=result.price;
                  self.check_time(result._id);
              }
              else
              {
                  self.getFixedPrice();
              }
           }
           else
           {
               self.getFixedPrice();
           }
        });
    }
    checkArea(lat,lng,area_lat,area_lng,radius)
    {
        const distance=this.distance(lat,lng,area_lat,area_lng,"K")*1000;
        const r=parseInt(radius);
        if(r>=distance){
            return true;
        }
        else
        {
            return false;
        }
    }
    distance(lat1, lon1, lat2, lon2, unit) {
        if ((lat1 == lat2) && (lon1 == lon2)) {
            return 0;
        }
        else {
            var radlat1 = Math.PI * lat1/180;
            var radlat2 = Math.PI * lat2/180;
            var theta = lon1-lon2;
            var radtheta = Math.PI * theta/180;
            var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            if (dist > 1) {
                dist = 1;
            }
            dist = Math.acos(dist);
            dist = dist * 180/Math.PI;
            dist = dist * 60 * 1.1515;
            if (unit=="K") { dist = dist * 1.609344 }
            if (unit=="N") { dist = dist * 0.8684 }
            return dist;
        }
    }
    check_time(area_id)
    {
        const now=new Date();
        const h=now.getHours();
        const self=this;
        SchemaDb.timeLimitPrice.find({area_id:area_id},function (error,result)
        {
            result.forEach(function (row)
            {
                if(h>=row.time1 && h<row.time2)
                {
                    self.price=row.time_price;

                }
            });
            self.send_price();
        });
    }
    send_price()
    {
        const object=
        {
            price:this.price,
            fixed_price:this.fixed_price,
        };
        this.resuest_response.send(object);
    }
    getFixedPrice()
    {
        const self=this;
        SchemaDb.Setting.find({option_name:{$in:["fixed_price","price"]}},function (error,result) {
            if(!error)
            {
                self.fixed_price=result[0].option_value;
                self.price=result[1].option_value;
                self.check_time(0);
            }
            else
            {

            }
        });
    }
}
module.exports=ServicePrice;
