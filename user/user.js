var express = require('express');
var bodyParser = require('body-parser');

var url = "mongodb://localhost:27017/";
var MongoClient = require('mongodb').MongoClient;

var ejs = require('ejs');

var app = express();
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

app.get('/:username', function(req, res){
	var username = req.params.username;
	MongoClient.connect(url, function(err, db){
		if(err) throw err;
		var dbo = db.db("warmup");
		console.log("db connected");
		dbo.collection("users").findOne({username:username}, function(err, result){
			if(err) throw err;
			console.log("User Profile: " + username);
			console.log(result);
			
			if(result){
				var email = result.email;
				var username = result.username
				var followers = result.followers.length;
				var following = result.following.length;
				res.status(200).json({status: "OK", user:{email:email, followers:followers, following: following}});
				//res.render("user.ejs", {status: "OK", username:username, email:email, followers:followers, following: following});
			}
			else{
				res.status(400).json({status: "error", error: "result not found"});
			}
			db.close();
		});
	});	
});

app.get('/:username/posts', function(req, res){
	var username = req.params.username;
	var num = parseInt(req.query.limit, 10);
	var arr = []

	if(!num){num = 50;}
        if(num > 200){num =200;}
	console.log(username + " " + num);
	MongoClient.connect(url, function(err, db){
		var dbo = db.db("warmup");
		dbo.collection("items").find({username:username}).limit(num).toArray(function(err, result){
			if(err) throw err;
			result.forEach(function(value){
				arr.push(JSON.stringify(value.index));		
			});
			console.log(arr);
			res.json({status: "OK", items: arr});
		})	
	});
});

app.get('/:username/followers', function(req, res){
	var username = req.params.username;
	var num = parseInt(req.query.limit, 10);
	if(!num){num = 50;}
	if(num > 200){num =200;}
	MongoClient.connect(url, function(err, db){
		if(err)throw err;
		var dbo = db.db("warmup");
		console.log("db connected");
		dbo.collection("users").find({username:username}).limit(num).toArray(function(err, result){
			if(err)throw err;
			console.log(username);
                        console.log(result);
                        if(result){
				var arr = [];
				arr = result[0].followers;
				res.json({status: "OK", users: arr})	
			}
			db.close();
		})
	})
});

app.get('/:username/following', function(req, res){
	var username = req.params.username;
        var num = parseInt(req.query.limit, 10);
	var arr = [];
        if(!num){num = 50;}
        if(num > 200){num =200;}
        MongoClient.connect(url, function(err, db){
                if(err)throw err;
                var dbo = db.db("warmup");
                console.log("db connected");
                dbo.collection("users").find({username:username}).limit(num).toArray(function(err, result){
                        if(err)throw err;
                        console.log(username);
                        console.log(result);
                        if(result){
				var arr = [];
                                arr = result[0].following;
				res.json({status: "OK", users: arr});
                        }
			else{
                		res.json({status: "error"});
			}
			db.close();
		})
        })

});
app.listen(8086);
