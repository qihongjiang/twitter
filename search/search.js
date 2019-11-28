var express = require('express');
var bodyParser = require('body-parser');

var url = "mongodb://localhost:27017/";
var MongoClient = require('mongodb').MongoClient;

var app = express();
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

app.get('', function(req, res){	
	res.sendFile(__dirname + "/search.html")
})

app.post('',function(req,res){
	console.log("--------------------------");
	var num = parseInt(req.body.limit,10);
	var item;
	var query = req.body.q;
	var username = req.body.username;
	
	var follow = req.body.following;
	if(typeof follow === 'undefined'){
		follow = true;
	}	
	
	if(!num){num = 25;}
	if(num > 100){num = 100;}
	var time = req.body.timestamp;
	if(!time){
		time = Date.now();
	}
	console.log("Q = "+query);
	console.log("username: "+ username);
	MongoClient.connect(url, function(err, db){
		console.log("connect to db");
		var doc, doc2;
		var dbo = db.db("warmup");
		var regrex = new RegExp(query.toLowerCase());
		var re = new RegExp(query);
		if(!username&&!query){
			console.log("none");
			doc={};
			doc2={};
		}
		else if(query&&username){
			doc={content: regrex, username:username};
			doc2={content: re, username: username};
			console.log("both username and query are valid");
		}
		else if(!username){
			doc={content: regrex};
			doc2={content: re};
			console.log("only query");
		}
		else{
			console.log("only username");
			doc={username:username};
			doc2={username:username};
		}
		dbo.collection("items").find(doc).sort({timestamp: -1}).limit(num).toArray(function(err, result){
			if(err) throw err;
			if(follow){
				result.forEach(function(value)){
					dbo.collection("users").findOne({username:})
					if(result.username)
				}
			}
			if(result.length==num){
				res.json({status: "OK", items: result});
			}
			else{
				num-=result.length;
				dbo.collection("items").find(doc2).sort({timestamp: -1}).limit(num).toArray(function(err,r){
					if(err)throw err;
					let primes = result.concat(r);
					res.json({status: "OK", items: r});
				});
			}
			db.close();
		});
	})
	console.log("");	
})

app.listen(8085);
