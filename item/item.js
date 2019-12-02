var express = require('express');
var bodyParser = require('body-parser');

var url = "mongodb://localhost:27017/";
var MongoClient = require('mongodb').MongoClient;

var ejs = require('ejs');

var app = express();
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

app.get('', function(req,res){
	res.end('item');

})

app.get('/:id', function(req, res){
	var num = parseInt(req.params.id, 10);
	MongoClient.connect(url, function(err, db){
		if(err)throw err;
		var dbo = db.db("warmup");
		dbo.collection("items").findOne({index: num}, function(err,result){
			if(err) throw err;
			if(result){
				console.log("find result")
				var body = result.content;
				var idn = num.toString();
				var user = result.username;
				var time = result.timestamp;
				var retweet = parseInt(result.retweet,10);
				console.log(retweet);
				var property = {likes: 0};
				var item = {
					id: idn, 
					username: user, 
					property: property,
					retweeted: retweet,
					content: body,
					timestamp: time
				}
				console.log("item found" + body + " " + idn + " " + user);
				res.json({status: "OK"});
				//res.render("item.ejs", {user:user, id: idn})
			}
			else{ 
				console.log("not found")
				res.json({status: "error"})
			}	
			db.close();
		})
	})
});

app.delete('/:id', function(req, res){
	var id = parseInt(req.params.id, 10);
	MongoClient.connect(url, function(err,db){
		if(err)throw err;
		var dbo = db.db("warmup");
		var query = {index: id};
		dbo.collection("items").deleteOne(query, function(err, result){
			if(err)throw err;
			res.json({status: "OK"});
			db.close();
		});
	});
});

app.listen(8084);
