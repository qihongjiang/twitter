var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());
var nodemailer = require('nodemailer');
var fs = require('fs');

app.get('', function(req, res){
	var body = fs.readFileSync('newUser.html', 'utf8');
	res.writeHead(200,{'Content-Type': 'text/html'});
        res.write(body);
        res.end();
});

app.post('', function(req, res){
	var email = req.body.email;
        var user = req.body.username;
        var pw = req.body.password;

	let transport = nodemailer.createTransport({
		host: 'localhost',
		port: 25,
		secure: false,
		tls:{
        		rejectUnauthorized: false
    		},	
	});	
	
	const msg = {
		from: 'warmproject',
		to: email,
		subject: 'Verification Email',
		text: 'validation key: <keykey>'
	};
	
	transport.sendMail(msg, function(err, info){
		if(err) throw err;
	});

	var MongoClient = require('mongodb').MongoClient;
        var url = "mongodb://127.0.0.1:27017/";
                MongoClient.connect(url, function(err, db){
		if(err)throw err;
                var dbo = db.db("warmup");
                var doc = {username: user, password: pw, email: email, stat: "F", followers: [], following: []};
                dbo.collection("users").findOne({username:user}, function(err,result){
			if(result){
				res.status(400).json({status: "error", error: "user already registered"});
			}
			else{
				dbo.collection("users").insertOne(doc);
				res.json({status: "OK"});
			}
		db.close()
		});
        });
	
});

app.listen(8081);
