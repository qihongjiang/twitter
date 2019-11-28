var fs = require('fs');
var ejs = require('ejs');
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended:true }));
app.use(express.static('views'));
app.use(express.static('css'));

var hello = '';
var html;

let date = new Date();

app.get('', function(req,res){
	//res.sendFile(__dirname + '/web/form.html');
	var body = fs.readFileSync('form.html', 'utf8');
	res.writeHead(200,{'Content-Type': 'text/html'});
	res.write(body);
	res.end();
});

app.get('/css/web.css', function(req,res){
	res.writeHead(200,{'Content-type' : 'text/css'});
	var fileContents = fs.readFileSync('css/web.css', {encoding: 'utf8'});
	res.write(fileContents);
	res.end();
});

app.post('', function(req,res){
	var name = req.body.name;
	if(name!=''){
		hello = 'Hello ' + name + ', ' + (date.getMonth()+1)  + '/' + date.getDate();
		res.redirect('/ttt/play');
	}
});

app.get('/play', function(req,res){
	res.render("ttt.ejs", {name: hello});
});

app.post('/play', function(req,res){
	res.send('hey');
});


app.listen(8080);
