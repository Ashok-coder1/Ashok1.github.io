const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

mongoose.connect("YOUR_MONGODB_LINK");

const UserSchema = new mongoose.Schema({
email:String,
password:String
});

const User = mongoose.model("User",UserSchema);

app.get("/",(req,res)=>{
res.send("Server running");
});

app.post("/signup",async(req,res)=>{

const {email,password} = req.body;

const user = new User({
email,
password
});

await user.save();

res.json({message:"Signup successful"});

});

app.post("/login",async(req,res)=>{

const {email,password} = req.body;

const user = await User.findOne({email});

if(!user){
return res.json({message:"User not found"});
}

if(user.password !== password){
return res.json({message:"Wrong password"});
}

res.json({message:"Login successful"});

});

app.listen(process.env.PORT || 3000,()=>{
console.log("Server running");
});
