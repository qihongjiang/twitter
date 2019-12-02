const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const uuid = require('uuid/v4');

const ejs = require('ejs');

var app = express();
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

app.use(express.static('css'));
app.use(express.static('images'));

const MongoClient = require('mongodb').MongoClient;
const autoIncrement = require("mongodb-autoincrement");
var url = "mongodb://127.0.0.1:27017/";

// Cassandra set-up
const cassandra = require('cassandra-driver');
const client = new cassandra.Client({contactPoints: ['127.0.0.1'], localDataCenter: 'datacenter1'});

// Mem-cache
const redis = require('redis');
const redisClient = redis.createClient();

// Constants/functions
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
			if(result){
				if(result.stat==="F"){
					console.log("user not verified");
					console.log(res.status(400).json({status: "error", error: "user not verified"}));
				}
                        	else if(pw === result.password){
					console.log("password matched");
					console.log(typeof result._id);
                                	req.session.userId = result.username;
					res.json({status: "OK"});
                        	}
				else{
					console.log("password not matching");
	                                res.status(400).json({status: "error", error: "password not matching"});
				}
			}
			else{
				console.log("user not found");
				res.status(400).json({status: "error", error: "user not found"});
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
	let mediaId = req.body.media;
	var id = mediaId;

	console.log('-----------------------------');	
	if(mediaId){
		client.connect(function(err,result){
                        console.log('additem request cassandra');
                })
		
		var query = 'SELECT used,tname FROM tweet.twit WHERE tid = ?';
		var param = [id[0]];

		client.execute(query, param, function(err, result){
			console.log(result);
			if(typeof result!=='undefined'&&result){
				if(result.rows[0].used==='t'||result.rows[0].tname!==req.session.userId){
					console.log('First result in Use');
                                       	res.status(400).json({status: "error", error: "Mismatch user and req"});
				}
				else if(req.session.userId){
					console.log("Succeed");
					insertMongo();
        			}
        			else{
        	        		console.log('Error');
					res.json({status: "error"});
        			}
			}
			else if(id.length==2){
				param=[id[1]];
				client.execute(query, param, function(err, result){
					if(typeof result!=='undefined'&&result){
						if(result.rows[0].used==='t'||result.rows[0].tname!==req.session.userId){
							console.log('First result in Use');
                                                	res.status(400).json({status: "error", error: "Mismatch user and req"});
						}
						else if(req.session.userId){
							console.log("Succeed");
							insertMongo();
							updateCassandra();
							value = parseInt(value, 10);
							dbo.collection("items").findOneAndUpdate({index:value}, { $addToSet : { medias: id[1] } }, function(err, result){
                                                                        if(err)throw err;
                                                                        console.log("MediaId included");
                                                                })
						}
						else{
							res.json({status: "error"});
						}
					}
					else{
						console.log('Error');
                                        	res.json({status: "error"});
					}
				})
			}	
			else{
				console.log("File Not Uploaded");
                                res.status(400).json({status: "error", error: "file not uploaded"});
			}
		});
	}
	else if(req.session.userId){
		console.log("Media Id undefined");
		insertMongo();
	}
	else{
		res.json({status: "error"});
	}

	async function updateCassandra(){
		var test='t';
                query = 'UPDATE tweet.twit SET used = ?  WHERE tid = ?';
		params = [test, id[0]];
		console.log(id);
		client.execute(query, params).then(result => console.log('Row updated on the cluster'));
	}

	async function insertMongo(){
		MongoClient.connect(url, { useNewUrlParser: true }, function(err, db){
                        if(err)throw err;
                        var dbo = db.db("warmup");
                        var user = req.session.userId;
                        var time = Math.floor(new Date());
                        autoIncrement.getNextSequence(dbo, "items", function(err, autoIndex){
                                var doc = {index: autoIndex, content: content, username: user, timestamp: time, interest: 0, retweet: 0, liked: [], likes: 0, media: []};
                                if(!content){
                                        res.json({status: "error"});
                                }
                                else{
					var value = autoIndex.toString();
                                        dbo.collection("items").insertOne(doc, function(err,result){
                                                if(err)throw err;
                                                res.json({status:"OK", id:value});
                                        })
					if(mediaId){
						updateCassandra();
						console.log('updating item#' + value + ' media#' + mediaId);
						value = parseInt(value, 10);
                                                dbo.collection("items").findOneAndUpdate({index:value}, { $addToSet : { medias: id[0] } })
						if(id.length==2){
							dbo.collection("items").findOneAndUpdate({index:value}, { $addToSet : { medias: id[1] } })
						}
					}
					if(parentId){
						var num  = parseInt(parentId, 10);
						dbo.collection("items").findOne({index: num}, function(err,result){
							var retweet = parseInt(result.retweet,10)+1;
							var likes = parseInt(result.likes,10);
							var interest = retweet+likes;
							dbo.collection("items").updateOne({index: num}, { $set:{retweet: retweet, interest: interest}}, function(err, res){
								if(err) throw err;
								console.log("1 document updated: " + parentId);
							})
							db.close()
						})
					}
                                }
                        })
                })

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
        console.log("Searching");
        var num = parseInt(req.body.limit,10);
        var query = req.body.q;
        var username = req.body.username;
        var follow = req.body.following;
	var rank = req.body.rank;
	var hasMedia = req.body.hasMedia;
	var time = req.body.timestamp;
	var search, item;

	if(typeof hasMedia==='undefined'){
		hasMedia=false;
	}

	if(!rank){
		rank = "interest";
	}

	if(rank==="interest"){
		search = {interest: -1};
	}
	else{
		search = {timestamp: -1};
	}

        if(typeof follow === 'undefined'){
                follow = true;
        }

        if(!num){num = 25;}
        if(num > 100){num = 100;}
        if(!time){
                time = Date.now();
        }
        MongoClient.connect(url, function(err, db){
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
                dbo.collection("items").find(doc).sort(search).limit(num).toArray(function(err, result){
                        if(err) throw err;
                        if(follow&&req.session.userId){
                                console.log("user loginned to search");
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
                        	console.log('Search returned with results met max'); 
				console.log(result.length);
				for(var i = 0; i < result.length; i++){
					console.log('------------');
					var body = result[i].content;
					var idn = result[i].index;
					var user = result[i].username;
					var time = result[i].timestamp;
					var property = {likes: result[i].likes};
					var retweet = parseInt(result[i].retweet,10);
					var media = result[i].medias;
					var item = {
                                        	id: idn,
                                        	username: user,
                                        	property: property,
                                        	retweeted: retweet,
                                        	content: body,
                                        	timestamp: time,
                                        	media: media
                                	}
					console.log(typeof media);
					result[i] = item;
				}
				result = result.filter(function(number){
					return typeof result.media!=='undefined'
				})
				if(result.length===0){
					result = dbo.collection("items").find({ "result.media.0": { "$exists": true } }).sort(search).limit(num).toArray()
				}
				res.json({status: "OK", items: result});
                        }
                        else{
				console.log('additional searching')
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
                                var body = result.content;
                                var idn = num.toString();
                                var user = result.username;
                                var time = result.timestamp;
                                var property = {likes: result.likes};
				var retweet = parseInt(result.retweet,10);
				var media = result.medias;
                                var item = {
                                        id: idn,
                                        username: user,
                                        property: property,
                                        retweeted: retweet,
                                        content: body,
                                        timestamp: time,
					media: media
                                }
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

app.post('/item/:id/like', function(req,res){
	var num = parseInt(req.params.id, 10);
	var like = req.body.like;
	console.log(req.session.userId + " liked item#" + num + " liked " + like)
	MongoClient.connect(url, { useNewUrlParser: true }, function(err, db){
		if(err)throw err;
                var dbo = db.db("warmup");
		dbo.collection("items").findOne({index: num}, function(err,result){
			var liked = JSON.stringify(result.liked);
			var count = 0;
			for(var i = 0; i < result.liked.length; i++){
				if(JSON.stringify(result.liked[i])===JSON.stringify([req.session.userId])){
					count = 1;
				}
			}
			if(like===undefined){
				res.json({status: "error"});
			}
			else if(like===false){
				console.log('unlike');
                                dbo.collection("items").findOneAndUpdate({index:num}, { $pull : { liked: [req.session.userId] } });
                                var likes = parseInt(result.likes, 10);
				var retweet = parseInt(result.retweet, 10);
                                likes-=1;
				var interest = likes + retweet
                                dbo.collection("items").findOneAndUpdate({index:num}, { $set : { likes: likes, interest: interest } });
                                res.json({status: "OK"});
			}
			else if(count===1){
				res.json({status: "OK"});
			}
			else if(like===true){
				console.log('like');
				dbo.collection("items").findOneAndUpdate({index:num}, { $addToSet : { liked: [req.session.userId] } });
				var likes = parseInt(result.likes, 10);
				var retweet = parseInt(result.retweet, 10);
				likes+=1;
				var interest = likes + retweet
				dbo.collection("items").findOneAndUpdate({index:num}, { $set : { likes: likes, interest: interest } });
				res.json({status: "OK"});
			}
		})
	})
})

app.delete('/item/:id', function(req, res){
        var id = parseInt(req.params.id, 10);
        MongoClient.connect(url, function(err,db){
                if(err)throw err;
                var dbo = db.db("warmup");
                var query = {index: id};
		if(req.session.userId){
			console.log("Deleting " + id);
			dbo.collection("items").findOne({index: id}, function(err, result){
				if(result.username!=req.session.userId){
					console.log("wrong login");
					res.status(500).json({status: "error"});
				}
				else{
					client.connect();
					let query = 'DELETE FROM tweet.twit WHERE tid=?'
					for(var i = 0; i < result.medias.length; i++){
						console.log(result.medias[i]);
						client.execute(query, [result.medias[i]], function(err, result){
							if(err) throw err;
							console.log('Deletingi medias');
						});
					}
					query = {index: id};
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

app.get('/media/:id', function(req,res){
	var id = req.params.id;
	console.log('Attempt to retrieve media');
	console.log(id);
        client.connect();
	let query = 'SELECT tname FROM tweet.twit WHERE tid=?'
	client.execute(query, [id], function(err, result){
        	if(err)throw err;
		console.log(result.rows)
		if(result.rowLength!=0){
			console.log('result.row is defined')	
			console.log(req.session.userId);
			console.log(result);
			res.json({status: "OK", result:result});
		}
		else{
			res.status(400).json({status: "error", error: "invalid id"});
		}
        });	
})

app.post('/addmedia', function(req,res){
	if(req.session.userId){
		let content = req.body.content;
		let Uuid = cassandra.types.Uuid;
		let id = Uuid.random();
	
		id = JSON.stringify(id);
	
		let query = 'INSERT INTO tweet.twit (tid, content, tname, used) VALUES (?, ?, ?, ?)';
		let params = [ id, content, req.session.userId, 'f' ];
		console.log(id);
		client.connect();
		client.execute(query, params, function(err, result){
			if(err)throw err;
			res.json({status: "OK", id:id});
		});
	}	
	else{
		console.log("login required");
		res.status(400).json({status: "error", error: "login required"});
	}
})
app.post('/predict', function(req,res){
	res.end('OK');
})

app.listen(8083);
