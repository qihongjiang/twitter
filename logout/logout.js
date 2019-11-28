var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');

var app = express();

app.get('', function(req,res){
        res.send("out");
})
app.post('', function(req, res){
	console.log(req.session);
        //req.session.destroy(function(err){
	//	if(err){
	//		throw err;
        //                res.end(JSON.stringify({ status: "ERROR" }));
	//		console.log("failed");
        //        }
	//	console.log("logged out")
                res.end(JSON.stringify({ status: "OK" }));
        //})
});

app.listen(3000);
