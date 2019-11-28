var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var fs = require('fs');
var uuid = require('uuid/v4');

var ejs = require('ejs');

var app = express();
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

app.use(express.static('css'));
app.use(express.static('images'));

var MongoClient = require('mongodb').MongoClient;
var autoIncrement = require("mongodb-autoincrement");
var url = "mongodb://localhost:27017/";

var cassandra = require('cassandra-driver');
var client = new cassandra.Client({contactPoints: ['127.0.0.1']});
client.connect(function(err,result){
	console.log('cassandra connected');
})

const TWO_HOURS = 1000 * 60 * 60 * 2;

const{
        SESS_LIFETIME = TWO_HOURS
} = process.env

const redirectLogin = function(req, res, next){
	if(!req.session.userId){
		res.redirect('/login')
	}
	else{
		next()
	}
}
const redirectHome = function(req, res, next){
	if(req.session.userId){
		res.redirect('/home')
	}
	else{
		next()
	}
}
app.use(session({
	name: 'sid',
	resave: false,
	saveUninitialized: false,
	secret: 'key',
	//store: 
	cookie:{
		sameSite: true,
		secure: false
	}
}));
app.get('/login', redirectHome, function(req,res){
	res.sendFile(__dirname + "/html/login.html");
});
app.get('/',function(req,res){
	const{userId} = req.session
	//console.log(userId)
	res.sendFile(__dirname + "/html/home.html")
})

app.get('/css/anime.css', function(req,res){
        res.writeHead(200,{'Content-type' : 'text/css'});
        var fileContents = fs.readFileSync('css/anime.css', {encoding: 'utf8'});
        res.write(fileContents);
        res.end();
});

app.get('/home', redirectLogin,function(req,res){
	res.sendFile(__dirname + "/html/hom.html")
})
app.post('/login', redirectHome, function(req, res){
        var user = req.body.username;
	var pw = req.body.password;
	MongoClient.connect(url, function(err, db){
                if(err) throw err;
		console.log("database connected");
                var dbo = db.db("warmup");
                dbo.collection("users").findOne({username:user}, function(err,result){
                        if(err)throw err;
			console.log("user found");
			if(result.stat==="F"){
				console.log("user not verified");
				console.log(res.json({status: "error"}));
			}
                        else if(pw === result.password){
				console.log("password matched");
				console.log(typeof result._id);
                                req.session.userId = result.username;
				res.json({status: "OK"});
                        }
			else{
				console.log("password not matching");
				res.json({status: "error"});
			}
                        db.close();
                });
        });
});
app.get('/logout', redirectLogin, function(req,res){
        res.send("You have successfully logged out");
})
app.post('/logout', redirectLogin, function(req, res){
        console.log("Session: " + req.session);
        if(req.session){
                req.session.destroy(function(err){
                        if(err){
                                throw err;
                        	res.json({status: "error"});
			}    
                	res.json({status: "OK"});
		})
        }
        else{
        	res.json({status: "error"});
	}
});
app.get('/additem', function(req,res){
	res.sendFile(__dirname + "/html/additem.html");
})
app.post('/additem', function(req,res){
	let content = req.body.content;
	let childType = req.body.childType;
	let parentId = req.body.parent;
	if(!parentId){parentId = "";}
	let mediaId = req.body.media;
	if(req.session.userId){
		MongoClient.connect(url, function(err, db){
			if(err)throw err;
			var dbo = db.db("warmup");
			var user = req.session.userId;
			var time = Math.floor(new Date());
			autoIncrement.getNextSequence(dbo, "items", function(err, autoIndex){
				var doc = {index: autoIndex, content: content, username: user, timestamp: time};
				if(!content){
                			res.json({status: "error"});
        			}	
				else{		
					dbo.collection("items").insertOne(doc, function(err,result){
						if(err)throw err;
						var value = autoIndex.toString();
						res.json({status:"OK", id:value});
					})
				}
				db.close();	
			})
		})
	}
	else{
		res.json({status: "error"});
	}
});
app.get('/follow', function(req,res){
        res.sendFile(__dirname + "/html/follow.html")
})
app.post('/follow', function(req,res){
	let username = req.body.username;
	let follower = req.session.userId;
	let follow = req.body.follow;
	// Default: true; Boolean;
	if(!follow){
		follow=true;
	}
	//todo: follow/unfollow, return "OK" or "error"
	MongoClient.connect(url, function(err,db){
		if(err)throw err;
		var dbo = db.db("warmup");
		dbo.collection("users").findOne({username: username},function(err,result){
			console.log(result);
			if(result==null){
				res.json({status: "error"});
			}
			else if(result.stat=='T'){
				console.log(follower + " tries to follow " + username);
				console.log(result.followers.indexOf(follower));
				dbo.collection("users").findOne({username: follower},function(err,r){
					if(r.following.indexOf(username)==-1){
						console.log("follow");
                                        	dbo.collection("users").findOneAndUpdate({username: follower}, {"$addToSet": {"following": username}});
                                        	dbo.collection("users").findOneAndUpdate({username: username}, {"$addToSet": {"followers": follower}});
					}
					else{
						console.log("unfollow");
                                        	dbo.collection("users").findOneAndUpdate({username: follower}, {"$pull": {"following": username}});
                                        	dbo.collection("users").findOneAndUpdate({username: username}, {"$pull": {"followers": follower}});
					}	
				})
				res.json({status: "OK"});
			}	
			else{
				res.json({status: "error", msg: "Please Login"});
			}
		})
	})
});

