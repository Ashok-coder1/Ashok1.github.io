
function login(){

const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

fetch("https://ashok1-github-io-3.onrender.com/login",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body: JSON.stringify({
email,
password
})

})

.then(res=>res.json())
.then(data=>{

alert(data.message)

})

}