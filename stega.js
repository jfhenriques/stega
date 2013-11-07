

var express = require('express'),
	app = express(),
	Stega = require('./libs/StegaCrypt'),
	template = require('./libs/template'),
	lessCompile = require('./libs/LessCompiler'),
	//multipart = require('./libs/multipartStream.off4'),
	multipart = require('./libs/multipartStream'),
	port = 8080;	// Porta por defeito

app.configure(function() {

	// app.use(function(req, res, next) {
	//   var raw = '';
	//   req.setEncoding('utf8');

	//   req.on('data', function(chunk) { 
	//     raw += chunk;
	//   });

	//   req.on('end', function() {
	//   	console.log(req.headers);
	// 	console.log(raw);
	//   });

	//   next();
	// });

	app.engine('html', require('ejs').renderFile);
	app.set('view engine', 'ejs');

    app.use('/static', express.static(__dirname + '/static'));
    

	app.use(function (req, res, next) {
		res.setHeader('Server', 'StegaCrypt-1-0');

		if( req.headers.origin )
		{
			res.header('Access-Control-Allow-Origin',      req.headers.origin);
			res.header('Access-Control-Allow-Methods',     'GET, POST');
			res.header('Access-Control-Allow-Headers',     'X-Requested-With, Content-Type, Accept');
			//res.header('Access-Control-Allow-Credentials', true);
		}
		
		return next();
	});

	//app.use(express.limit('3mb'));

	//app.use(express.json());
	//app.use(express.urlencoded());
	//app.use(express.multipart({defer: true, limit: '2mb'}));

	app.enable('trust proxy');
	app.disable('x-powered-by');

	app.use('/', app.router);
});

const MSG = {
	MAX_FILE_SIZE: 'Max file size may be exceeded',
	CONTENT_NOT_SENT: 'Content or password not sent',
	WRONG_IMG_TYPE: 'PNG not uploaded or wrong file type'

};



/***************************************************************************************************/

app.get('/enc', function (req, res) {

	res.render('encode', null);
});

app.get('/dec', function (req, res) {

	res.render('decode', null);
});





app.post('/enc', multipart, function (req, res) {

	var cont = req.body.cont,
		pass = req.body.pass,
		bits = req.body.bits,
		json = parseInt( req.param.json || req.body.json ),
		pngIn = req.files && req.files.png,
		inType = ( pngIn && pngIn.type ) || false ;

	if(    !cont
		|| !pass
		|| !pngIn )
		template.json( req, res, { error: MSG.CONTENT_NOT_SENT }, 400 );

	else
	if( req.multipartError )
		template.json( req, res, { error: MSG.MAX_FILE_SIZE }, 400 );

	else
	if( inType !== 'image/png' )
		template.json( req, res, { error: MSG.WRONG_IMG_TYPE, type: inType }, 400 );

	else
	{
		if( bits )
			bits = parseInt( bits );

		(new Stega(pngIn.buffer, bits))

			.on('error', function(code, msg) {
				console.error("[" + code + "] Error ocurred: " + msg);

				template.json( req, res, { error: msg, errorCode: code}, 400 );
			})

			.on('done', function(out) {
				
				//template.json( req, res, { ok:0}, 200 );
				if( json )
					template.json( req, res, { img: out.toString('base64') }, 200 );
				else
					template.png( req, res, out, 200 );
			})


			.on('parsed', function() {

				var buff = new Buffer(cont, 'utf-8');

				res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
				res.setHeader('Pragma', 'no-cache');

				res.setHeader("SpaceAvailable", this.available);
				res.setHeader("SpaceNeeded", Stega.calculateNeeded(buff.length) );

				// console.log("Input image readed");
				// console.log("Total pixels: " + this.totalPixels);
				// console.log("Available Space: " + this.available);
				// console.log("Raw lenght: " + buff.length);

				this.encode(buff, pass);
			});
	}
});

app.post('/check', multipart, function (req, res) {

	var bits = req.param.bits || req.body.bits,
		pngIn = req.files.png,
		inType = ( pngIn && pngIn.type ) || false ;

	if(    !pngIn
		|| inType !== 'image/png' )
		template.json( req, res, { error: MSG.WRONG_IMG_TYPE, type: inType }, 400 );

	else
	if( req.multipartError )
		template.json( req, res, { error: MSG.MAX_FILE_SIZE }, 400 );

	else
	{
		if( bits )
			bits = parseInt( bits );

		(new Stega(pngIn.buffer, bits))

			.on('error', function(code, msg) {
				console.error("[" + code + "] Error ocurred: " + msg);

				template.json( req, res, { error: msg, errorCode: code}, 400 );
			})


			.on('parsed', function() {

				res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
				res.setHeader('Pragma', 'no-cache');

				template.json( req, res, { pixels: this.totalPixels, availableBytes: this.available, bits: this.bits, width: this.png.width, height: this.png.height }, 200 );
			});
	}
});

app.post('/dec', multipart, function (req, res) {

	var pass = req.body.pass,
		pngIn = req.files && req.files.png,
		inType = ( pngIn && pngIn.type ) || false ;


	if( req.multipartError )
		template.json( req, res, { error: MSG.MAX_FILE_SIZE }, 400 );

	else
	if(    !pngIn
		|| inType !== 'image/png' )
		template.json( req, res, { error: MSG.WRONG_IMG_TYPE, type: inType }, 400 );

	else
	if( !pass )
		template.json( req, res, { error: MSG.CONTENT_NOT_SENT }, 400 );

	else
	{

		(new Stega(pngIn.buffer))

			.on('error', function(code, msg) {
				console.error("[" + code + "] Error ocurred: " + msg);

				template.json( req, res, { error: msg, errorCode: code}, 400 );
			})

			.on('done', function(out) {
				
				template.json( req, res, { dec: out.toString()}, 200 );
			})


			.on('parsed', function() {

				res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0');
				res.setHeader('Pragma', 'no-cache');

				this.decode(pass);
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

lessCompile('style.less', 'styles.min.css', function() {

	console.log('Listening to port: ' + port)
	app.listen(port);
});