app.get('/search', function(req,res){
        res.sendFile(__dirname + "/html/search.html")
})

app.post('/search',function(req,res){
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
        MongoClient.connect(url, function(err, db){
                console.log("connect to db");
                var doc, doc2;
                var dbo = db.db("warmup");
                var regrex = new RegExp(query.toLowerCase());
                var re = new RegExp(query);
                if(!username&&!query){
                        doc={};
                        doc2={};
                }
                else if(query&&username){
                        doc={content: regrex, username:username};
                        doc2={content: re, username: username};
                }
                else if(!username){
                        doc={content: regrex};
                        doc2={content: re};
                }
                else{
                        doc={username:username};
                        doc2={username:username};
                }
                dbo.collection("items").find(doc).sort({timestamp: -1}).limit(num).toArray(function(err, result){
                        if(err) throw err;
                        if(follow&&req.session.userId){
                                console.log("user login");
				var array = [];
				console.log("size b4 slicing" + array.length);
				result.forEach(function(value){
                                        dbo.collection("users").findOne({username:req.session.userId}, function(err, r){
						console.log("The index is: " + r.following.indexOf(value.username));
						if(r.following.indexOf(value.username)===0){
							console.log("item should be included");
							array.push(value);
						}
					});
                                });
				console.log("size after slicing " + array.length);
				res.json({status:"OK", items: array});
                        }
                        else if(result.length==num){
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

app.get('/item/:id', function(req, res){
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
                                var property = {likes: 0};
                                var item = {
                                        id: idn,
                                        username: user,
                                        property: property,
                                        retweeted: 0,
                                        content: body,
                                        timestamp: time
                                }
                                console.log("item found" + body + " " + idn + " " + user);
                                res.json({status: "OK", item: item});
                        	//res.render("item.ejs", {user:user, id:idn})
			}
                        else{
                                console.log("not found")
                                res.json({status: "error"})
                        }
                        db.close();
                })
        })
});

app.delete('/item/:id', function(req, res){
        var id = parseInt(req.params.id, 10);
        MongoClient.connect(url, function(err,db){
                if(err)throw err;
                var dbo = db.db("warmup");
                var query = {index: id};
		if(req.session.userId){
			console.log("delete login");
			dbo.collection("items").findOne({index: id}, function(err, result){
				if(result.username!=req.session.userId){
					console.log("wrong login");
					res.status(500).json({status: "error"});
				}
				else{
					dbo.collection("items").deleteOne(query, function(err, result){
                                		if(err)throw err;
                                		res.json({status: "OK"});
                                		db.close();
                        		});
				}
			});
		}
		else{
			console.log("not logined");
			res.status(400).json({status: "error"});
		}
        });
});

app.post('/addmedia', function(req,res){
	if(req.session.id){
		var content = req.body.content;
		var id = uuidv4();
					
	}
	else{
		res.status(400).json({status: "error"});
	}
})

app.listen(8083);
