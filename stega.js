

var express = require('express'),
	app = express(),
	Stega = require('./StegaCrypt'),
	template = require('./template'),
	port = 8080;	// Porta por defeito

app.configure(function() {

	app.use(function (req, res, next) {
	    res.setHeader('Server', 'StegaCrypt-1-0');

	    return next();
	});

	app.use(express.bodyParser());

	app.enable('trust proxy');
	app.disable('x-powered-by');
	app.use('/', app.router);
});


var debugCounter = 0;
/***************************************************************************************************/
app.post('/enc', function (req, res) {

	console.log("* Debug counter: " + (debugCounter++) );

	var cont = req.body.cont,
		pass = req.body.pass,
		bits = req.body.bits;

	if(    !cont
		|| !pass )
		template.json( req, res, { error: 'Content or password not sent'}, 400 );

	else
	{
		if( bits )
			bits = parseInt( bits );

		(new Stega('in.png', bits))

			.on('error', function(code, msg) {
				console.error("[" + code + "] Error ocurred: " + msg);

				template.json( req, res, { error: msg, errorCode: code}, 400 );
			})

			.on('done', function(out) {
				
				template.json( req, res, { ok:0}, 200 );
				//template.png( req, res, out, 200 );
			})


			.on('parsed', function() {

				var buff = new Buffer(cont, 'utf-8');

				res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
				res.setHeader('Pragma', 'no-cache');

				res.setHeader("SpaceAvailable", this.available);
				res.setHeader("SpaceNeeded", Stega.calculateNeeded(buff.length) );

				console.log("Input image readed");
				console.log("Total pixels: " + this.totalPixels);
				console.log("Available Space: " + this.available);
				console.log("Raw lenght: " + buff.length);

				this.encode(buff, pass, 'out.png');
			});
	}
});

app.post('/dec', function (req, res) {

	console.log("* Debug counter: " + (debugCounter++) );

	var pass = req.body.pass;

	if( !pass )
		template.json( req, res, { error: 'Content or password not sent'}, 400 );

	else
	{

		(new Stega('out.png'))

			.on('error', function(code, msg) {
				console.error("[" + code + "] Error ocurred: " + msg);

				template.json( req, res, { error: msg, errorCode: code}, 400 );
			})

			.on('done', function(out) {
				
				template.json( req, res, { dec: out.toString()}, 200 );
				//template.png( req, res, out, 200 );
			})


			.on('parsed', function() {

				res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
				res.setHeader('Pragma', 'no-cache');


				this.decode(pass, 'out.png');
			});
	}
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
