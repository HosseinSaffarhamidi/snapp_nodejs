var mongoose=require('mongoose');
var Schema=mongoose.Schema;
var driverSchema=new Schema({
    name:String,
    location:{
        type:{type:String},
        coordinates:[]
    },
    angle:Number,
    car_type:String,
    city_code:String,
    number_plates:String,
    code_number_plates:String,
    city_number:String,
    password:String,
    mobile:String,
    socketId:String,
    status:String,
    created_time:Number,
    status_driver:String,
    inventory:Number,
    sumScore:{
        type:Number,
        default:0
    },
    numScore:{
        type:Number,
        default:0
    },
    score:{
        type:Number,
        default:0
    }
});
driverSchema.index({location:"2dsphere"});
var Driver=mongoose.model('driver',driverSchema);
var ServiceSchema=new Schema({
    user_id:String,
    time:String,
    address1:String,
    address2:String,
    address3:String,
    price:Number,
    total_price:String,
    stop_time:String,
    date:String,
    lat1:Number,
    lat2:Number,
    lat3:Number,
    lng1:Number,
    lng2:Number,
    lng3:Number,
    going_back:String,
    // driver_id:String,
    userSocketId:String,
    status:String,
    driving_status:Number,
    order_id:String,
    wage:{
        type:Number,
        default:0
    },
    driver_id: {type: Schema.Types.ObjectId, ref: 'driver'},
});

ServiceSchema.virtual('driver', {
    ref: 'driver',
    localField: 'driver_id',
    foreignField: '_id',
    justOne: true
});
ServiceSchema.virtual('User', {
    ref: 'User',
    localField: 'user_id',
    foreignField: '_id',
    justOne: true
});
ServiceSchema.virtual('driver', {
    ref: 'driver',
    localField: 'driver_id',
    foreignField: '_id',
    justOne: true
});
ServiceSchema.set('toObject',{'virtuals':true});
var Service=mongoose.model('service',ServiceSchema);
var userSchema=new Schema({
    name:String,
    password:String,
    mobile:String,
    active_code:String,
    status:String,
    like:Number,
    dislike:Number,
    socketId:String,
    inventory:Number,
    time:String
});
var User=mongoose.model('User',userSchema);
var serviceStatus=new Schema({
    lat:Number,
    lng:Number,
    time:Number,
    service_id:String,
    status:Number,
    inventory:Number
});
var ServiceStatus=mongoose.model('ServiceStatus',serviceStatus);

const notificationSchema=new Schema({

    title:String,
    content:String,
    activity:String,
    group:String,
    activity_key:String,
    activity_value:String,
    status:Number
});
const notification=mongoose.model('notification',notificationSchema);

const LocationSchema=new Schema({
    name:String,
    radius:String,
    fixed_price:String,
    price:String,
    location:{
        type:{type:String},
        coordinates:[]
    },
});
LocationSchema.index({location:"2dsphere"});
const Location=mongoose.model('location',LocationSchema,'location');

const timeLimitPriceSchema=new Schema({
    time1:String,
    time2:String,
    time_price:String,
    area_id:String,
});
const timeLimitPrice=mongoose.model('time_limit_price',timeLimitPriceSchema,'time_limit_price');

const settingSchema=new Schema({
    option_name:String,
    option_value:String,
});
const Setting=mongoose.model('setting',settingSchema,'setting');

const ServiceItemSchema=new Schema({
    service_id:String,
    itemName:String,
});
const ServiceItem=mongoose.model('service_item',ServiceItemSchema,'service_item');

const PaymentSchema=new Schema({
    user_id:String,
    time:Number,
    price:Number,
    status:Number,
    service_id:String,
    authority:String
});
PaymentSchema.virtual('Service',{
    ref:'service',
    localField:'service_id',
    foreignField:'_id',
    justOne:true,
});
PaymentSchema.set('toObject',{'virtuals':true});
const Payment=mongoose.model('payment',PaymentSchema,'payment');

const QueueSchema=new Schema({
   type:String,
   value:Array
});
const Queue=mongoose.model('queue',QueueSchema,'queue');


module.exports={
    Driver:Driver,
    Service:Service,
    User:User,
    ServiceStatus:ServiceStatus,
    notification:notification,
    Location:Location,
    timeLimitPrice:timeLimitPrice,
    Setting:Setting,
    ServiceItem:ServiceItem,
    Payment:Payment,
    Queue:Queue
};
