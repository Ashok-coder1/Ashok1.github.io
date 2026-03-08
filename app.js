const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

app.use(express.json());
app.use(cors());

mongoose.connect("YOUR_MONGODB_CONNECTION_STRING")
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

const UserSchema = new mongoose.Schema({
  email: String,
  password: String
});

const User = mongoose.model("User", UserSchema);

app.post("/register", async (req,res)=>{

  const {email,password} = req.body;

  const hashedPassword = await bcrypt.hash(password,10);

  const newUser = new User({
    email,
    password: hashedPassword
  });

  await newUser.save();

  res.json({message:"User Registered"});
});

app.post("/login", async (req,res)=>{

  const {email,password} = req.body;

  const user = await User.findOne({email});

  if(!user){
    return res.json({message:"User not found"});
  }

  const validPassword = await bcrypt.compare(password,user.password);

  if(!validPassword){
    return res.json({message:"Invalid password"});
  }

  res.json({message:"Login successful"});
});

app.listen(3000,()=>{
  console.log("Server running");
});
