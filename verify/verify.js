var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

var fs = require('fs');
app.get('',function(req,res){
	res.sendFile(__dirname+"/verify.html");
});
app.post('', function(req, res){
        var key = req.body.key;
	var email = req.body.email;
	console.log("======");	
	console.log(key);
	console.log(email);
			
	var MongoClient = require('mongodb').MongoClient;
	var url = "mongodb://127.0.0.1:27017/";

	MongoClient.connect(url, function(err, db){
                if(err)throw err;
		var dbo = db.db("warmup");
		dbo.collection("users").findOne({email: email}, function(err,result){
			if (err) throw err;
			if(result){
				if((key==="keykey"&&result.stat==="F")||key==="abracadabra"){
					dbo.collection("users").updateOne({email:email}, {$set: {"stat": "T"}});
					res.status(200).json({status: "OK"});
				}
				else{
					res.status(400).json({status: "error", error: "Incorrect Verification Key"});
				}
			}
			else{
				res.status(400).json({status: "error", error: "User never registered"});
			}
			db.close();
		});
	});
});

app.listen(8082);
