

var express = require('express'),
	app = express(),
	Stega = require('./StegaCrypt');
	template = require('./template'),
	port = 8080;	// Porta por defeito

app.configure(function() {

	app.use(function (req, res, next) {
	    res.setHeader('Server', 'StegaCrypt-1-0');

	    return next();
	});

	app.enable('trust proxy');
	app.disable('x-powered-by');
	app.use('/', app.router);
});



/***************************************************************************************************/
app.get('/enc', function (req, res) {

	(new Stega('in.png'))

		.on('error', function(code, msg) {
			console.error("[" + code + "] Error ocurred: " + msg);

			template.json( req, res, { error: msg, errorCode: code}, 404 );
		})

		.on('parsed', function() {

			console.log("Input image readed");
			console.log("Total pixels: " + this.totalPixels);
			console.log("Available Space: " + this.available);

			res.set('Content-Type', 'image/png');

			this.encode(new Buffer('0123', 'utf-8'), '123456', 'out.png', function() {
				
				res.end();
			});
		});
});

/***************************************************************************************************/

// Qualquer outra rota não encontrada
app.all('*', function (req, res) {

	console.log('Wrong request received: ' + req.path + " [" + req.method + "]");

	template.json( req, res, { error: 'Page not found'}, 404 );
});



/*****************************************************************************
 *	 Coloca a aplicação em mode de escuta na porta especificada
 *****************************************************************************/

var args = process.argv.splice(2),
	p = null;

if (args.length > 0)
{
	p = parseInt(args[0]);
	if( p )
		port = p ;

	p = null;
}

console.log('Listening to port: ' + port)
app.listen(port);







//a.encode('in.png', 'tmp.png', new Buffer('01234012340123401234012340123401234çãp', 'utf-8'), '123456');

//console.log(Math.ceil(0.1));
